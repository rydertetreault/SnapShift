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
