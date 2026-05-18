import * as Calendar from "expo-calendar";

// The calendar SnapShift creates in EventKit when mirroring is enabled.
// Must match the constant in lib/calendar/mirror.ts.
export const SNAPSHIFT_CALENDAR_TITLE = "SnapShift";

export interface IosCalendar {
  id: string;
  title: string;
  source: string;
  color: string;
  allowsModifications: boolean;
}

export async function requestCalendarAccess(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === "granted";
}

export async function hasCalendarAccess(): Promise<boolean> {
  const { status } = await Calendar.getCalendarPermissionsAsync();
  return status === "granted";
}

export async function listIosCalendars(): Promise<IosCalendar[]> {
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  // Hide our own mirror-target calendar from the read picker.
  // Including it would cause every mirrored event to appear twice.
  return cals
    .filter(
      (c) =>
        !(c.title === SNAPSHIFT_CALENDAR_TITLE && c.allowsModifications),
    )
    .map((c) => ({
      id: c.id,
      title: c.title,
      source: c.source?.name ?? "Unknown",
      color: c.color,
      allowsModifications: c.allowsModifications,
    }));
}

export async function fetchEventsForRange(
  calendarIds: string[],
  startDate: Date,
  endDate: Date
): Promise<Calendar.Event[]> {
  if (calendarIds.length === 0) return [];
  return Calendar.getEventsAsync(calendarIds, startDate, endDate);
}
