import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";
import { checkAuth, checkRateLimit } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!checkAuth(req, res)) return;
  if (!checkRateLimit(req, res)) return;

  const { imageBase64, mimeType, errorMessage, ocrPreview } = (req.body ?? {}) as {
    imageBase64?: string;
    mimeType?: string;
    errorMessage?: string;
    ocrPreview?: string;
  };
  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: "imageBase64 and mimeType required" });
  }
  if (imageBase64.length > 8 * 1024 * 1024) {
    return res.status(413).json({ error: "Image too large" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REPORT_FROM_EMAIL ?? "onboarding@resend.dev";
  const to = process.env.REPORT_TO_EMAIL ?? "ryder@mahamedia.us";
  if (!apiKey) return res.status(500).json({ error: "RESEND_API_KEY not set" });

  const resend = new Resend(apiKey);
  const ext = mimeType.split("/")[1] ?? "jpg";

  const result = await resend.emails.send({
    from,
    to,
    subject: "[SnapShift] OCR failed on this screenshot",
    text: `A user submitted a schedule that SnapShift could not parse.

Error: ${errorMessage ?? "(none)"}

OCR text preview:
${ocrPreview ?? "(none)"}`,
    attachments: [
      {
        filename: `schedule.${ext}`,
        content: imageBase64,
      },
    ],
  });

  if (result.error) {
    console.error("Resend error", result.error);
    return res.status(502).json({ error: "Could not deliver report" });
  }

  return res.status(200).json({ ok: true });
}
