import { applyDefaultShift } from "../upload/applyDefaultShift";
import { ExtractedShift } from "../types";
import { DefaultShift } from "../preferences/types";

const baseShift = (overrides: Partial<ExtractedShift> = {}): ExtractedShift => ({
  dayOfWeek: "Monday",
  date: "2026-05-25",
  startTime: "8:00 AM",
  endTime: "4:00 PM",
  ...overrides,
});

describe("applyDefaultShift", () => {
  test("returns shifts unchanged when override disabled", () => {
    const shifts = [baseShift()];
    const override: DefaultShift = { enabled: false, startTime: "07:00", endTime: "19:00" };
    expect(applyDefaultShift(shifts, override)).toEqual(shifts);
  });

  test("overrides start and end on every shift when enabled", () => {
    const shifts = [baseShift(), baseShift({ dayOfWeek: "Tuesday" })];
    const override: DefaultShift = { enabled: true, startTime: "07:00", endTime: "19:00" };
    const result = applyDefaultShift(shifts, override);
    expect(result[0].startTime).toBe("7:00 AM");
    expect(result[0].endTime).toBe("7:00 PM");
    expect(result[1].startTime).toBe("7:00 AM");
    expect(result[1].endTime).toBe("7:00 PM");
  });

  test("preserves all-day shifts (does not overwrite their sentinel times)", () => {
    const shifts = [baseShift({ allDay: true, startTime: "12:00 AM", endTime: "11:59 PM" })];
    const override: DefaultShift = { enabled: true, startTime: "07:00", endTime: "19:00" };
    const result = applyDefaultShift(shifts, override);
    expect(result[0].allDay).toBe(true);
    expect(result[0].startTime).toBe("12:00 AM");
    expect(result[0].endTime).toBe("11:59 PM");
  });

  test("preserves date and department fields", () => {
    const shifts = [baseShift({ department: "Deli" })];
    const override: DefaultShift = { enabled: true, startTime: "07:00", endTime: "19:00" };
    const result = applyDefaultShift(shifts, override);
    expect(result[0].date).toBe("2026-05-25");
    expect(result[0].department).toBe("Deli");
  });
});
