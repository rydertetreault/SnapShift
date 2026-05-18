import AsyncStorage from "@react-native-async-storage/async-storage";

const SELECTED_KEY = "ios_calendar_selected_ids";
const MIRROR_ENABLED_KEY = "ios_calendar_mirror_enabled";

export async function getSelectedCalendarIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(SELECTED_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function setSelectedCalendarIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(SELECTED_KEY, JSON.stringify(ids));
}

export async function getMirrorEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(MIRROR_ENABLED_KEY);
  return raw === "true";
}

export async function setMirrorEnabled(value: boolean): Promise<void> {
  await AsyncStorage.setItem(MIRROR_ENABLED_KEY, value ? "true" : "false");
}
