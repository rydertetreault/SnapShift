// lib/colors/calendarDefaults.ts
// Per-iOS-calendar default color. Applied to events whose source === "ios"
// that don't have a more specific title-based rule. Lives in its own key so
// it stays cheap to read on render. Also exposes a tiny pub/sub.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@snapshift/calendar-default-colors";

export type CalendarColorMap = Record<string, string>;

export async function getCalendarDefaults(): Promise<CalendarColorMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function setCalendarDefault(
  calendarId: string,
  color: string | undefined
): Promise<void> {
  const map = await getCalendarDefaults();
  if (color === undefined) {
    delete map[calendarId];
  } else {
    map[calendarId] = color;
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
  emit();
}

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() { listeners.forEach((l) => l()); }
export function subscribeCalendarDefaults(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
