// proxy/api/_lib/redis.js
// Lazily-initialized singleton Upstash Redis client. Returns null when env
// vars are missing so callers can decide how to fall back.
let client = null;
let tried = false;

function getRedis() {
  if (tried) return client;
  tried = true;
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.warn("[redis] Upstash env not set — short share links disabled.");
    return null;
  }
  const { Redis } = require("@upstash/redis");
  client = new Redis({ url, token });
  return client;
}

module.exports = { getRedis };
