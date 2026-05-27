// lib/preferences/categories.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import { EventCategory } from "@/lib/types";
import { CategoryOverrides } from "./types";

const KEY = "@snapshift/categories";

export async function getCategoryOverrides(): Promise<CategoryOverrides> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function setCategoryOverrides(next: CategoryOverrides): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  emit();
}

export function resolveCategory(
  key: EventCategory,
  overrides: CategoryOverrides
): { name: string; color: string } {
  const o = overrides[key];
  return {
    name: o?.name ?? CATEGORY_LABELS[key],
    color: o?.color ?? CATEGORY_COLORS[key],
  };
}

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() { listeners.forEach((l) => l()); }
export function subscribeCategories(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export type { CategoryOverrides };
