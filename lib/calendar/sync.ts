import * as Calendar from "expo-calendar";
import { addDays } from "date-fns";
import {
  fetchEventsForRange,
  hasCalendarAccess,
  SNAPSHIFT_CALENDAR_TITLE,
} from "./access";
import { getSelectedCalendarIds } from "./preferences";
import { upsertIosEvents } from "../storage";
import { ScheduleEvent } from "../types";

const READ_WINDOW_DAYS = 60;

export async function syncIosCalendars(today: Date = new Date()): Promise<number> {
  if (!(await hasCalendarAccess())) return 0;

  // Defensive filter: drop any selected calendar IDs that point at our own mirror
  // target. listIosCalendars hides it from the picker going forward, but a user
  // could have selected it before this fix shipped.
  const allCals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const ownCalendarIds = new Set(
    allCals
      .filter(
        (c) => c.title === SNAPSHIFT_CALENDAR_TITLE && c.allowsModifications,
      )
      .map((c) => c.id),
  );
  const calendarIds = (await getSelectedCalendarIds()).filter(
    (id) => !ownCalendarIds.has(id),
  );
  if (calendarIds.length === 0) {
    await upsertIosEvents([]);
    return 0;
  }

  const events = await fetchEventsForRange(
    calendarIds,
    addDays(today, -READ_WINDOW_DAYS),
    addDays(today, READ_WINDOW_DAYS)
  );

  const mapped: ScheduleEvent[] = events.map((e) => {
    const start = new Date(e.startDate as string);
    const end = new Date(e.endDate as string);
    const date = start.toISOString().slice(0, 10);
    return {
      id: `ios:${e.id}`,
      iosCalendarEventId: e.id,
      title: e.title || "(no title)",
      date,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      category: "other",
      source: "ios",
      notes: e.notes,
      createdAt: new Date().toISOString(),
      allDay: !!e.allDay,
    };
  });

  await upsertIosEvents(mapped);
  return mapped.length;
}
