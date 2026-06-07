// lib/ocr/prepareImage.ts
// Downscale + recompress a captured image before sending it to the vision endpoint.
// This solves two problems at once:
//   1. The proxy (a Vercel function) rejects request bodies larger than ~4 MB with
//      HTTP 413. A full-resolution phone photo (12 MP, several MB) blows past that
//      once base64-encoded, so a photo of a paper schedule fails to scan at all.
//   2. Claude's vision model downsamples anything larger than ~1568 px on the long
//      edge internally, so a bigger image gives ZERO extra detail for handwriting —
//      it's wasted bytes that only risk the 413.
// Resizing the long edge to 1568 px and re-encoding as JPEG keeps every pixel the
// model can actually use while shrinking a multi-MB capture to a few hundred KB.
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

// Claude's vision pipeline caps the long edge at ~1568 px; matching it is optimal.
const MAX_EDGE = 1568;

export interface PreparedImage {
  base64: string;
  mimeType: string;
}

/**
 * Resize (down only) and JPEG-compress an image for upload. `width`/`height` come
 * from the image picker asset and decide which edge to clamp; when absent we just
 * recompress (still converts a large PNG to a much smaller JPEG).
 */
export async function prepareImageForUpload(
  uri: string,
  width?: number,
  height?: number
): Promise<PreparedImage> {
  const longest = Math.max(width ?? 0, height ?? 0);
  // Only downscale; never upscale a small image (that adds bytes, not detail).
  const actions =
    longest > MAX_EDGE
      ? [(width ?? 0) >= (height ?? 0)
          ? { resize: { width: MAX_EDGE } }
          : { resize: { height: MAX_EDGE } }]
      : [];

  const result = await manipulateAsync(uri, actions, {
    compress: 0.85,
    format: SaveFormat.JPEG,
    base64: true,
  });

  return { base64: result.base64 ?? "", mimeType: "image/jpeg" };
}
