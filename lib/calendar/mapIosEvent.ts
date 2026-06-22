// lib/calendar/mapIosEvent.ts
import { ScheduleEvent } from "../types";

// Calendar types whose all-day entries are informational, not real commitments.
const SUBSCRIBED_TYPES = new Set(["subscribed", "birthdays"]);

// `calendarType(id)` returns the lowercased expo-calendar CalendarType for a
// calendar id (e.g. "subscribed", "birthday", "local", "caldav").
export function mapIosEventToScheduleEvent(
  e: any,
  calendarType: (calendarId: string) => string | undefined
): ScheduleEvent {
  const start = new Date(e.startDate as string);
  const end = new Date(e.endDate as string);
  const type = (calendarType(e.calendarId) || "").toLowerCase();
  return {
    id: `ios:${e.id}`,
    iosCalendarEventId: e.id,
    iosCalendarId: e.calendarId,
    title: e.title || "(no title)",
    date: start.toISOString().slice(0, 10),
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    category: "other",
    source: "ios",
    notes: e.notes,
    createdAt: new Date().toISOString(),
    allDay: !!e.allDay,
    subscribed: SUBSCRIBED_TYPES.has(type),
  };
}
