import { addDays, format } from "date-fns";
import { ExtractedShift } from "../types";

type DayNumbers = Partial<
  Record<
    | "saturday"
    | "sunday"
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday",
    number
  >
>;

const DOW_OFFSET: Record<keyof DayNumbers, number> = {
  saturday: 0,
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
};

// Stub: Task 4.2 implements the real algorithm. Returning null falls
// through to the "current Saturday" default in the orchestrator.
export function inferWeekStartFromDayNumbers(
  _numbers: DayNumbers,
  _today: Date = new Date()
): string | null {
  return null;
}

export function resolveDates(
  shifts: ExtractedShift[],
  weekStartSaturday: string
): ExtractedShift[] {
  const sat = new Date(weekStartSaturday + "T00:00:00");
  return shifts.map((s) => {
    if (s.date) return s;
    const dow = s.dayOfWeek.toLowerCase() as keyof DayNumbers;
    const offset = DOW_OFFSET[dow] ?? 0;
    return { ...s, date: format(addDays(sat, offset), "yyyy-MM-dd") };
  });
}
