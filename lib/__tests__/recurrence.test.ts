import { expandRecurrence, MATERIALIZE_HORIZON_DAYS } from "../recurrence";

describe("expandRecurrence", () => {
  test("returns just the seed when frequency is none", () => {
    const dates = expandRecurrence("2026-05-18", { frequency: "none" });
    expect(dates).toEqual(["2026-05-18"]);
  });

  test("daily repeats produce one date per day until horizon", () => {
    const dates = expandRecurrence("2026-05-18", {
      frequency: "daily",
      endDate: "2026-05-22",
    });
    expect(dates).toEqual([
      "2026-05-18",
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
      "2026-05-22",
    ]);
  });

  test("weekly with no end date materializes ~1 year of occurrences", () => {
    const dates = expandRecurrence("2026-05-18", { frequency: "weekly" });
    expect(dates.length).toBeGreaterThanOrEqual(52);
    expect(dates.length).toBeLessThanOrEqual(53);
    expect(dates[0]).toBe("2026-05-18");
    // Each step is exactly 7 days
    expect(dates[1]).toBe("2026-05-25");
  });

  test("biweekly produces every-14-day occurrences", () => {
    const dates = expandRecurrence("2026-05-18", {
      frequency: "biweekly",
      endDate: "2026-07-13",
    });
    expect(dates).toEqual([
      "2026-05-18",
      "2026-06-01",
      "2026-06-15",
      "2026-06-29",
      "2026-07-13",
    ]);
  });

  test("monthly keeps the same day-of-month, skipping months that don't have it", () => {
    const dates = expandRecurrence("2026-01-31", {
      frequency: "monthly",
      endDate: "2026-04-30",
    });
    // Feb has no 31st (skip rather than spilling to Mar 3).
    // Apr has no 31st either, so even though endDate is Apr 30, no Apr occurrence emits.
    // End date is a cutoff, not a forced final occurrence (matches Apple Calendar behavior).
    expect(dates).toEqual(["2026-01-31", "2026-03-31"]);
  });

  test("custom weekly with specific weekdays (boss-meeting case: Wed + Fri)", () => {
    // 2026-05-18 is a Monday. We want occurrences on Wed and Fri of every week.
    const dates = expandRecurrence("2026-05-18", {
      frequency: "custom",
      weekdays: [3, 5], // Wed, Fri
      endDate: "2026-05-29",
    });
    // First Wed after Mon 5/18 is 5/20. Then 5/22 (Fri), 5/27 (Wed), 5/29 (Fri).
    expect(dates).toEqual([
      "2026-05-20",
      "2026-05-22",
      "2026-05-27",
      "2026-05-29",
    ]);
  });

  test("custom mode with seed weekday already in the list includes the seed", () => {
    // Seed is Wed 2026-05-20, weekdays = [3, 5] (Wed, Fri).
    const dates = expandRecurrence("2026-05-20", {
      frequency: "custom",
      weekdays: [3, 5],
      endDate: "2026-05-22",
    });
    expect(dates).toEqual(["2026-05-20", "2026-05-22"]);
  });

  test("indefinite series respects the materialization horizon", () => {
    const dates = expandRecurrence("2026-05-18", { frequency: "daily" });
    expect(dates.length).toBe(MATERIALIZE_HORIZON_DAYS + 1); // includes seed
  });
});
