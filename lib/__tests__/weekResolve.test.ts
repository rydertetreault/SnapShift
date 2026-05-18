import { inferWeekStartFromDayNumbers, resolveDates } from "../ocr/weekResolve";
import { ExtractedShift } from "../types";

describe("inferWeekStartFromDayNumbers", () => {
  test("picks the most recent week whose Saturday matches the day number", () => {
    const today = new Date("2026-05-18");
    const result = inferWeekStartFromDayNumbers({ saturday: 16 }, today);
    expect(result).toBe("2026-05-16");
  });

  test("picks the upcoming week when the Sat number is in the future", () => {
    const today = new Date("2026-05-18");
    const result = inferWeekStartFromDayNumbers({ saturday: 23 }, today);
    expect(result).toBe("2026-05-23");
  });

  test("uses Monday/Wednesday/etc if Saturday number is missing", () => {
    const today = new Date("2026-05-18");
    const result = inferWeekStartFromDayNumbers({ monday: 18 }, today);
    expect(result).toBe("2026-05-16");
  });

  test("disambiguates by picking the week closest to today", () => {
    const today = new Date("2026-05-18");
    // Closest Saturday in 2026 whose day-of-month is 1 is 2026-08-01
    // (May 1 2026 is a Friday, not a Saturday).
    const result = inferWeekStartFromDayNumbers({ saturday: 1 }, today);
    expect(result).toBe("2026-08-01");
  });

  test("returns null when no day numbers available", () => {
    const today = new Date("2026-05-18");
    const result = inferWeekStartFromDayNumbers({}, today);
    expect(result).toBeNull();
  });
});

describe("resolveDates", () => {
  test("maps Sat-Fri day-of-week shifts to actual dates from week start", () => {
    const shifts: ExtractedShift[] = [
      { dayOfWeek: "Monday", date: "", startTime: "9:00 AM", endTime: "5:00 PM" },
      { dayOfWeek: "Friday", date: "", startTime: "9:00 AM", endTime: "5:00 PM" },
    ];
    const resolved = resolveDates(shifts, "2026-05-16");
    expect(resolved[0].date).toBe("2026-05-18");
    expect(resolved[1].date).toBe("2026-05-22");
  });

  test("preserves existing date if shift already has one (vision path)", () => {
    const shifts: ExtractedShift[] = [
      { dayOfWeek: "Monday", date: "2026-05-25", startTime: "9:00 AM", endTime: "5:00 PM" },
    ];
    const resolved = resolveDates(shifts, "2026-05-16");
    expect(resolved[0].date).toBe("2026-05-25");
  });
});
