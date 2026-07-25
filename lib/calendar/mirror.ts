// lib/calendar/mirror.ts
// Writes SnapShift's own events (source manual or ai) into a dedicated
// "SnapShift" calendar in the iPhone Calendar app. Highlights:
//   - Per-event try/catch so ONE corrupted event can't kill the whole loop
//     (the v1.2.0 bug behind "my schedule isn't appearing").
//   - Tracks the SnapShift calendar's id across syncs. If the user deletes
//     the calendar in iOS, every stored iosCalendarEventId is now dead — we
//     detect the id change and clear them all so events are recreated fresh.
//   - When updating fails (user deleted that specific event in iOS), we set
//     mirrorOptOut on the local event so we don't pop it back into iOS on
//     every sync. Editing the event in SnapShift clears the opt-out.
//   - Errors are reported to Sentry so we can see real failures from users.
import * as Calendar from "expo-calendar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMirrorEnabled } from "./preferences";
import { hasCalendarAccess } from "./access";
import { getAllEvents } from "../storage";
import { ScheduleEvent } from "../types";
import { STORAGE_KEY } from "../constants";
import { Sentry } from "../sentry";
import { sanitizeRange } from "./sanitizeRange";

const SNAPSHIFT_CALENDAR_TITLE = "SnapShift";
const MIRROR_CAL_ID_KEY = "@snapshift/mirror-calendar-id";

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

/**
 * If the SnapShift calendar id has changed since last mirror (because the user
 * deleted+recreated it, or wiped iOS settings), every stored iosCalendarEventId
 * is stale. Clear them all so the upcoming mirror cycle recreates each event
 * fresh. Also clears mirrorOptOut so previously-excluded events come back —
 * the user clearly wanted a clean slate when they deleted the calendar.
 */
async function reconcileCalendarId(
  calendarId: string,
  events: ScheduleEvent[]
): Promise<{ events: ScheduleEvent[]; mutated: boolean }> {
  const stored = await AsyncStorage.getItem(MIRROR_CAL_ID_KEY);
  if (stored === calendarId) return { events, mutated: false };
  const cleaned = events.map((e) =>
    e.iosCalendarEventId || e.mirrorOptOut
      ? { ...e, iosCalendarEventId: undefined, mirrorOptOut: undefined }
      : e
  );
  await AsyncStorage.setItem(MIRROR_CAL_ID_KEY, calendarId);
  return { events: cleaned, mutated: true };
}

export async function mirrorSnapShiftEvents(): Promise<void> {
  if (!(await getMirrorEnabled())) return;
  if (!(await hasCalendarAccess())) return;

  let calendarId: string;
  try {
    calendarId = await findOrCreateSnapShiftCalendar();
  } catch (e) {
    Sentry.captureException(e, { tags: { feature: "calendar.mirror.findCalendar" } });
    return;
  }

  const initial = await getAllEvents();
  const { events: reconciled, mutated: idChanged } = await reconcileCalendarId(
    calendarId,
    initial
  );
  const updated = [...reconciled];
  let mutated = idChanged;

  for (let i = 0; i < updated.length; i++) {
    const e = updated[i];
    if (e.source !== "manual" && e.source !== "ai") continue;
    if (e.mirrorOptOut) continue; // user deleted it in iOS — respect that

    // Repair inverted/equal ranges (overnight shifts anchored to one day);
    // skip events whose dates can't be repaired rather than letting EventKit
    // throw "The start date must be before the end date." (REACT-NATIVE-2).
    const range = sanitizeRange(e.startTime, e.endTime);
    if (!range) continue;

    const eventPayload: Calendar.Event = {
      title: e.title,
      startDate: range.start,
      endDate: range.end,
      notes: e.notes,
      allDay: e.allDay,
    } as any;

    if (e.iosCalendarEventId) {
      try {
        await Calendar.updateEventAsync(e.iosCalendarEventId, eventPayload);
        continue;
      } catch (err: any) {
        // Most common reason: the user deleted this specific event in the
        // iPhone Calendar app. Mark it as opted-out so we don't pop it back,
        // but don't recreate. Editing in SnapShift later clears the flag.
        updated[i] = {
          ...e,
          iosCalendarEventId: undefined,
          mirrorOptOut: true,
        };
        mutated = true;
        Sentry.addBreadcrumb({
          category: "calendar.mirror",
          message: `update failed for ${e.id}; marking mirrorOptOut`,
          data: { error: err?.message },
          level: "info",
        });
        continue;
      }
    }

    try {
      const id = await Calendar.createEventAsync(calendarId, eventPayload);
      updated[i] = { ...e, iosCalendarEventId: id };
      mutated = true;
    } catch (err) {
      // Don't let one bad event poison the loop — keep going.
      Sentry.captureException(err, {
        tags: { feature: "calendar.mirror.createEvent" },
        extra: { eventId: e.id },
      });
    }
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
  } catch (err) {
    // Event may already be gone, or access was revoked between checks.
    // Surface to Sentry so we can see real-world delete failures without
    // bothering the user with a UI error.
    Sentry.addBreadcrumb({
      category: "calendar.mirror",
      message: `unmirror failed for ${event.id}`,
      data: { error: (err as any)?.message },
      level: "warning",
    });
  }
}
