import { addDays } from "date-fns";
import { fetchEventsForRange, hasCalendarAccess } from "./access";
import { getSelectedCalendarIds } from "./preferences";
import { upsertIosEvents } from "../storage";
import { ScheduleEvent } from "../types";

const READ_WINDOW_DAYS = 60;

export async function syncIosCalendars(today: Date = new Date()): Promise<number> {
  if (!(await hasCalendarAccess())) return 0;
  const calendarIds = await getSelectedCalendarIds();
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
    };
  });

  await upsertIosEvents(mapped);
  return mapped.length;
}
