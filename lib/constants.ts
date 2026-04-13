import { EventCategory } from "./types";

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  work: "#4CAF50",
  school: "#2196F3",
  medical: "#F44336",
  meeting: "#9C27B0",
  personal: "#FF9800",
  other: "#9E9E9E",
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  work: "Work",
  school: "School",
  medical: "Medical",
  meeting: "Meeting",
  personal: "Personal",
  other: "Other",
};

export const ALL_CATEGORIES: EventCategory[] = [
  "work",
  "school",
  "medical",
  "meeting",
  "personal",
  "other",
];

export const STORAGE_KEY = "screen_schedule_events";
