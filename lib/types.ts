export type EventCategory =
  | "work"
  | "school"
  | "medical"
  | "meeting"
  | "personal"
  | "other";

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string; // "2026-04-07"
  startTime: string; // ISO datetime: "2026-04-07T14:00:00"
  endTime: string; // ISO datetime: "2026-04-07T22:30:00"
  category: EventCategory;
  source: "ai" | "manual";
  notes?: string;
  createdAt: string; // ISO datetime
}

export interface ExtractedShift {
  dayOfWeek: string; // "Monday", "Tuesday", etc.
  date: string; // resolved to actual date: "2026-04-07"
  startTime: string; // "2:00 PM"
  endTime: string; // "10:30 PM"
  department?: string;
}
