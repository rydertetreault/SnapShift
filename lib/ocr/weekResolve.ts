import { addDays, differenceInDays, format, getDate, getDay } from "date-fns";
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

export function inferWeekStartFromDayNumbers(
  numbers: DayNumbers,
  today: Date = new Date()
): string | null {
  let bestSat: Date | null = null;
  let bestDist = Infinity;
  for (const [dow, num] of Object.entries(numbers)) {
    if (num === undefined) continue;
    const offset = DOW_OFFSET[dow as keyof DayNumbers];
    for (let delta = -26 * 7; delta <= 26 * 7; delta++) {
      const candidate = addDays(today, delta);
      if (getDate(candidate) !== num) continue;
      const candDow = getDay(candidate);
      const backToSat = candDow === 6 ? 0 : candDow + 1;
      const sat = addDays(candidate, -backToSat);
      const actualOffset = differenceInDays(candidate, sat);
      if (actualOffset !== offset) continue;
      const dist = Math.abs(differenceInDays(sat, today));
      if (dist < bestDist) {
        bestDist = dist;
        bestSat = sat;
      }
    }
  }
  return bestSat ? format(bestSat, "yyyy-MM-dd") : null;
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
