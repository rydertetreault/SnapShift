// lib/__tests__/colorRules.test.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ColorRule,
  findMatchingRule,
  setColorRule,
  getColorRules,
  removeColorRule,
} from "../colors/rules";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

const r = (over: Partial<ColorRule>): ColorRule => ({
  id: "x",
  matchTitle: "Standup",
  color: "#ff0000",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("findMatchingRule", () => {
  test("matches title case-insensitively, trimmed", () => {
    const rule = r({ matchTitle: "Standup" });
    expect(findMatchingRule([rule], { title: "  STANDUP " })).toEqual(rule);
  });

  test("prefers title+calendar over title-only", () => {
    const titleOnly = r({ id: "t", matchTitle: "Job", color: "#aaaaaa" });
    const specific = r({
      id: "s",
      matchTitle: "Job",
      matchCalendarId: "cal-1",
      color: "#bbbbbb",
    });
    expect(
      findMatchingRule([titleOnly, specific], { title: "Job", iosCalendarId: "cal-1" })
    ).toEqual(specific);
  });

  test("falls back to title-only when calendar doesn't match", () => {
    const titleOnly = r({ id: "t", matchTitle: "Job", color: "#aaaaaa" });
    const specific = r({
      id: "s",
      matchTitle: "Job",
      matchCalendarId: "cal-1",
      color: "#bbbbbb",
    });
    expect(
      findMatchingRule([titleOnly, specific], { title: "Job", iosCalendarId: "cal-2" })
    ).toEqual(titleOnly);
  });

  test("returns null when no rule matches", () => {
    expect(findMatchingRule([r({ matchTitle: "X" })], { title: "Y" })).toBeNull();
  });
});

describe("setColorRule / getColorRules", () => {
  test("creates a new rule", async () => {
    const created = await setColorRule({ matchTitle: "Standup", color: "#f00" });
    const rules = await getColorRules();
    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual(created);
  });

  test("upserts: same title+calendar replaces the existing rule", async () => {
    const a = await setColorRule({ matchTitle: "Standup", color: "#f00" });
    const b = await setColorRule({ matchTitle: "Standup", color: "#0f0" });
    const rules = await getColorRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe(a.id); // same record, color updated
    expect(rules[0].color).toBe("#0f0");
    expect(b.id).toBe(a.id);
  });

  test("treats different calendar ids as distinct rules", async () => {
    await setColorRule({ matchTitle: "Standup", color: "#f00" });
    await setColorRule({
      matchTitle: "Standup",
      matchCalendarId: "cal-1",
      color: "#0f0",
    });
    expect(await getColorRules()).toHaveLength(2);
  });

  test("removeColorRule deletes by id", async () => {
    const a = await setColorRule({ matchTitle: "A", color: "#f00" });
    await setColorRule({ matchTitle: "B", color: "#0f0" });
    await removeColorRule(a.id);
    const rules = await getColorRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].matchTitle).toBe("B");
  });

  test("rejects empty title", async () => {
    await expect(setColorRule({ matchTitle: "  ", color: "#f00" })).rejects.toThrow();
  });
});
