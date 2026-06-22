// lib/calendar/throttledSync.ts
// Lightweight throttle around the read/mirror sync calls. The weekly view (and
// other surfaces) can call this on focus without worrying about hammering the
// iOS Calendar APIs or re-mirroring on every tab switch. Defaults to once per
// 60 seconds; callers can pass a different interval if they want.
//
// v1.2.1 backstops "edits in iPhone Calendar take a long time to appear in
// SnapShift" — previously sync only fired on cold start and AppState=active.
import { syncIosCalendars } from "./sync";
import { mirrorSnapShiftEvents } from "./mirror";
import { Sentry } from "../sentry";

let lastReadSync = 0;
let lastMirror = 0;

const DEFAULT_INTERVAL_MS = 60_000;

/**
 * Re-sync iPhone Calendar reads and SnapShift→iOS writes if it's been longer
 * than `intervalMs` since the last call. Safe to call on every focus; cheap
 * when throttled out. Errors are swallowed (and reported to Sentry) so a
 * sync failure never breaks navigation.
 */
export function maybeResyncCalendars(intervalMs: number = DEFAULT_INTERVAL_MS): void {
  const now = Date.now();
  if (now - lastReadSync >= intervalMs) {
    lastReadSync = now;
    syncIosCalendars().catch((e) =>
      Sentry.captureException(e, { tags: { feature: "calendar.throttledSync.read" } })
    );
  }
  if (now - lastMirror >= intervalMs) {
    lastMirror = now;
    mirrorSnapShiftEvents().catch((e) =>
      Sentry.captureException(e, { tags: { feature: "calendar.throttledSync.mirror" } })
    );
  }
}

/** Force the next maybeResyncCalendars call to run immediately. */
export function invalidateSyncThrottle(): void {
  lastReadSync = 0;
  lastMirror = 0;
}
