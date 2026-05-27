// lib/preferences/appearance.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, AppearanceMode } from "./types";

const KEY = "@snapshift/appearance";

export const ACCENT_PALETTE = [
  "#4CAF50", // green (default)
  "#2196F3", // blue
  "#9C27B0", // purple
  "#F44336", // red
  "#FF9800", // orange
  "#FFC107", // amber
  "#009688", // teal
  "#3F51B5", // indigo
  "#E91E63", // pink
  "#795548", // brown
  "#607D8B", // blue-grey
  "#000000", // mono
] as const;

export const DEFAULT_APPEARANCE: Appearance = {
  mode: "system",
  accent: "#4CAF50",
};

function isValid(v: any): v is Appearance {
  return (
    v &&
    typeof v === "object" &&
    (v.mode === "system" || v.mode === "light" || v.mode === "dark") &&
    typeof v.accent === "string" &&
    /^#[0-9A-F]{6}$/i.test(v.accent)
  );
}

export async function getAppearance(): Promise<Appearance> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : DEFAULT_APPEARANCE;
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export async function setAppearance(next: Appearance): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  emit();
}

// Tiny pub/sub for hook subscribers (used in Task 5).
type Listener = () => void;
const listeners = new Set<Listener>();
function emit() { listeners.forEach((l) => l()); }
export function subscribeAppearance(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export type { Appearance, AppearanceMode };
