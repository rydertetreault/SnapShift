// lib/sharing/link.ts
import { SharedWeekPayload } from "./types";
import { encodeWeek } from "./codec";

// Public https landing page (static page on the existing Vercel proxy).
export const SHARE_BASE_URL = "https://snap-shift-proxy.vercel.app";
export const SHARE_PATH_PREFIX = "/s";

// Short IDs minted by the proxy: 4-16 base62 chars. Anything longer is treated
// as an inline base64-url payload (the offline fallback).
const SHORT_ID_RE = /^[A-Za-z0-9]{4,16}$/;

/**
 * Build a path-based share URL — works for both:
 *   - short ID  → /s/abc12345
 *   - inline payload (fallback) → /s/<long-base64url>
 * Path-based form avoids the `?d=` autolinker bug where some clients (SMS /
 * cross-platform messengers) truncate the URL at the `=` sign.
 */
export function buildShareUrl(idOrEncodedPayload: string): string {
  return `${SHARE_BASE_URL}${SHARE_PATH_PREFIX}/${idOrEncodedPayload}`;
}

/** Convenience for the offline fallback: build a self-contained inline link. */
export function buildInlineShareLink(payload: SharedWeekPayload): string {
  return buildShareUrl(encodeWeek(payload));
}

/**
 * Pull the `d` token out of any of the supported URL shapes:
 *   - https://.../s/<token>             (new path-based)
 *   - snapshift://share-week?d=<token>  (in-app deep link, unchanged)
 *   - https://.../s?d=<token>           (legacy query-based, kept for back-compat)
 * The "token" is either a short ID (look up via proxy) or an inline base64url
 * payload (decode directly). Use isShortShareId() to tell them apart.
 */
export function extractPayloadParam(url: string): string | null {
  // 1. Query-string form: ?d=... or &d=...
  const q = url.match(/[?&]d=([^&#]+)/);
  if (q) return q[1];
  // 2. Path form: /s/<token>  — last non-empty path segment after /s/
  const p = url.match(/\/s\/([A-Za-z0-9_-]+)(?:[/?#]|$)/);
  if (p) return p[1];
  return null;
}

export function isShortShareId(token: string): boolean {
  return SHORT_ID_RE.test(token);
}
