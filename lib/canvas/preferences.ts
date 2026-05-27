import AsyncStorage from "@react-native-async-storage/async-storage";

const FEED_URL_KEY = "@snapshift/canvas/feedUrl";
const LAST_SYNC_KEY = "@snapshift/canvas/lastSyncedAt";

export async function getCanvasFeedUrl(): Promise<string | null> {
  return AsyncStorage.getItem(FEED_URL_KEY);
}

export async function setCanvasFeedUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(FEED_URL_KEY, url);
}

export async function clearCanvasFeedUrl(): Promise<void> {
  await AsyncStorage.multiRemove([FEED_URL_KEY, LAST_SYNC_KEY]);
}

export async function getCanvasLastSyncedAt(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNC_KEY);
}

export async function setCanvasLastSyncedAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_KEY, iso);
}

// Canvas feed URLs look like https://<institution>.instructure.com/feeds/calendars/user_<hash>.ics
// We're lenient on host (custom domains exist) but require the .ics path or feeds/calendars segment.
export function looksLikeCanvasFeedUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return /\.ics(\?|$)/i.test(trimmed) || /\/feeds\/calendars\//i.test(trimmed);
}
