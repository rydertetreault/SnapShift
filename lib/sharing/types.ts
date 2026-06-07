// lib/sharing/types.ts
// Shapes for the schedule-sharing feature. A "shared week" is a snapshot one user
// sends to another via a link; nothing is stored on a server.

export const SHARE_SCHEMA_VERSION = 1;

// A work shift, shared in full detail.
export interface SharedShift {
  date: string; // "YYYY-MM-DD"
  start: string; // "HH:mm" (24h)
  end: string; // "HH:mm"
  label: string; // e.g. "Work" or a department name
}

// A non-work commitment, shared anonymously (no title) so others can see free/busy.
export interface SharedBusy {
  date: string; // "YYYY-MM-DD"
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  allDay?: boolean;
}

// The full payload encoded into a share link.
export interface SharedWeekPayload {
  v: number; // SHARE_SCHEMA_VERSION
  id: string; // stable per-device id of the sharer
  name: string; // sharer's display name
  week: string; // ISO Monday of the shared week ("YYYY-MM-DD")
  shifts: SharedShift[];
  busy: SharedBusy[];
}

// A shared week as stored on the importing device, plus local-only UI state.
export interface SharedPerson {
  id: string;
  name: string;
  week: string;
  shifts: SharedShift[];
  busy: SharedBusy[];
  importedAt: string; // ISO datetime
  hidden?: boolean; // toggled in "Shared with me"
}
