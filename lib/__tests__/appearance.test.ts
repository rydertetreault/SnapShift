import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ACCENT_PALETTE,
  getAppearance,
  setAppearance,
  DEFAULT_APPEARANCE,
} from "../preferences/appearance";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

describe("appearance preferences", () => {
  beforeEach(() => AsyncStorage.clear());

  test("returns default when storage is empty", async () => {
    const result = await getAppearance();
    expect(result).toEqual(DEFAULT_APPEARANCE);
    expect(result.accent).toBe("#4CAF50");
    expect(result.mode).toBe("system");
  });

  test("round-trips a set value", async () => {
    await setAppearance({ mode: "dark", accent: ACCENT_PALETTE[1] });
    const result = await getAppearance();
    expect(result.mode).toBe("dark");
    expect(result.accent).toBe(ACCENT_PALETTE[1]);
  });

  test("returns default when stored JSON is malformed", async () => {
    await AsyncStorage.setItem("@snapshift/appearance", "{not json");
    const result = await getAppearance();
    expect(result).toEqual(DEFAULT_APPEARANCE);
  });

  test("returns default when stored value is missing required fields", async () => {
    await AsyncStorage.setItem("@snapshift/appearance", JSON.stringify({}));
    const result = await getAppearance();
    expect(result).toEqual(DEFAULT_APPEARANCE);
  });

  test("preset palette contains 12 unique hex values", () => {
    expect(ACCENT_PALETTE).toHaveLength(12);
    const unique = new Set(ACCENT_PALETTE);
    expect(unique.size).toBe(12);
    ACCENT_PALETTE.forEach((c) => expect(c).toMatch(/^#[0-9A-F]{6}$/i));
  });
});
