const { checkAuth, checkRateLimit } = require("../_lib/auth.js");

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent";

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

const PROMPT = `You are extracting work shifts from a schedule screenshot. ACCURACY IS CRITICAL. Missing a shift means the user misses work, which is much worse than detecting an extra one.

The screenshot may be in one of two formats:

(A) LIST or WEEKLY GRID with explicit shift times.
For each shift extract: dayOfWeek (full name), date (YYYY-MM-DD if derivable), startTime (h:mm AM/PM), endTime (h:mm AM/PM), department/role if shown.

(B) MONTHLY CALENDAR VIEW with markers (dots, fills, highlights, icons, badges, color changes, underlines, asterisks, etc.) on days the user works but NO specific times.

For format (B), follow this procedure RIGOROUSLY:

1. Read the month/year from the header (e.g. "May 2026"). Set weekStart to the first day of that month (e.g. "2026-05-01").

2. Identify the day-of-week column order from the header row (commonly Sun-Sat or Mon-Sun).

3. The grid contains roughly 35-42 day cells across 5-6 rows. Walk through EVERY cell systematically, row by row, left to right. Do not skip any cell.

4. Day numbers in faded/lighter color belong to adjacent months — EXCLUDE those.

5. For each in-month cell, examine it for ANY marker indicating a shift:
   - dots (often small, below or beside the date number)
   - colored fills or backgrounds (other than the "today" highlight)
   - icons, badges, asterisks, underlines
   - any visual difference from a blank cell
   The "today" highlight (often a solid color box around the current date) is NOT a shift marker on its own — check for additional markers on top of it.

6. PAY EXTRA ATTENTION to the rightmost column (Saturday) and leftmost column (Sunday). Markers there are easy to miss because they sit at the edge.

7. For each cell with a marker, output: { date: "YYYY-MM-DD", dayOfWeek: "FullName" }. Omit startTime, endTime, and department for marker-only cells.

8. Before finalizing, COUNT the markers you found and re-scan the image to confirm the count matches what's visually present. If unsure about a faint marker, INCLUDE it (false positive is better than miss).

Skip days marked "off", "not scheduled", "available", "requested off", or similar.

For format (A), times like "5a" or "14:00" should be normalized to "5:00 AM" or "2:00 PM".

Output only the JSON matching the schema. Be exhaustive about markers.`;

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
    return res.status(502).json({
      error: "Vision service unavailable",
      debug: { status: upstream.status, body: errText.slice(0, 500) },
    });
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
