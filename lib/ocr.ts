import { format } from "date-fns";
import { runPublixOcr } from "./ocr/publix";
import { runVisionOcr } from "./ocr/vision";
import { inferWeekStartFromDayNumbers, resolveDates } from "./ocr/weekResolve";
import { ExtractedShift } from "./types";

export interface OcrResult {
  shifts: ExtractedShift[];
  weekStart: string;
  source: "publix" | "vision";
  rawOcrText?: string;
}

export async function parseScheduleImage(
  base64Image: string,
  mimeType: string
): Promise<OcrResult> {
  const publix = await runPublixOcr(base64Image, mimeType);
  if (publix.shifts.length > 0) {
    const numbers = collectDayNumbers(publix.shifts);
    const weekStart =
      inferWeekStartFromDayNumbers(numbers) ?? inferTodaysSaturday();
    const resolved: ExtractedShift[] = publix.shifts.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      date: "",
      startTime: s.startTime,
      endTime: s.endTime,
      department: s.department,
    }));
    return {
      shifts: resolveDates(resolved, weekStart),
      weekStart,
      source: "publix",
      rawOcrText: publix.rawOcrText,
    };
  }

  // Fallback to Gemini Vision
  const vision = await runVisionOcr(base64Image, mimeType);
  if (vision.shifts.length === 0) {
    throw new Error("No shifts found in this screenshot.");
  }
  const weekStart = vision.weekStart ?? inferTodaysSaturday();
  return {
    shifts: resolveDates(vision.shifts, weekStart),
    weekStart,
    source: "vision",
  };
}

type DayKey =
  | "saturday"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

function collectDayNumbers(
  shifts: { dayOfWeek: string; dayOfMonth?: number }[]
): Partial<Record<DayKey, number>> {
  const out: Partial<Record<DayKey, number>> = {};
  for (const s of shifts) {
    if (s.dayOfMonth !== undefined) {
      out[s.dayOfWeek.toLowerCase() as DayKey] = s.dayOfMonth;
    }
  }
  return out;
}

function inferTodaysSaturday(): string {
  const d = new Date();
  const dow = d.getDay();
  const back = dow === 6 ? 0 : dow + 1;
  d.setDate(d.getDate() - back);
  return format(d, "yyyy-MM-dd");
}
