import { sanitizeRange } from "../calendar/sanitizeRange";

describe("sanitizeRange", () => {
  test("passes through a valid range unchanged", () => {
    const r = sanitizeRange(
      "2026-07-01T09:00:00.000Z",
      "2026-07-01T17:00:00.000Z"
    );
    expect(r).not.toBeNull();
    expect(r!.start.toISOString()).toBe("2026-07-01T09:00:00.000Z");
    expect(r!.end.toISOString()).toBe("2026-07-01T17:00:00.000Z");
  });

  test("rolls an overnight shift's end forward a day", () => {
    // 9 PM – 2 AM stored on the same date (the Sentry REACT-NATIVE-2 shape).
    const r = sanitizeRange(
      "2026-07-01T21:00:00.000Z",
      "2026-07-01T02:00:00.000Z"
    );
    expect(r).not.toBeNull();
    expect(r!.end.toISOString()).toBe("2026-07-02T02:00:00.000Z");
    expect(r!.end.getTime()).toBeGreaterThan(r!.start.getTime());
  });

  test("rolls forward when start === end", () => {
    const r = sanitizeRange(
      "2026-07-01T09:00:00.000Z",
      "2026-07-01T09:00:00.000Z"
    );
    expect(r).not.toBeNull();
    expect(r!.end.toISOString()).toBe("2026-07-02T09:00:00.000Z");
  });

  test("returns null when end is more than a day before start", () => {
    const r = sanitizeRange(
      "2026-07-05T09:00:00.000Z",
      "2026-07-01T09:00:00.000Z"
    );
    expect(r).toBeNull();
  });

  test("returns null for unparseable dates", () => {
    expect(sanitizeRange("garbage", "2026-07-01T09:00:00.000Z")).toBeNull();
    expect(sanitizeRange("2026-07-01T09:00:00.000Z", "")).toBeNull();
  });
});
