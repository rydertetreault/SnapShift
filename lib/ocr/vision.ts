const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_BASE_URL;
const PROXY_SECRET = process.env.EXPO_PUBLIC_PROXY_SECRET;

// The vision engine may omit startTime/endTime/date for monthly-grid marker
// schedules. The orchestrator fills sentinels and sets allDay.
export interface VisionShift {
  dayOfWeek: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  department?: string;
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
  const resp = await fetch(`${PROXY_URL}/api/ocr/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PROXY_SECRET}`,
    },
    body: JSON.stringify({ imageBase64: base64Image, mimeType }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
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
  await fetch(`${PROXY_URL}/api/ocr/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PROXY_SECRET}`,
    },
    body: JSON.stringify({
      imageBase64: base64Image,
      mimeType,
      errorMessage,
      ocrPreview,
    }),
  });
}
