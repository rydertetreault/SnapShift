import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScheduleEvent } from "./types";
import { STORAGE_KEY } from "./constants";

export async function getAllEvents(): Promise<ScheduleEvent[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) return [];
  return JSON.parse(json);
}

async function triggerMirror(): Promise<void> {
  try {
    const { mirrorSnapShiftEvents } = await import("./calendar/mirror");
    mirrorSnapShiftEvents().catch(() => {});
  } catch {
    // Mirror module unavailable (e.g. Jest VM environment). Safe to skip.
  }
}

export async function saveEvent(event: ScheduleEvent): Promise<void> {
  const events = await getAllEvents();
  events.push(event);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  triggerMirror();
}

export async function saveMultipleEvents(
  newEvents: ScheduleEvent[]
): Promise<void> {
  const events = await getAllEvents();
  events.push(...newEvents);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  triggerMirror();
}

export async function updateEvent(
  id: string,
  updates: Partial<ScheduleEvent>
): Promise<void> {
  const events = await getAllEvents();
  const index = events.findIndex((e) => e.id === id);
  if (index === -1) return;
  events[index] = { ...events[index], ...updates };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  const { mirrorSnapShiftEvents } = await import("./calendar/mirror");
  mirrorSnapShiftEvents().catch(() => {});
}

export async function deleteEvent(id: string): Promise<void> {
  const events = await getAllEvents();
  const event = events.find((e) => e.id === id);
  if (event) {
    const { unmirrorEvent } = await import("./calendar/mirror");
    await unmirrorEvent(event);
  }
  const filtered = events.filter((e) => e.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function getEventById(
  id: string
): Promise<ScheduleEvent | undefined> {
  const events = await getAllEvents();
  return events.find((e) => e.id === id);
}

export async function getEventsBySeriesId(
  seriesId: string
): Promise<ScheduleEvent[]> {
  const events = await getAllEvents();
  return events.filter((e) => e.seriesId === seriesId);
}

export async function deleteSeries(seriesId: string): Promise<void> {
  const events = await getAllEvents();
  const removed = events.filter((e) => e.seriesId === seriesId);
  if (removed.length > 0) {
    const { unmirrorEvent } = await import("./calendar/mirror");
    for (const e of removed) await unmirrorEvent(e);
  }
  const filtered = events.filter((e) => e.seriesId !== seriesId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function deleteFutureInSeries(
  seriesId: string,
  fromDate: string
): Promise<void> {
  const events = await getAllEvents();
  const removed = events.filter(
    (e) => e.seriesId === seriesId && e.date >= fromDate
  );
  if (removed.length > 0) {
    const { unmirrorEvent } = await import("./calendar/mirror");
    for (const e of removed) await unmirrorEvent(e);
  }
  const filtered = events.filter(
    (e) => e.seriesId !== seriesId || e.date < fromDate
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function updateSeries(
  seriesId: string,
  updates: Partial<ScheduleEvent>,
  fromDate?: string
): Promise<void> {
  const events = await getAllEvents();
  const updated = events.map((e) => {
    if (e.seriesId !== seriesId) return e;
    if (fromDate && e.date < fromDate) return e;
    return { ...e, ...updates };
  });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  const { mirrorSnapShiftEvents } = await import("./calendar/mirror");
  mirrorSnapShiftEvents().catch(() => {});
}

// Replaces all source==="canvas" events with the incoming batch keyed by externalId (ICS UID).
// Preserves user-added `notes` across syncs since notes-only editing is allowed for Canvas events.
export async function upsertCanvasEvents(events: ScheduleEvent[]): Promise<void> {
  const existing = await getAllEvents();
  const incomingIds = new Set(
    events.map((e) => e.externalId).filter((x): x is string => Boolean(x))
  );
  const kept = existing.filter((e) => {
    if (e.source !== "canvas") return true;
    return e.externalId !== undefined && incomingIds.has(e.externalId);
  });
  const existingByExternalId = new Map(
    kept
      .filter((e) => e.source === "canvas" && e.externalId)
      .map((e) => [e.externalId!, e])
  );
  const nonCanvas = kept.filter((e) => e.source !== "canvas");
  const merged: ScheduleEvent[] = [...nonCanvas];
  for (const incoming of events) {
    const prev = existingByExternalId.get(incoming.externalId!);
    if (prev) {
      // Keep the stable id and preserve any user-added notes from prior sync.
      merged.push({
        ...incoming,
        id: prev.id,
        notes: prev.notes ?? incoming.notes,
      });
    } else {
      merged.push(incoming);
    }
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  triggerMirror();
}

export async function deleteAllCanvasEvents(): Promise<void> {
  const events = await getAllEvents();
  const canvasEvents = events.filter((e) => e.source === "canvas");
  if (canvasEvents.length > 0) {
    const { unmirrorEvent } = await import("./calendar/mirror");
    for (const e of canvasEvents) await unmirrorEvent(e);
  }
  const filtered = events.filter((e) => e.source !== "canvas");
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function upsertIosEvents(events: ScheduleEvent[]): Promise<void> {
  const existing = await getAllEvents();
  const incomingIds = new Set(
    events.map((e) => e.iosCalendarEventId!).filter(Boolean)
  );
  // Drop existing source==="ios" events that aren't in the incoming batch
  const kept = existing.filter((e) => {
    if (e.source !== "ios") return true;
    return e.iosCalendarEventId && incomingIds.has(e.iosCalendarEventId);
  });
  const existingByIosId = new Map(
    kept
      .filter((e) => e.source === "ios" && e.iosCalendarEventId)
      .map((e) => [e.iosCalendarEventId!, e])
  );
  const nonIos = kept.filter((e) => e.source !== "ios");
  const merged: ScheduleEvent[] = [...nonIos];
  for (const incoming of events) {
    const prev = existingByIosId.get(incoming.iosCalendarEventId!);
    merged.push(prev ? { ...prev, ...incoming } : incoming);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}
