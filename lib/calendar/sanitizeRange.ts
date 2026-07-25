// lib/calendar/sanitizeRange.ts
// Pure date-range validation/repair, kept free of native imports so it can be
// unit-tested without the expo-calendar / AsyncStorage native modules.

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Validate and repair an event's date range before handing it to EventKit,
 * which throws "The start date must be before the end date." on inverted or
 * equal ranges (Sentry REACT-NATIVE-2). Overnight shifts stored with the end
 * anchored to the same calendar day (e.g. 9 PM – 2 AM) are rolled forward a
 * day; anything unparseable returns null so callers can skip it.
 */
export function sanitizeRange(
  startISO: string,
  endISO: string
): { start: Date; end: Date } | null {
  const start = new Date(startISO);
  let end = new Date(endISO);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  if (end <= start) {
    // Likely an overnight shift saved on the same date — roll end +24h.
    end = new Date(end.getTime() + DAY_MS);
    // Still inverted (end was more than a day before start)? Give up.
    if (end <= start) return null;
  }
  return { start, end };
}
