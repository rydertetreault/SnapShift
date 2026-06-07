// lib/sharing/buildPayload.ts
import { format, parseISO, addDays } from "date-fns";
import { ScheduleEvent } from "../types";
import { SharedWeekPayload, SharedShift, SharedBusy, SHARE_SCHEMA_VERSION } from "./types";
import { mergeBusy } from "./mergeBusy";

function inWeek(dateStr: string, weekStartISO: string): boolean {
  const d = parseISO(dateStr);
  const start = parseISO(weekStartISO);
  const end = addDays(start, 7);
  return d >= start && d < end;
}

const hhmm = (iso: string): string => format(parseISO(iso), "HH:mm");

export function buildSharedWeek(
  events: ScheduleEvent[],
  weekStartISO: string,
  identity: { id: string; name: string }
): SharedWeekPayload {
  const inWindow = events.filter((e) => inWeek(e.date, weekStartISO));

  const shifts: SharedShift[] = inWindow
    .filter((e) => e.category === "work")
    .map((e) => ({
      date: e.date,
      start: hhmm(e.startTime),
      end: hhmm(e.endTime),
      label: e.title?.trim() || "Work",
    }));

  const busyRaw: SharedBusy[] = inWindow
    .filter((e) => e.category !== "work")
    .filter((e) => !(e.allDay && e.subscribed))
    .map((e) =>
      e.allDay
        ? { date: e.date, start: "00:00", end: "23:59", allDay: true }
        : { date: e.date, start: hhmm(e.startTime), end: hhmm(e.endTime) }
    );

  return {
    v: SHARE_SCHEMA_VERSION,
    id: identity.id,
    name: identity.name,
    week: weekStartISO,
    shifts,
    busy: mergeBusy(busyRaw),
  };
}
