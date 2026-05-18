import { addDays, differenceInDays, format, parseISO } from "date-fns";
import { getAllEvents, saveMultipleEvents } from "./storage";
import { expandRecurrence, EXTEND_THRESHOLD_DAYS } from "./recurrence";
import { ScheduleEvent } from "./types";

export async function maybeExtendIndefiniteSeries(today: Date = new Date()): Promise<number> {
  const events = await getAllEvents();
  // Group by seriesId, only indefinite ones (recurrence with no endDate)
  const groups = new Map<string, ScheduleEvent[]>();
  for (const e of events) {
    if (!e.seriesId || !e.recurrence || e.recurrence.endDate) continue;
    if (e.recurrence.frequency === "none") continue;
    const list = groups.get(e.seriesId) ?? [];
    list.push(e);
    groups.set(e.seriesId, list);
  }

  let added = 0;
  const newEvents: ScheduleEvent[] = [];
  for (const [, occurrences] of groups) {
    const lastDate = occurrences
      .map((e) => e.date)
      .sort()
      .at(-1)!;
    const daysOut = differenceInDays(parseISO(lastDate), today);
    if (daysOut >= EXTEND_THRESHOLD_DAYS) continue;

    const template = occurrences[0];
    // Extend from the day after lastDate to lastDate + MATERIALIZE_HORIZON_DAYS.
    const startDate = format(addDays(parseISO(lastDate), 1), "yyyy-MM-dd");
    const dates = expandRecurrence(startDate, template.recurrence!);
    const existingDates = new Set(occurrences.map((e) => e.date));

    for (const d of dates) {
      if (existingDates.has(d)) continue;
      const occStart = withDate(d, parseISO(template.startTime));
      const occEnd = withDate(d, parseISO(template.endTime));
      newEvents.push({
        ...template,
        id: Math.random().toString(36).substring(2, 10),
        date: d,
        startTime: occStart.toISOString(),
        endTime: occEnd.toISOString(),
        createdAt: new Date().toISOString(),
      });
      added += 1;
    }
  }

  if (newEvents.length > 0) await saveMultipleEvents(newEvents);
  return added;
}

function withDate(dateStr: string, timeSource: Date): Date {
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(timeSource.getHours(), timeSource.getMinutes(), 0, 0);
  return d;
}

