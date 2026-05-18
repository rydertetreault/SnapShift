// One-shot verifier for the Gemini Vision pipeline.
// Calls Gemini directly with the same prompt/schema/config as proxy/api/ocr/gemini.js.
// Usage: npx tsx scripts/test-vision-ocr.ts [image-path]
// Default image: assets/images/schedule-example-2.jpg

import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

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

async function main() {
  const imagePath = process.argv[2] ?? "assets/images/schedule-example-2.jpg";
  if (!fs.existsSync(imagePath)) {
    console.error(`Image not found: ${imagePath}`);
    process.exit(1);
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not set in .env");
    process.exit(1);
  }

  const buf = fs.readFileSync(imagePath);
  const base64 = buf.toString("base64");
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  console.log(`\nImage:    ${imagePath}`);
  console.log(`Size:     ${(buf.length / 1024).toFixed(1)} KB`);
  console.log(`MIME:     ${mimeType}`);

  for (const resolution of ["MEDIA_RESOLUTION_MEDIUM", "MEDIA_RESOLUTION_HIGH"] as const) {
    console.log(`\n=== Gemini 2.5 Flash @ ${resolution} ===`);
    const body = {
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
        mediaResolution: resolution,
      },
    };
    const t0 = Date.now();
    const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const elapsed = Date.now() - t0;
    if (!resp.ok) {
      console.error(`HTTP ${resp.status}: ${await resp.text()}`);
      continue;
    }
    const data: any = await resp.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("Could not parse Gemini response:", text);
      continue;
    }
    console.log(`Latency: ${elapsed} ms`);
    console.log(`weekStart: ${parsed.weekStart ?? "(none)"}`);
    console.log(`shifts (${parsed.shifts?.length ?? 0}):`);
    for (const s of parsed.shifts ?? []) {
      const dom = s.date ? s.date.slice(8) : "??";
      console.log(`  ${dom}  ${s.dayOfWeek}  ${s.startTime ?? "(all-day)"} ${s.endTime ? "- " + s.endTime : ""} ${s.department ?? ""}`);
    }
  }
}

main().catch((e) => {
  console.error("\nFailed:", e?.message ?? e);
  process.exit(1);
});
