// lib/__tests__/sharing-mergeBusy.test.ts
import { mergeBusy } from "../sharing/mergeBusy";
import { SharedBusy } from "../sharing/types";

const b = (date: string, start: string, end: string): SharedBusy => ({ date, start, end });

describe("mergeBusy", () => {
  test("merges overlapping ranges on the same day", () => {
    expect(mergeBusy([b("2026-06-09", "18:00", "20:00"), b("2026-06-09", "19:00", "21:00")]))
      .toEqual([b("2026-06-09", "18:00", "21:00")]);
  });
  test("merges touching ranges", () => {
    expect(mergeBusy([b("2026-06-09", "09:00", "10:00"), b("2026-06-09", "10:00", "11:00")]))
      .toEqual([b("2026-06-09", "09:00", "11:00")]);
  });
  test("keeps non-overlapping ranges separate and sorted", () => {
    expect(mergeBusy([b("2026-06-09", "13:00", "14:00"), b("2026-06-09", "09:00", "10:00")]))
      .toEqual([b("2026-06-09", "09:00", "10:00"), b("2026-06-09", "13:00", "14:00")]);
  });
  test("does not merge across different days", () => {
    expect(mergeBusy([b("2026-06-09", "09:00", "23:00"), b("2026-06-10", "00:00", "08:00")]))
      .toEqual([b("2026-06-09", "09:00", "23:00"), b("2026-06-10", "00:00", "08:00")]);
  });
  test("preserves allDay flag", () => {
    const all: SharedBusy = { date: "2026-06-09", start: "00:00", end: "23:59", allDay: true };
    expect(mergeBusy([all])).toEqual([all]);
  });
});
