// lib/sharing/mergeBusy.ts
import { SharedBusy } from "./types";

// Merge overlapping or touching busy ranges within each day. Input order-agnostic;
// output sorted by date then start.
export function mergeBusy(blocks: SharedBusy[]): SharedBusy[] {
  const sorted = [...blocks].sort((a, b) =>
    a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)
  );
  const out: SharedBusy[] = [];
  for (const cur of sorted) {
    const last = out[out.length - 1];
    if (last && last.date === cur.date && cur.start <= last.end && !last.allDay && !cur.allDay) {
      if (cur.end > last.end) last.end = cur.end;
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}
