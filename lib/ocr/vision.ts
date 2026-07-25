import { getDeviceId } from "../device";

const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_BASE_URL;
const PROXY_SECRET = process.env.EXPO_PUBLIC_PROXY_SECRET;

/**
 * Thrown when the device has used up its free-tier scan quota (HTTP 429 with
 * code DEVICE_QUOTA). The upload screen catches this to show the upgrade prompt
 * instead of a generic failure card. `resetAt` is the epoch-ms moment the quota
 * refreshes, when the server provides it.
 */
export class QuotaExceededError extends Error {
  resetAt?: number;
  constructor(message: string, resetAt?: number) {
    super(message);
    this.name = "QuotaExceededError";
    this.resetAt = resetAt;
  }
}

// The vision engine may omit startTime/endTime/date for monthly-grid marker
// schedules. The orchestrator fills sentinels and sets allDay.
export interface VisionShift {
  dayOfWeek: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  department?: string;
  breaks?: VisionBreak[];
  segments?: VisionSegment[];
}

export interface VisionBreak {
  startTime: string;
  endTime: string;
  label?: string;
}

export interface VisionSegment {
  startTime: string;
  endTime: string;
  role: string;
}

export interface VisionParseResult {
  shifts: VisionShift[];
  weekStart?: string;
}

export async function runVisionOcr(
  base64Image: string,
  mimeType: string
): Promise<VisionParseResult> {
  if (!PROXY_URL || !PROXY_SECRET) {
    throw new Error("Vision OCR is not configured for this build.");
  }
  const deviceId = await getDeviceId();
  const resp = await fetch(`${PROXY_URL}/api/ocr/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PROXY_SECRET}`,
      "x-device-id": deviceId,
    },
    body: JSON.stringify({ imageBase64: base64Image, mimeType }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    if (resp.status === 429 && err.code === "DEVICE_QUOTA") {
      throw new QuotaExceededError(
        err.error || "You've reached your free scan limit.",
        err.resetAt
      );
    }
    throw new Error(err.error || `Vision OCR failed (${resp.status}).`);
  }
  return resp.json();
}

export async function reportFailedScreenshot(
  base64Image: string,
  mimeType: string,
  errorMessage: string,
  ocrPreview: string
): Promise<void> {
  if (!PROXY_URL || !PROXY_SECRET) return;
  const deviceId = await getDeviceId();
  await fetch(`${PROXY_URL}/api/ocr/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PROXY_SECRET}`,
      "x-device-id": deviceId,
    },
    body: JSON.stringify({
      imageBase64: base64Image,
      mimeType,
      errorMessage,
      ocrPreview,
    }),
  });
}
