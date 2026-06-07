import { format } from "date-fns";
import { runVisionOcr } from "./ocr/vision";
import { resolveDates } from "./ocr/weekResolve";
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
  const weekStart = vision.weekStart ?? inferTodaysSaturday();
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
