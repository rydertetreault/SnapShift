// lib/upload/applyDefaultShift.ts
import { format, parse } from "date-fns";
import { ExtractedShift } from "@/lib/types";
import { DefaultShift } from "@/lib/preferences/types";

export function hhmmToDisplay(hhmm: string): string {
  const d = parse(hhmm, "HH:mm", new Date());
  return format(d, "h:mm a");
}

export function applyDefaultShift(
  shifts: ExtractedShift[],
  override: DefaultShift
): ExtractedShift[] {
  if (!override.enabled) return shifts;
  const start = hhmmToDisplay(override.startTime);
  const end = hhmmToDisplay(override.endTime);
  return shifts.map((s) =>
    s.allDay ? s : { ...s, startTime: start, endTime: end }
  );
}
