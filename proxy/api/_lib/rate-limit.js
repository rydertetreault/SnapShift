// proxy/api/_lib/rate-limit.js
// Distributed rate limiting for the vision proxy.
//
// Two independent layers:
//   1. Per-IP burst guard  — anti-hammer. Catches a single host firing rapidly.
//   2. Per-device quota     — the user-facing "free tier" limit. When a device
//                             exceeds it we return a structured 429 the app uses
//                             to show the "premium coming soon" prompt.
//
// Backed by Upstash Redis so the limit is shared across every serverless
// instance (the previous in-memory Map reset on every cold start, so it never
// actually limited anything under load). If Upstash env vars are absent (local
// dev), we transparently fall back to a per-instance in-memory limiter.
//
// IMPORTANT: this fails OPEN. If Redis is unreachable we allow the request
// rather than break scanning for everyone — the OpenRouter spend cap is the
// hard backstop, so a Redis blip should never take the product down.

// Anti-hammer burst guard: 10 requests / 10 min per IP triggers the "please
// slow down" response. This only catches rapid-fire abuse — a real user's 20
// monthly scans are spread over weeks, so they hit the per-device quota (and
// the "premium" prompt), not this.
const IP_MAX = parseInt(process.env.RATE_LIMIT_IP_MAX || "10", 10);
const IP_WINDOW = process.env.RATE_LIMIT_IP_WINDOW || "10 m";
const DEVICE_MAX = parseInt(process.env.RATE_LIMIT_DEVICE_MAX || "20", 10);
const DEVICE_WINDOW = process.env.RATE_LIMIT_DEVICE_WINDOW || "30 d";

// --- Upstash (shared, production) -------------------------------------------

let initialized = false;
let ipLimiter = null;
let deviceLimiter = null;

function initUpstash() {
  if (initialized) return;
  initialized = true;
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.warn(
      "[rate-limit] Upstash env not set — falling back to in-memory limiter (dev only)."
    );
    return;
  }
  const { Redis } = require("@upstash/redis");
  const { Ratelimit } = require("@upstash/ratelimit");
  const redis = new Redis({ url, token });
  ipLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(IP_MAX, IP_WINDOW),
    prefix: "rl:ip",
    analytics: false,
  });
  deviceLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(DEVICE_MAX, DEVICE_WINDOW),
    prefix: "rl:dev",
    analytics: false,
  });
}

// --- In-memory fallback (per-instance, dev only) ----------------------------

function parseDurationMs(spec) {
  const m = String(spec).trim().match(/^(\d+)\s*(ms|s|m|h|d)$/);
  if (!m) return 60 * 1000;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  const mult = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
  return n * mult;
}

const memHits = new Map(); // key -> { count, resetAt }

function memLimit(key, max, windowMs) {
  const now = Date.now();
  const entry = memHits.get(key);
  if (!entry || entry.resetAt < now) {
    memHits.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, reset: now + windowMs };
  }
  if (entry.count >= max) {
    return { success: false, reset: entry.resetAt };
  }
  entry.count += 1;
  return { success: true, reset: entry.resetAt };
}

// --- Public API --------------------------------------------------------------

function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  return (
    (typeof xff === "string" && xff.split(",")[0].trim()) ||
    (req.socket && req.socket.remoteAddress) ||
    "unknown"
  );
}

function deviceId(req) {
  const raw = req.headers["x-device-id"];
  const id = (typeof raw === "string" && raw.trim()) || "";
  // Fall back to IP so a missing/forged header still gets some throttling.
  return id || `ip:${clientIp(req)}`;
}

async function limitOne(limiter, fallbackKey, max, windowSpec, id) {
  if (limiter) {
    try {
      const r = await limiter.limit(id);
      return { success: r.success, reset: r.reset };
    } catch (e) {
      // Fail open — never block real users on a Redis outage.
      console.error("[rate-limit] Upstash error, failing open:", e?.message);
      return { success: true, reset: Date.now() };
    }
  }
  return memLimit(`${fallbackKey}:${id}`, max, parseDurationMs(windowSpec));
}

/**
 * Enforce rate limits. Writes the 429 response and returns false when blocked;
 * returns true when the request may proceed.
 *
 * @param {object} opts
 * @param {boolean} opts.deviceQuota  Also enforce the per-device free quota
 *                                    (use only on metered endpoints like extract).
 */
async function enforceRateLimit(req, res, opts = {}) {
  initUpstash();

  // 1. Per-IP burst guard (always on).
  const ip = clientIp(req);
  const ipResult = await limitOne(ipLimiter, "ip", IP_MAX, IP_WINDOW, ip);
  if (!ipResult.success) {
    const retryAfter = Math.max(1, Math.ceil((ipResult.reset - Date.now()) / 1000));
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "Too many requests. Please slow down.", retryAfter });
    return false;
  }

  // 2. Per-device free quota (metered endpoints only).
  if (opts.deviceQuota) {
    const id = deviceId(req);
    const devResult = await limitOne(deviceLimiter, "dev", DEVICE_MAX, DEVICE_WINDOW, id);
    if (!devResult.success) {
      const retryAfter = Math.max(1, Math.ceil((devResult.reset - Date.now()) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "You've reached your free scan limit.",
        code: "DEVICE_QUOTA",
        premiumComingSoon: true,
        resetAt: devResult.reset, // epoch ms when the quota refreshes
        retryAfter, // seconds
      });
      return false;
    }
  }

  return true;
}

module.exports = { enforceRateLimit };
