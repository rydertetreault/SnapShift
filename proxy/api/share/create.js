// proxy/api/share/create.js
// POST a SharedWeekPayload, get back a short ID. Payload is stored in Upstash
// Redis under key `share:<id>` with a 30-day TTL. The app embeds the ID in
// a path-based URL it sends to friends (e.g. https://.../s/abc12345).
//
// Auth: bearer secret (same as the OCR endpoints). Rate-limited per-IP.
const { checkAuth } = require("../_lib/auth");
const { enforceRateLimit } = require("../_lib/rate-limit");
const { getRedis } = require("../_lib/redis");

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const MAX_BODY_BYTES = 32 * 1024; // 32 KB — generous for a week of events
const SHARE_SCHEMA_VERSION = 1;
const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const ID_LEN = 8;
const MAX_COLLISION_RETRIES = 5;

function randomId() {
  let out = "";
  for (let i = 0; i < ID_LEN; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

function isValidPayload(p) {
  if (!p || typeof p !== "object") return false;
  if (p.v !== SHARE_SCHEMA_VERSION) return false;
  if (typeof p.id !== "string" || !p.id) return false;
  if (typeof p.name !== "string" || !p.name) return false;
  if (typeof p.week !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(p.week)) return false;
  if (!Array.isArray(p.shifts) || !Array.isArray(p.busy)) return false;
  return true;
}

async function readJsonBody(req) {
  // Vercel parses JSON automatically when content-type is application/json,
  // but we double-check + enforce size cap here for safety.
  if (req.body && typeof req.body === "object") {
    const size = Buffer.byteLength(JSON.stringify(req.body), "utf8");
    if (size > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
    return req.body;
  }
  return await new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("PAYLOAD_TOO_LARGE"));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch {
        reject(new Error("BAD_JSON"));
      }
    });
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  if (!checkAuth(req, res)) return;
  if (!(await enforceRateLimit(req, res))) return;

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (e) {
    if (e.message === "PAYLOAD_TOO_LARGE") {
      res.status(413).json({ error: "Payload too large" });
      return;
    }
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  if (!isValidPayload(payload)) {
    res.status(400).json({ error: "Invalid share payload" });
    return;
  }

  const redis = getRedis();
  if (!redis) {
    // No Redis configured — client will fall back to the inline path-based link.
    res.status(503).json({ error: "Short links unavailable" });
    return;
  }

  // Generate a short ID, retrying on the (vanishingly rare) collision.
  let id = null;
  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
    const candidate = randomId();
    try {
      // NX = only set if key does not exist; EX = expiry in seconds.
      const ok = await redis.set(`share:${candidate}`, JSON.stringify(payload), {
        nx: true,
        ex: TTL_SECONDS,
      });
      if (ok === "OK") {
        id = candidate;
        break;
      }
    } catch (e) {
      console.error("[share/create] Redis write failed:", e?.message);
      res.status(503).json({ error: "Short link storage unavailable" });
      return;
    }
  }

  if (!id) {
    res.status(503).json({ error: "Could not allocate a share id" });
    return;
  }

  res.status(200).json({ id, expiresInSeconds: TTL_SECONDS });
};
