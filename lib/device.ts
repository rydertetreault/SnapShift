// lib/device.ts
// A stable, install-scoped identifier sent to the proxy so scan quotas are
// enforced per device rather than per IP (mobile users share carrier NAT IPs,
// which makes IP-only limiting both too loose and too punishing).
//
// This is a soft identifier: it survives app restarts but resets on reinstall
// or "clear data". That's acceptable for a free-tier quota — the IP burst guard
// and the OpenRouter spend cap cover the abuse floor. App Attest (a later step)
// is what would make this tamper-proof.
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "snapshift_device_id";

let cached: string | null = null;

function generateId(): string {
  // RFC-4122-ish v4 string. Hermes lacks crypto.randomUUID; Math.random is
  // sufficient for a collision-resistant device tag (not a security token).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      cached = existing;
      return existing;
    }
    const fresh = generateId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, fresh);
    cached = fresh;
    return fresh;
  } catch {
    // Storage unavailable (e.g. tests): fall back to an ephemeral per-session id.
    if (!cached) cached = generateId();
    return cached;
  }
}
