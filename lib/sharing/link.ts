// lib/sharing/link.ts
import { SharedWeekPayload } from "./types";
import { encodeWeek } from "./codec";

// Public https landing page (static page on the existing Vercel proxy).
export const SHARE_BASE_URL = "https://snap-shift-proxy.vercel.app/s";

export function buildShareLink(payload: SharedWeekPayload): string {
  return `${SHARE_BASE_URL}?d=${encodeWeek(payload)}`;
}

// Pull the `d` param out of either the https link or the snapshift:// deep link.
export function extractPayloadParam(url: string): string | null {
  const m = url.match(/[?&]d=([^&#]+)/);
  return m ? m[1] : null;
}
