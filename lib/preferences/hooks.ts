// lib/preferences/hooks.ts
import { useEffect, useState } from "react";
import {
  Appearance,
  DEFAULT_APPEARANCE,
  getAppearance,
  subscribeAppearance,
} from "./appearance";
import {
  CategoryOverrides,
  getCategoryOverrides,
  subscribeCategories,
} from "./categories";
import {
  DefaultShift,
  DEFAULT_DEFAULT_SHIFT,
  getDefaultShift,
  subscribeDefaultShift,
} from "./defaultShift";

export function useAppearance(): Appearance {
  const [value, setValue] = useState<Appearance>(DEFAULT_APPEARANCE);
  useEffect(() => {
    let alive = true;
    const refresh = () => getAppearance().then((v) => { if (alive) setValue(v); });
    const unsub = subscribeAppearance(refresh);
    refresh();
    return () => { alive = false; unsub(); };
  }, []);
  return value;
}

export function useCategoryOverrides(): CategoryOverrides {
  const [value, setValue] = useState<CategoryOverrides>({});
  useEffect(() => {
    let alive = true;
    const refresh = () => getCategoryOverrides().then((v) => { if (alive) setValue(v); });
    const unsub = subscribeCategories(refresh);
    refresh();
    return () => { alive = false; unsub(); };
  }, []);
  return value;
}

export function useDefaultShift(): DefaultShift {
  const [value, setValue] = useState<DefaultShift>(DEFAULT_DEFAULT_SHIFT);
  useEffect(() => {
    let alive = true;
    const refresh = () => getDefaultShift().then((v) => { if (alive) setValue(v); });
    const unsub = subscribeDefaultShift(refresh);
    refresh();
    return () => { alive = false; unsub(); };
  }, []);
  return value;
}
