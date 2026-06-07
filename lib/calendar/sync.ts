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

  const typeById = new Map(allCals.map((c) => [c.id, String(c.type)]));
  const mapped: ScheduleEvent[] = events.map((e) =>
    mapIosEventToScheduleEvent(e, (id) => typeById.get(id))
  );

  await upsertIosEvents(mapped);
  return mapped.length;
}
