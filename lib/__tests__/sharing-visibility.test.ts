// lib/__tests__/sharing-visibility.test.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getOverlayEnabled, setOverlayEnabled } from "../sharing/visibility";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("overlay visibility", () => {
  test("defaults to true when never set", async () => {
    expect(await getOverlayEnabled()).toBe(true);
  });

  test("round-trips false", async () => {
    await setOverlayEnabled(false);
    expect(await getOverlayEnabled()).toBe(false);
  });

  test("round-trips true after being false", async () => {
    await setOverlayEnabled(false);
    await setOverlayEnabled(true);
    expect(await getOverlayEnabled()).toBe(true);
  });
});
