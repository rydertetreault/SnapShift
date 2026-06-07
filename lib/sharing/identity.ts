// lib/sharing/identity.ts
// Stable per-device sharer id + display name (replaces accounts). Stored locally.
import AsyncStorage from "@react-native-async-storage/async-storage";

const ID_KEY = "@snapshift/share-id";
const NAME_KEY = "@snapshift/share-name";

function randomId(): string {
  // Short, URL-safe, collision-resistant enough for family-scale sharing.
  return Array.from({ length: 8 }, () =>
    "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]
  ).join("");
}

export async function getOrCreateShareId(): Promise<string> {
  const existing = await AsyncStorage.getItem(ID_KEY);
  if (existing) return existing;
  const id = randomId();
  await AsyncStorage.setItem(ID_KEY, id);
  return id;
}

export async function getShareName(): Promise<string | null> {
  return AsyncStorage.getItem(NAME_KEY);
}

export async function setShareName(name: string): Promise<void> {
  await AsyncStorage.setItem(NAME_KEY, name.trim());
}
