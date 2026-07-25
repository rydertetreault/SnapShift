import { format } from "date-fns";
import { runVisionOcr } from "./ocr/vision";
import { inferWeekStartFromDayNumbers, resolveDates } from "./ocr/weekResolve";
import { ExtractedShift } from "./types";

export interface OcrResult {
  shifts: ExtractedShift[];
  weekStart: string;
  source: "vision";
  rawOcrText?: string;
}

export async function parseScheduleImage(
  base64Image: string,
  mimeType: string
): Promise<OcrResult> {
  const vision = await runVisionOcr(base64Image, mimeType);
  if (vision.shifts.length === 0) {
    throw new Error("No shifts found in this screenshot.");
  }

  // Prefer the model's explicit weekStart. Otherwise try to derive the actual
  // week from day-of-month numbers visible in the screenshot (e.g. "Sat 20"
  // in a Publix expanded view). Only fall back to today's Saturday when we
  // have no positional anchor at all.
  let weekStart = vision.weekStart;
  if (!weekStart) {
    const dayNumbers: Record<string, number> = {};
    for (const s of vision.shifts) {
      if (typeof s.dayOfMonth === "number" && s.dayOfWeek) {
        const key = s.dayOfWeek.toLowerCase();
        if (!(key in dayNumbers)) dayNumbers[key] = s.dayOfMonth;
      }
    }
    if (Object.keys(dayNumbers).length > 0) {
      const inferred = inferWeekStartFromDayNumbers(dayNumbers as any);
      if (inferred) weekStart = inferred;
    }
  }
  if (!weekStart) weekStart = inferTodaysSaturday();

  // The engine may omit startTime/endTime for monthly-grid marker schedules.
  // Synthesize sentinel times and flag those shifts as all-day.
  const visionShifts: ExtractedShift[] = vision.shifts.map((s) => {
    const allDay = !s.startTime || !s.endTime;
    return {
      dayOfWeek: s.dayOfWeek,
      date: s.date ?? "",
      startTime: s.startTime ?? "12:00 AM",
      endTime: s.endTime ?? "11:59 PM",
      department: s.department,
      allDay,
      // Breaks/segments only make sense on timed shifts. Drop them for marker grids.
      breaks: !allDay && s.breaks?.length ? s.breaks : undefined,
      segments: !allDay && s.segments?.length ? s.segments : undefined,
    };
  });
  return {
    shifts: resolveDates(visionShifts, weekStart),
    weekStart,
    source: "vision",
  };
}

function inferTodaysSaturday(): string {
  const d = new Date();
  const dow = d.getDay();
  const back = dow === 6 ? 0 : dow + 1;
  d.setDate(d.getDate() - back);
  return format(d, "yyyy-MM-dd");
}
