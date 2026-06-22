// lib/calendar/sync.ts
import * as Calendar from "expo-calendar";
import { addDays } from "date-fns";
import {
  fetchEventsForRange,
  hasCalendarAccess,
  SNAPSHIFT_CALENDAR_TITLE,
} from "./access";
import { getSelectedCalendarIds } from "./preferences";
import { mapIosEventToScheduleEvent } from "./mapIosEvent";
import { upsertIosEvents } from "../storage";
import { ScheduleEvent } from "../types";
import { Sentry } from "../sentry";

// v1.2.1: widened from ±60 to ±365 days. Several users had work schedules
// posted further out (2-3 months) that silently never appeared in SnapShift.
// Calendar.getEventsAsync over a year window is still cheap on real hardware.
const READ_WINDOW_DAYS = 365;

export async function syncIosCalendars(today: Date = new Date()): Promise<number> {
  if (!(await hasCalendarAccess())) return 0;

  let allCals: Calendar.Calendar[];
  try {
    allCals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  } catch (e) {
    Sentry.captureException(e, { tags: { feature: "calendar.sync.list" } });
    return 0;
  }

  // Defensive filter: drop any selected calendar IDs that point at our own mirror
  // target. listIosCalendars hides it from the picker going forward, but a user
  // could have selected it before this fix shipped.
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

  let events: Calendar.Event[];
  try {
    events = await fetchEventsForRange(
      calendarIds,
      addDays(today, -READ_WINDOW_DAYS),
      addDays(today, READ_WINDOW_DAYS)
    );
  } catch (e) {
    Sentry.captureException(e, { tags: { feature: "calendar.sync.fetch" } });
    return 0;
  }

  const typeById = new Map(allCals.map((c) => [c.id, String(c.type)]));
  const mapped: ScheduleEvent[] = events.map((e) =>
    mapIosEventToScheduleEvent(e, (id) => typeById.get(id))
  );

  await upsertIosEvents(mapped);
  return mapped.length;
}
