import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScheduleEvent } from "./types";
import { STORAGE_KEY } from "./constants";

export async function getAllEvents(): Promise<ScheduleEvent[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) return [];
  return JSON.parse(json);
}

export async function saveEvent(event: ScheduleEvent): Promise<void> {
  const events = await getAllEvents();
  events.push(event);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export async function saveMultipleEvents(
  newEvents: ScheduleEvent[]
): Promise<void> {
  const events = await getAllEvents();
  events.push(...newEvents);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
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
}

export async function deleteEvent(id: string): Promise<void> {
  const events = await getAllEvents();
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
  const filtered = events.filter((e) => e.seriesId !== seriesId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function deleteFutureInSeries(
  seriesId: string,
  fromDate: string
): Promise<void> {
  const events = await getAllEvents();
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
