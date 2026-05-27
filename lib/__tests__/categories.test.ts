import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getCategoryOverrides,
  setCategoryOverrides,
  resolveCategory,
} from "../preferences/categories";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

describe("category preferences", () => {
  beforeEach(() => AsyncStorage.clear());

  test("returns empty object when storage is empty", async () => {
    expect(await getCategoryOverrides()).toEqual({});
  });

  test("round-trips an override", async () => {
    await setCategoryOverrides({ work: { name: "Hospital", color: "#2196F3" } });
    const result = await getCategoryOverrides();
    expect(result.work?.name).toBe("Hospital");
    expect(result.work?.color).toBe("#2196F3");
  });

  test("resolveCategory returns hardcoded default when no override", () => {
    const r = resolveCategory("work", {});
    expect(r.name).toBe("Work");
    expect(r.color).toBe("#4CAF50");
  });

  test("resolveCategory merges name-only override with default color", () => {
    const r = resolveCategory("work", { work: { name: "Hospital" } });
    expect(r.name).toBe("Hospital");
    expect(r.color).toBe("#4CAF50");
  });

  test("resolveCategory merges color-only override with default name", () => {
    const r = resolveCategory("work", { work: { color: "#000000" } });
    expect(r.name).toBe("Work");
    expect(r.color).toBe("#000000");
  });

  test("malformed storage falls back to empty overrides", async () => {
    await AsyncStorage.setItem("@snapshift/categories", "garbage");
    expect(await getCategoryOverrides()).toEqual({});
  });
});
