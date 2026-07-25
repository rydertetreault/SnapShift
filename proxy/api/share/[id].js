// proxy/api/share/[id].js
// GET the SharedWeekPayload for a short share ID. Used by the iOS app when it
// receives a Universal Link like https://snap-shift-proxy.vercel.app/s/<id>
// directly (the in-Safari landing page in /api/s.js does its own Redis lookup
// and inlines the result into a snapshift:// redirect for the legacy path).
const { getRedis } = require("../_lib/redis");
const { enforceRateLimit } = require("../_lib/rate-limit");

const SHORT_ID_RE = /^[A-Za-z0-9]{4,16}$/;

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  // Per-IP burst guard. Unauthenticated by design — the ID itself is the secret
  // (8 chars of base62 = ~218 trillion combos, expires in 30 days).
  if (!(await enforceRateLimit(req, res))) return;

  const id = (req.query && req.query.id) || "";
  if (!SHORT_ID_RE.test(id)) {
    res.status(400).json({ error: "Invalid share id" });
    return;
  }

  const redis = getRedis();
  if (!redis) {
    res.status(503).json({ error: "Short links unavailable" });
    return;
  }

  let raw;
  try {
    raw = await redis.get(`share:${id}`);
  } catch (e) {
    console.error("[share/get] Redis read failed:", e?.message);
    res.status(503).json({ error: "Lookup failed" });
    return;
  }

  if (!raw) {
    res.status(404).json({ error: "Share not found or expired" });
    return;
  }

  // Upstash auto-deserializes JSON on read; tolerate either shape.
  const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
  res.setHeader("Cache-Control", "public, max-age=60");
  res.status(200).json(payload);
};
