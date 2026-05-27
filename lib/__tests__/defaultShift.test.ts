import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_DEFAULT_SHIFT,
  getDefaultShift,
  setDefaultShift,
} from "../preferences/defaultShift";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

describe("defaultShift preferences", () => {
  beforeEach(() => AsyncStorage.clear());

  test("returns default when empty", async () => {
    const r = await getDefaultShift();
    expect(r).toEqual(DEFAULT_DEFAULT_SHIFT);
    expect(r.enabled).toBe(false);
    expect(r.startTime).toBe("09:00");
    expect(r.endTime).toBe("17:00");
  });

  test("round-trips a set value", async () => {
    await setDefaultShift({ enabled: true, startTime: "07:00", endTime: "19:00" });
    const r = await getDefaultShift();
    expect(r).toEqual({ enabled: true, startTime: "07:00", endTime: "19:00" });
  });

  test("malformed storage falls back to default", async () => {
    await AsyncStorage.setItem("@snapshift/defaultShift", "nope");
    expect(await getDefaultShift()).toEqual(DEFAULT_DEFAULT_SHIFT);
  });

  test("invalid time format falls back to default", async () => {
    await AsyncStorage.setItem(
      "@snapshift/defaultShift",
      JSON.stringify({ enabled: true, startTime: "bad", endTime: "17:00" })
    );
    expect(await getDefaultShift()).toEqual(DEFAULT_DEFAULT_SHIFT);
  });
});
