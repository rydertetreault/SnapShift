// lib/preferences/announcements.ts
// Tracks one-time, user-dismissible announcement popups. Each announcement has a
// stable id; once dismissed it never shows again. Bump CURRENT_ANNOUNCEMENT_ID
// (and the modal copy) when you want a fresh popup to appear for everyone.
import AsyncStorage from "@react-native-async-storage/async-storage";

export const CURRENT_ANNOUNCEMENT_ID = "v1.2-scanner-upgrade";

const KEY = "@snapshift/announcements-dismissed";

async function getDismissed(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function isAnnouncementDismissed(id: string): Promise<boolean> {
  return (await getDismissed()).includes(id);
}

export async function dismissAnnouncement(id: string): Promise<void> {
  try {
    const seen = await getDismissed();
    if (!seen.includes(id)) {
      seen.push(id);
      await AsyncStorage.setItem(KEY, JSON.stringify(seen));
    }
  } catch {
    // Best-effort; a failed write just means the popup may show again next launch.
  }
}
