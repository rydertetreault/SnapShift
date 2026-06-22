// lib/sharing/peopleReducer.ts
import { SharedPerson, SharedWeekPayload } from "./types";

export function upsertPerson(
  people: SharedPerson[],
  payload: SharedWeekPayload,
  importedAt: string
): SharedPerson[] {
  const existing = people.find((p) => p.id === payload.id);
  const next: SharedPerson = {
    id: payload.id,
    name: payload.name,
    week: payload.week,
    shifts: payload.shifts,
    busy: payload.busy,
    importedAt,
    // Preserve local-only UI state across re-imports.
    hidden: existing?.hidden,
    color: existing?.color,
  };
  if (existing) return people.map((p) => (p.id === payload.id ? next : p));
  return [...people, next];
}

export function removePerson(people: SharedPerson[], id: string): SharedPerson[] {
  return people.filter((p) => p.id !== id);
}

export function setPersonHidden(
  people: SharedPerson[],
  id: string,
  hidden: boolean
): SharedPerson[] {
  return people.map((p) => (p.id === id ? { ...p, hidden } : p));
}

export function setPersonColor(
  people: SharedPerson[],
  id: string,
  color: string | undefined
): SharedPerson[] {
  return people.map((p) => (p.id === id ? { ...p, color } : p));
}
