import { ScheduleEvent } from "../types";
import { upsertCanvasEvents } from "../storage";
import { fetchCanvasFeed } from "./feed";
import { IcsEvent } from "./ics";
import {
  getCanvasFeedUrl,
  setCanvasLastSyncedAt,
} from "./preferences";

export interface CanvasSyncResult {
  imported: number;
  skippedNoUrl: boolean;
}

// Maps a parsed ICS event into SnapShift's ScheduleEvent.
// All-day events get 00:00 → 23:59 local on the start date and `allDay: true`.
function toScheduleEvent(e: IcsEvent, now: string): ScheduleEvent {
  let date: string;
  let startTime: string;
  let endTime: string;
  if (e.allDay) {
    date = e.start;
    startTime = `${e.start}T00:00:00`;
    endTime = `${e.start}T23:59:00`;
  } else {
    date = e.start.slice(0, 10);
    startTime = e.start;
    endTime = e.end;
  }
  return {
    id: `canvas:${e.uid}`,
    title: e.summary,
    date,
    startTime,
    endTime,
    category: "school",
    source: "canvas",
    createdAt: now,
    allDay: e.allDay,
    externalId: e.uid,
    externalUrl: e.url,
  };
}

export async function syncCanvas(): Promise<CanvasSyncResult> {
  const url = await getCanvasFeedUrl();
  if (!url) return { imported: 0, skippedNoUrl: true };

  const icsEvents = await fetchCanvasFeed(url);
  const now = new Date().toISOString();
  const mapped = icsEvents.map((e) => toScheduleEvent(e, now));
  await upsertCanvasEvents(mapped);
  await setCanvasLastSyncedAt(now);
  return { imported: mapped.length, skippedNoUrl: false };
}

// One-shot sync used during onboarding: stores the URL first, then syncs.
// Returns the import count or throws if the feed is unreachable / unparseable.
export async function connectCanvas(url: string): Promise<number> {
  const icsEvents = await fetchCanvasFeed(url);
  const now = new Date().toISOString();
  const mapped = icsEvents.map((e) => toScheduleEvent(e, now));
  await upsertCanvasEvents(mapped);
  const { setCanvasFeedUrl } = await import("./preferences");
  await setCanvasFeedUrl(url);
  await setCanvasLastSyncedAt(now);
  return mapped.length;
}
