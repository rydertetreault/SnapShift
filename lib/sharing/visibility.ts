// lib/sharing/visibility.ts
// Tiny on/off switch persisted across launches: should the imported shared
// schedules be drawn on the weekly view at all? Defaults to true so existing
// users see no behavior change after upgrading.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@snapshift/overlay-enabled";

export async function getOverlayEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY);
  // null (never set) → default true. Any explicit "false" disables.
  return raw === null ? true : raw === "true";
}

export async function setOverlayEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, enabled ? "true" : "false");
}
