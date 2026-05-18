import type { VercelRequest, VercelResponse } from "@vercel/node";

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

// In-memory rate limit. Resets between cold starts but good enough for low volume.
const hits = new Map<string, { count: number; resetAt: number }>();

export function checkAuth(req: VercelRequest, res: VercelResponse): boolean {
  const expected = process.env.PROXY_SHARED_SECRET;
  if (!expected) {
    res.status(500).json({ error: "Server misconfigured" });
    return false;
  }
  const got = req.headers.authorization;
  if (got !== `Bearer ${expected}`) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

export function checkRateLimit(req: VercelRequest, res: VercelResponse): boolean {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    res.status(429).json({ error: "Rate limit exceeded" });
    return false;
  }
  entry.count += 1;
  return true;
}
