export type EventCategory =
  | "work"
  | "school"
  | "medical"
  | "meeting"
  | "personal"
  | "other";

export type EventSource = "ai" | "manual" | "ios" | "canvas";

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
  // True when the event is an all-day work marker with no specific time
  // (e.g. detected from a monthly grid OCR). UI hides time, EventKit mirror sets allDay.
  allDay?: boolean;
  // For source === "canvas": the ICS UID, used as the stable key for upserts.
  externalId?: string;
  // For source === "canvas": the assignment/event URL in Canvas, opens in browser.
  externalUrl?: string;
  // True when this event came from an iOS holiday/birthday/subscription calendar.
  // Such all-day events are excluded from shared "busy" blocks.
  subscribed?: boolean;
  // Scheduled break windows within a work shift (e.g. Publix "Meal" breaks).
  // ISO datetimes. Optional — only populated when the source schedule shows them.
  breaks?: ShiftBreak[];
  // Time-segmented role assignments within a single shift
  // (e.g. Publix "Cashier 12-5, Customer Service Staff 5-9:15").
  // Optional — only populated when the source schedule shows role changes mid-shift.
  segments?: ShiftSegment[];
}

export interface ShiftBreak {
  start: string; // ISO datetime
  end: string;   // ISO datetime
  label?: string; // e.g. "Meal", "Break"
}

export interface ShiftSegment {
  start: string; // ISO datetime
  end: string;   // ISO datetime
  role: string;  // e.g. "Cashier", "Customer Service Staff"
}

export interface ExtractedShift {
  dayOfWeek: string;
  date: string;
  startTime: string;
  endTime: string;
  department?: string;
  // True when the source schedule had no specific times (e.g. monthly marker grid).
  // startTime/endTime will be placeholder sentinel values in that case.
  allDay?: boolean;
  // Break windows as human-readable times ("11:30 AM" / "12:00 PM") — converted
  // to ISO datetimes when the shift is materialized into a ScheduleEvent.
  breaks?: ExtractedBreak[];
  // Role segments as human-readable times. When present, the joined role names
  // become the event title (e.g. "Cashier · Customer Service Staff").
  segments?: ExtractedSegment[];
}

export interface ExtractedBreak {
  startTime: string; // "11:30 AM"
  endTime: string;   // "12:00 PM"
  label?: string;
}

export interface ExtractedSegment {
  startTime: string; // "12:00 PM"
  endTime: string;   // "5:00 PM"
  role: string;
}
