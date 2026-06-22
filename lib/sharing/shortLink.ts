// lib/sharing/shortLink.ts
// Talk to the proxy to create / fetch short share URLs. Both helpers return
// null on any failure so the caller can fall back to the inline link.
import { SharedWeekPayload } from "./types";
import { getDeviceId } from "../device";

const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_BASE_URL;
const PROXY_SECRET = process.env.EXPO_PUBLIC_PROXY_SECRET;
const TIMEOUT_MS = 6000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  // Avoid AbortController dependency assumptions — most RN runtimes have it,
  // but we keep the surface minimal here.
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;
  try {
    return await fetch(url, {
      ...init,
      signal: controller?.signal,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * POST a payload to /api/share/create. Returns the short id on success, or
 * null on any failure (network, auth, 503 etc.) so callers fall back gracefully
 * to an inline-payload link.
 */
export async function createShortShare(
  payload: SharedWeekPayload
): Promise<string | null> {
  if (!PROXY_URL || !PROXY_SECRET) return null;
  try {
    const deviceId = await getDeviceId();
    const resp = await fetchWithTimeout(
      `${PROXY_URL}/api/share/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PROXY_SECRET}`,
          "x-device-id": deviceId,
        },
        body: JSON.stringify(payload),
      },
      TIMEOUT_MS
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as { id?: string };
    return typeof data.id === "string" && data.id.length > 0 ? data.id : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/share/<id>. Returns the payload on success, null on miss/error.
 * Used by the in-app Universal Link handler to import a schedule when the user
 * taps a short link and iOS opens the app directly (no Safari hop).
 */
export async function fetchShortShare(
  id: string
): Promise<SharedWeekPayload | null> {
  if (!PROXY_URL) return null;
  try {
    const resp = await fetchWithTimeout(
      `${PROXY_URL}/api/share/${encodeURIComponent(id)}`,
      { method: "GET" },
      TIMEOUT_MS
    );
    if (!resp.ok) return null;
    return (await resp.json()) as SharedWeekPayload;
  } catch {
    return null;
  }
}
