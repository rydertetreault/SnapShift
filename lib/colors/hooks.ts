// lib/colors/hooks.ts
// Tiny hook bundle that subscribes to all three color sources at once so a
// render-time call to resolveEventColor reflects the latest user changes
// without a full Context tree.
import { useEffect, useState } from "react";
import { getColorRules, subscribeColorRules, ColorRule } from "./rules";
import {
  getCalendarDefaults,
  subscribeCalendarDefaults,
  CalendarColorMap,
} from "./calendarDefaults";

export function useColorRules(): ColorRule[] {
  const [rules, setRules] = useState<ColorRule[]>([]);
  useEffect(() => {
    let mounted = true;
    getColorRules().then((r) => mounted && setRules(r));
    const unsub = subscribeColorRules(() => {
      getColorRules().then((r) => mounted && setRules(r));
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);
  return rules;
}

export function useCalendarDefaults(): CalendarColorMap {
  const [defaults, setDefaults] = useState<CalendarColorMap>({});
  useEffect(() => {
    let mounted = true;
    getCalendarDefaults().then((m) => mounted && setDefaults(m));
    const unsub = subscribeCalendarDefaults(() => {
      getCalendarDefaults().then((m) => mounted && setDefaults(m));
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);
  return defaults;
}
