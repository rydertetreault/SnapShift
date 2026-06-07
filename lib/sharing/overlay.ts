// lib/sharing/overlay.ts
import { SharedPerson } from "./types";

export interface OverlayBlock {
  personId: string;
  name: string;
  kind: "work" | "busy";
  start: string;
  end: string;
  label?: string;
}

export function overlayBlocksForDay(people: SharedPerson[], dateStr: string): OverlayBlock[] {
  const out: OverlayBlock[] = [];
  for (const p of people) {
    if (p.hidden) continue;
    for (const s of p.shifts) {
      if (s.date === dateStr)
        out.push({ personId: p.id, name: p.name, kind: "work", start: s.start, end: s.end, label: s.label });
    }
    for (const b of p.busy) {
      if (b.date === dateStr)
        out.push({ personId: p.id, name: p.name, kind: "busy", start: b.start, end: b.end });
    }
  }
  return out;
}
