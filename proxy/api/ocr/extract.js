// proxy/api/ocr/extract.js
const { checkAuth } = require("../_lib/auth.js");
const { enforceRateLimit } = require("../_lib/rate-limit.js");
const {
  buildOpenRouterRequest,
  parseExtractionResponse,
} = require("../_lib/extract-core.js");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Confirm the exact slug via the pre-flight step; override with env if needed.
const OPENROUTER_MODEL_DEFAULT = "anthropic/claude-sonnet-4.6";

module.exports = async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  if (!checkAuth(req, res)) return;
  // Metered endpoint: enforce the per-device free quota in addition to the
  // per-IP burst guard. A 429 with code DEVICE_QUOTA drives the in-app
  // "premium coming soon" prompt.
  if (!(await enforceRateLimit(req, res, { deviceQuota: true }))) return;

  const { imageBase64, mimeType } = req.body || {};
  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: "imageBase64 and mimeType required" });
  }
  if (imageBase64.length > 8 * 1024 * 1024) {
    return res.status(413).json({ error: "Image too large" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: "OPENROUTER_API_KEY not set" });

  const model = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_DEFAULT;
  const body = buildOpenRouterRequest({ imageBase64, mimeType, model });

  let upstream;
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // Optional but recommended by OpenRouter for attribution.
        "HTTP-Referer": "https://snapshift.app",
        "X-Title": "SnapShift",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("OpenRouter fetch failed", e);
    return res.status(502).json({ error: "Vision service unavailable" });
  }

  if (!upstream.ok) {
    const errText = await upstream.text();
    console.error("OpenRouter error", upstream.status, errText);
    return res.status(502).json({ error: "Vision service unavailable" });
  }

  const data = await upstream.json();
  try {
    const parsed = parseExtractionResponse(data);
    return res.status(200).json(parsed);
  } catch (e) {
    console.error("Parse error", e);
    return res.status(502).json({ error: "Could not parse vision response" });
  }
};
