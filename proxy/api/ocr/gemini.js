const { checkAuth, checkRateLimit } = require("../_lib/auth.js");

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    weekStart: {
      type: "STRING",
      description:
        "ISO date (YYYY-MM-DD) of the first day of the week or month shown, if visible. Omit if not visible.",
    },
    shifts: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          dayOfWeek: { type: "STRING" },
          date: {
            type: "STRING",
            description: "YYYY-MM-DD if derivable from the image",
          },
          startTime: {
            type: "STRING",
            description:
              "h:mm AM/PM format. OMIT if the source shows no specific times (e.g. monthly marker grid).",
          },
          endTime: {
            type: "STRING",
            description:
              "h:mm AM/PM format. OMIT if the source shows no specific times.",
          },
          department: { type: "STRING" },
        },
        required: ["dayOfWeek"],
      },
    },
  },
  required: ["shifts"],
};

const PROMPT = `Extract all work shifts from this schedule screenshot.

The screenshot may be in one of two formats:

(A) LIST or WEEKLY GRID with explicit shift times. For each shift extract:
    - dayOfWeek (full name)
    - date (YYYY-MM-DD if you can derive it from visible context)
    - startTime (h:mm AM/PM format, e.g. "9:00 AM")
    - endTime (h:mm AM/PM format)
    - department/role if shown

(B) MONTHLY CALENDAR VIEW with markers (dots, fills, highlights, etc.) on days the user works but NO specific times. For each marked day extract:
    - date (YYYY-MM-DD - derive from the visible month/year header)
    - dayOfWeek (full name)
    - OMIT startTime and endTime entirely
    - OMIT department

If the screenshot shows an explicit week or month range header (e.g. "Week of Mar 8" or "May 2026"), return weekStart as the first day shown (YYYY-MM-DD).

Skip days marked "off", "not scheduled", "available", "requested off", or similar.
Times like "5a" or "14:00" should be normalized to "5:00 AM" or "2:00 PM".`;

module.exports = async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  if (!checkAuth(req, res)) return;
  if (!checkRateLimit(req, res)) return;

  const { imageBase64, mimeType } = req.body || {};
  if (!imageBase64 || !mimeType) {
    return res
      .status(400)
      .json({ error: "imageBase64 and mimeType required" });
  }
  if (imageBase64.length > 8 * 1024 * 1024) {
    return res.status(413).json({ error: "Image too large" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: "GEMINI_API_KEY not set" });

  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.1,
    },
  };

  const upstream = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    console.error("Gemini error", upstream.status, errText);
    return res.status(502).json({ error: "Vision service unavailable" });
  }

  const data = await upstream.json();
  const text =
    data &&
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0] &&
    data.candidates[0].content.parts[0].text;
  if (!text)
    return res
      .status(502)
      .json({ error: "Empty response from vision service" });

  try {
    const parsed = JSON.parse(text);
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(502).json({ error: "Could not parse vision response" });
  }
};
