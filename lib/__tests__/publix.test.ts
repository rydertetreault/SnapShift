import { parseOcrText } from "../ocr/publix";

describe("parseOcrText", () => {
  test("captures day-of-month when day name and number share a line", () => {
    const text = [
      "Mon 6",
      "1:15 p.m. - 10:30 p.m.",
      "Deli Clerk",
    ].join("\n");
    const shifts = parseOcrText(text);
    expect(shifts).toHaveLength(1);
    expect(shifts[0].dayOfWeek).toBe("Monday");
    expect(shifts[0].dayOfMonth).toBe(6);
    expect(shifts[0].startTime).toBe("1:15 PM");
    expect(shifts[0].endTime).toBe("10:30 PM");
    expect(shifts[0].department).toBe("Deli");
  });

  test("captures day-of-month when OCR splits the badge across lines", () => {
    const text = [
      "Mon",
      "6",
      "1:15 p.m. - 10:30 p.m.",
      "Deli Clerk",
      "Store #0526",
    ].join("\n");
    const shifts = parseOcrText(text);
    expect(shifts).toHaveLength(1);
    expect(shifts[0].dayOfWeek).toBe("Monday");
    expect(shifts[0].dayOfMonth).toBe(6);
  });

  test("captures day-of-month when an empty line sits between name and number", () => {
    const text = [
      "Wed",
      "",
      "8",
      "5 a.m. - 2 p.m.",
    ].join("\n");
    const shifts = parseOcrText(text);
    expect(shifts).toHaveLength(1);
    expect(shifts[0].dayOfMonth).toBe(8);
  });

  test("does not mistake the start-time hour for the day-of-month", () => {
    const text = [
      "Mon",
      "1:15 p.m. - 10:30 p.m.",
      "Deli Clerk",
    ].join("\n");
    const shifts = parseOcrText(text);
    expect(shifts).toHaveLength(1);
    expect(shifts[0].dayOfMonth).toBeUndefined();
  });

  test("does not steal the next day's number when the current day has none", () => {
    const text = [
      "Mon",
      "1:15 p.m. - 10:30 p.m.",
      "Tue 7",
      "Not Scheduled",
    ].join("\n");
    const shifts = parseOcrText(text);
    expect(shifts).toHaveLength(1);
    expect(shifts[0].dayOfWeek).toBe("Monday");
    expect(shifts[0].dayOfMonth).toBeUndefined();
  });

  test("skips 'not scheduled' days", () => {
    const text = [
      "Sat",
      "4",
      "Not Scheduled",
      "Mon",
      "6",
      "1:15 p.m. - 10:30 p.m.",
    ].join("\n");
    const shifts = parseOcrText(text);
    expect(shifts).toHaveLength(1);
    expect(shifts[0].dayOfWeek).toBe("Monday");
  });

  test("recovers a shift when OCR reorders 'Not Scheduled' between the badge and the time", () => {
    // Real OCR.space output for schedule-example-3: Thursday 28 is not
    // scheduled but its "Not Scheduled" label landed AFTER Friday 29 in the
    // text stream, sitting between Friday's badge and Friday's time range.
    const text = [
      "Thu",
      "28",
      "Fri",
      "29",
      "Not Scheduled",
      "6 a.m. - 2 p.m.",
      "Deli Clerk",
    ].join("\n");
    const shifts = parseOcrText(text);
    expect(shifts).toHaveLength(1);
    expect(shifts[0].dayOfWeek).toBe("Friday");
    expect(shifts[0].dayOfMonth).toBe(29);
    expect(shifts[0].startTime).toBe("6:00 AM");
    expect(shifts[0].endTime).toBe("2:00 PM");
  });

  test("parses a full multi-day Publix list with split badges", () => {
    const text = [
      "Sat", "4", "Not Scheduled",
      "Sun", "5", "Not Scheduled",
      "Mon", "6", "1:15 p.m. - 10:30 p.m.", "Deli Clerk", "Store #0526",
      "Tue", "7", "Not Scheduled",
      "Wed", "8", "5 a.m. - 2 p.m.", "Deli Clerk",
      "Thu", "9", "1:30 p.m. - 11 p.m.", "Deli Clerk",
      "Fri", "10", "3 p.m. - 10:15 p.m.", "Deli Clerk",
    ].join("\n");
    const shifts = parseOcrText(text);
    expect(shifts.map((s) => `${s.dayOfWeek}:${s.dayOfMonth}`)).toEqual([
      "Monday:6",
      "Wednesday:8",
      "Thursday:9",
      "Friday:10",
    ]);
  });
});
