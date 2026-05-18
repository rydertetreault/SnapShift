// One-shot verifier for the Publix OCR + week-resolver pipeline.
// Usage: npx tsx scripts/test-publix-ocr.ts [image-path]
// Default image: assets/images/schedule-example-3.png

import fs from "node:fs";
import path from "node:path";

// Load .env BEFORE importing publix.ts (which captures the OCR API key at module load).
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  const imagePath = process.argv[2] ?? "assets/images/schedule-example-3.png";
  if (!fs.existsSync(imagePath)) {
    console.error(`Image not found: ${imagePath}`);
    process.exit(1);
  }

  const { runPublixOcr } = await import("../lib/ocr/publix");
  const { inferWeekStartFromDayNumbers } = await import(
    "../lib/ocr/weekResolve"
  );

  const buf = fs.readFileSync(imagePath);
  const base64 = buf.toString("base64");
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  console.log(`\nImage:    ${imagePath}`);
  console.log(`Size:     ${(buf.length / 1024).toFixed(1)} KB`);
  console.log(`MIME:     ${mimeType}`);
  console.log(`API key:  ${process.env.EXPO_PUBLIC_OCR_API_KEY ? "set" : "MISSING — check .env"}`);

  console.log("\nCalling OCR.space...");
  const result = await runPublixOcr(base64, mimeType);

  console.log("\n=== Raw OCR text ===");
  console.log(result.rawOcrText);

  console.log("\n=== Parsed shifts ===");
  if (result.shifts.length === 0) {
    console.log("  (none)");
  }
  for (const s of result.shifts) {
    const dom = s.dayOfMonth === undefined ? "?" : String(s.dayOfMonth);
    console.log(
      `  ${s.dayOfWeek.padEnd(10)} dayOfMonth=${dom.padStart(2)}  ${s.startTime} - ${s.endTime}  ${s.department ?? ""}`
    );
  }

  type DayKey =
    | "saturday" | "sunday" | "monday" | "tuesday"
    | "wednesday" | "thursday" | "friday";
  const numbers: Partial<Record<DayKey, number>> = {};
  for (const s of result.shifts) {
    if (s.dayOfMonth !== undefined) {
      numbers[s.dayOfWeek.toLowerCase() as DayKey] = s.dayOfMonth;
    }
  }
  console.log("\n=== Day numbers fed to resolver ===");
  console.log(numbers);

  const today = new Date();
  const weekStart = inferWeekStartFromDayNumbers(numbers, today);
  console.log("\n=== Inferred weekStart ===");
  console.log(
    weekStart
      ? `${weekStart}  (relative to today=${today.toISOString().slice(0, 10)})`
      : "NULL — would fall back to today's Saturday (THIS IS THE BUG)"
  );
}

main().catch((e) => {
  console.error("\nFailed:", e?.message ?? e);
  process.exit(1);
});
