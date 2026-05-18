import * as Calendar from "expo-calendar";

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
  return cals.map((c) => ({
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
