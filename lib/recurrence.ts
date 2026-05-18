import {
  addDays,
  addMonths,
  addWeeks,
  format,
  parseISO,
  getDay,
  getDate,
  getDaysInMonth,
} from "date-fns";
import { Recurrence, Weekday } from "./types";

// How far ahead we materialize for indefinite series.
// On app open, if we're within EXTEND_THRESHOLD_DAYS of the last occurrence, we re-extend.
export const MATERIALIZE_HORIZON_DAYS = 365;
export const EXTEND_THRESHOLD_DAYS = 60;

const ISO = "yyyy-MM-dd";

export function expandRecurrence(seedDate: string, rule: Recurrence): string[] {
  if (rule.frequency === "none") return [seedDate];

  const seed = parseISO(seedDate);
  const horizon = rule.endDate
    ? parseISO(rule.endDate)
    : addDays(seed, MATERIALIZE_HORIZON_DAYS);

  switch (rule.frequency) {
    case "daily":
      return expandFixedInterval(seed, horizon, (d) => addDays(d, 1));
    case "weekly":
      return expandFixedInterval(seed, horizon, (d) => addWeeks(d, 1));
    case "biweekly":
      return expandFixedInterval(seed, horizon, (d) => addWeeks(d, 2));
    case "monthly":
      return expandMonthly(seed, horizon);
    case "custom":
      return expandCustomWeekly(seed, horizon, rule.weekdays ?? []);
  }
}

function expandFixedInterval(
  seed: Date,
  horizon: Date,
  step: (d: Date) => Date
): string[] {
  const out: string[] = [];
  let cursor = seed;
  while (cursor.getTime() <= horizon.getTime()) {
    out.push(format(cursor, ISO));
    cursor = step(cursor);
  }
  return out;
}

function expandMonthly(seed: Date, horizon: Date): string[] {
  const dayOfMonth = getDate(seed);
  const out: string[] = [];
  let cursor = seed;
  while (cursor.getTime() <= horizon.getTime()) {
    // Skip months that don't have this day (Jan 31 → Feb has 28, skip)
    if (getDate(cursor) === dayOfMonth) {
      out.push(format(cursor, ISO));
    }
    cursor = addMonths(cursor, 1);
    // addMonths clamps (Jan 31 + 1 month = Feb 28); reset to dayOfMonth if month has it
    if (getDaysInMonth(cursor) >= dayOfMonth) {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), dayOfMonth);
    }
  }
  return out;
}

function expandCustomWeekly(
  seed: Date,
  horizon: Date,
  weekdays: Weekday[]
): string[] {
  if (weekdays.length === 0) return [];
  const set = new Set(weekdays);
  const out: string[] = [];
  let cursor = seed;
  while (cursor.getTime() <= horizon.getTime()) {
    if (set.has(getDay(cursor) as Weekday)) {
      out.push(format(cursor, ISO));
    }
    cursor = addDays(cursor, 1);
  }
  return out;
}
