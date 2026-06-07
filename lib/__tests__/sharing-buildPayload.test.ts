// lib/__tests__/sharing-buildPayload.test.ts
import { buildSharedWeek } from "../sharing/buildPayload";
import { ScheduleEvent } from "../types";

const ev = (over: Partial<ScheduleEvent>): ScheduleEvent => ({
  id: Math.random().toString(36).slice(2),
  title: "X",
  date: "2026-06-09",
  startTime: "2026-06-09T09:00:00.000Z",
  endTime: "2026-06-09T17:00:00.000Z",
  category: "other",
  source: "manual",
  createdAt: "2026-06-01T00:00:00.000Z",
  ...over,
});

describe("buildSharedWeek", () => {
  const week = "2026-06-08"; // Monday
  const id = "abc";
  const name = "Emma";

  test("includes work events as detailed shifts", () => {
    const out = buildSharedWeek([ev({ category: "work", title: "Deli" })], week, { id, name });
    expect(out.shifts).toHaveLength(1);
    expect(out.shifts[0]).toMatchObject({ date: "2026-06-09", label: "Deli" });
    expect(out.busy).toHaveLength(0);
  });

  test("non-work events become anonymous busy blocks", () => {
    const out = buildSharedWeek([ev({ category: "personal", title: "Therapy" })], week, { id, name });
    expect(out.busy).toHaveLength(1);
    expect(JSON.stringify(out)).not.toContain("Therapy");
  });

  test("excludes all-day holiday/subscription events from busy", () => {
    const out = buildSharedWeek(
      [ev({ category: "other", allDay: true, subscribed: true, title: "Memorial Day" })],
      week,
      { id, name }
    );
    expect(out.busy).toHaveLength(0);
  });

  test("keeps a user's own all-day event (not subscribed) as busy", () => {
    const out = buildSharedWeek(
      [ev({ category: "personal", allDay: true, subscribed: false, title: "Out of town" })],
      week,
      { id, name }
    );
    expect(out.busy).toHaveLength(1);
    expect(out.busy[0].allDay).toBe(true);
  });

  test("excludes events outside the target week", () => {
    const out = buildSharedWeek(
      [ev({ date: "2026-07-01", startTime: "2026-07-01T09:00:00.000Z", endTime: "2026-07-01T10:00:00.000Z", category: "work" })],
      week,
      { id, name }
    );
    expect(out.shifts).toHaveLength(0);
  });

  test("sets version, id, name, week", () => {
    const out = buildSharedWeek([], week, { id, name });
    expect(out).toMatchObject({ v: 1, id, name, week, shifts: [], busy: [] });
  });
});
