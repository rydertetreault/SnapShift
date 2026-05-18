import * as Calendar from "expo-calendar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMirrorEnabled } from "./preferences";
import { hasCalendarAccess } from "./access";
import { getAllEvents } from "../storage";
import { ScheduleEvent } from "../types";
import { STORAGE_KEY } from "../constants";

const SNAPSHIFT_CALENDAR_TITLE = "SnapShift";

async function findOrCreateSnapShiftCalendar(): Promise<string> {
  const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = all.find(
    (c) => c.title === SNAPSHIFT_CALENDAR_TITLE && c.allowsModifications
  );
  if (existing) return existing.id;

  const defaultSource = all.find((c) => c.allowsModifications)?.source;
  if (!defaultSource) {
    throw new Error("No writable calendar source on this device.");
  }
  return Calendar.createCalendarAsync({
    title: SNAPSHIFT_CALENDAR_TITLE,
    color: "#4CAF50",
    entityType: Calendar.EntityTypes.EVENT,
    source: defaultSource,
    sourceId: (defaultSource as any).id,
    name: SNAPSHIFT_CALENDAR_TITLE,
    ownerAccount: defaultSource.name,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

export async function mirrorSnapShiftEvents(): Promise<void> {
  if (!(await getMirrorEnabled())) return;
  if (!(await hasCalendarAccess())) return;

  const calendarId = await findOrCreateSnapShiftCalendar();
  const events = await getAllEvents();
  let mutated = false;
  const updated = [...events];

  for (let i = 0; i < updated.length; i++) {
    const e = updated[i];
    if (e.source !== "manual" && e.source !== "ai") continue;
    if (e.iosCalendarEventId) {
      await Calendar.updateEventAsync(e.iosCalendarEventId, {
        title: e.title,
        startDate: new Date(e.startTime),
        endDate: new Date(e.endTime),
        notes: e.notes,
        allDay: e.allDay,
      });
      continue;
    }
    const id = await Calendar.createEventAsync(calendarId, {
      title: e.title,
      startDate: new Date(e.startTime),
      endDate: new Date(e.endTime),
      notes: e.notes,
      allDay: e.allDay,
    });
    updated[i] = { ...e, iosCalendarEventId: id };
    mutated = true;
  }

  if (mutated) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
}

export async function unmirrorEvent(event: ScheduleEvent): Promise<void> {
  if (!event.iosCalendarEventId) return;
  if (!(await hasCalendarAccess())) return;
  try {
    await Calendar.deleteEventAsync(event.iosCalendarEventId);
  } catch {
    // Event may already be gone; swallow.
  }
}
