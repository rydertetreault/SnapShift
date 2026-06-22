// lib/sharing/store.ts
// Persisted list of imported people. All list logic lives in peopleReducer (tested).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SharedPerson, SharedWeekPayload } from "./types";
import {
  upsertPerson,
  removePerson,
  setPersonHidden,
  setPersonColor,
} from "./peopleReducer";

const KEY = "@snapshift/shared-people";

export async function getSharedPeople(): Promise<SharedPerson[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function write(people: SharedPerson[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(people));
}

export async function importSharedWeek(payload: SharedWeekPayload): Promise<void> {
  const people = await getSharedPeople();
  await write(upsertPerson(people, payload, new Date().toISOString()));
}

export async function deleteSharedPerson(id: string): Promise<void> {
  await write(removePerson(await getSharedPeople(), id));
}

export async function setSharedPersonHidden(id: string, hidden: boolean): Promise<void> {
  await write(setPersonHidden(await getSharedPeople(), id, hidden));
}

export async function setSharedPersonColor(
  id: string,
  color: string | undefined
): Promise<void> {
  await write(setPersonColor(await getSharedPeople(), id, color));
}
