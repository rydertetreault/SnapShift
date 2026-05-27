// lib/preferences/defaultShift.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultShift } from "./types";

const KEY = "@snapshift/defaultShift";

export const DEFAULT_DEFAULT_SHIFT: DefaultShift = {
  enabled: false,
  startTime: "09:00",
  endTime: "17:00",
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValid(v: any): v is DefaultShift {
  return (
    v &&
    typeof v === "object" &&
    typeof v.enabled === "boolean" &&
    typeof v.startTime === "string" &&
    typeof v.endTime === "string" &&
    TIME_RE.test(v.startTime) &&
    TIME_RE.test(v.endTime)
  );
}

export async function getDefaultShift(): Promise<DefaultShift> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_DEFAULT_SHIFT;
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : DEFAULT_DEFAULT_SHIFT;
  } catch {
    return DEFAULT_DEFAULT_SHIFT;
  }
}

export async function setDefaultShift(next: DefaultShift): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  emit();
}

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() { listeners.forEach((l) => l()); }
export function subscribeDefaultShift(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export type { DefaultShift };
