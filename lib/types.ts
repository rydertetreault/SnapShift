export type EventCategory =
  | "work"
  | "school"
  | "medical"
  | "meeting"
  | "personal"
  | "other";

export type EventSource = "ai" | "manual" | "ios";

export type RecurrenceFrequency =
  | "none"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "custom"; // custom = weekly + specific days-of-week

// 0 = Sunday, 1 = Monday, ..., 6 = Saturday (matches JS Date.getDay())
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Recurrence {
  frequency: RecurrenceFrequency;
  // Only used when frequency === "custom"
  weekdays?: Weekday[];
  // ISO date "YYYY-MM-DD". Omit for indefinite.
  endDate?: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string; // "2026-04-07"
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  category: EventCategory;
  source: EventSource;
  notes?: string;
  createdAt: string;
  // Repeating events share this. Singletons have it undefined.
  seriesId?: string;
  // Stored on every occurrence so we can re-extend indefinite series.
  recurrence?: Recurrence;
  // Set when this event came from iPhone Calendar (source === "ios")
  // OR when this SnapShift event has been mirrored to iPhone Calendar (source === "manual" or "ai").
  // The `source` field tells us which case applies. Used for upsert on re-sync and for deep-link "Open in Calendar".
  iosCalendarEventId?: string;
}

export interface ExtractedShift {
  dayOfWeek: string;
  date: string;
  startTime: string;
  endTime: string;
  department?: string;
}
