// lib/preferences/types.ts
import { EventCategory } from "@/lib/types";

export type AppearanceMode = "system" | "light" | "dark";

export interface Appearance {
  mode: AppearanceMode;
  accent: string; // hex from ACCENT_PALETTE
}

export interface CategoryOverride {
  name?: string;
  color?: string;
}

export type CategoryOverrides = Partial<Record<EventCategory, CategoryOverride>>;

export interface DefaultShift {
  enabled: boolean;
  startTime: string; // "HH:mm" 24h
  endTime: string; // "HH:mm" 24h
}
