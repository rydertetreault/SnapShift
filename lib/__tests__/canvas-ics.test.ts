import { parseIcs } from "../canvas/ics";

const SAMPLE = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Instructure Canvas//Calendar//EN",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20260601",
  "DTEND;VALUE=DATE:20260602",
  "UID:event-assignment-12345@example.instructure.com",
  "SUMMARY:Essay Draft Due [CS 101]",
  "DESCRIPTION:Submit your essay draft.\\n\\nVisit Canvas for details.",
  "URL:https://example.instructure.com/courses/123/assignments/456",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:20260615T235900Z",
  "DTEND:20260615T235900Z",
  "UID:event-assignment-67890@example.instructure.com",
  "SUMMARY:Final Project Submission",
  "URL:https://example.instructure.com/courses/123/assignments/789",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseIcs", () => {
  test("parses all VEVENTs in a Canvas-style feed", () => {
    const events = parseIcs(SAMPLE);
    expect(events).toHaveLength(2);
  });

  test("extracts UID, summary, and URL", () => {
    const [first] = parseIcs(SAMPLE);
    expect(first.uid).toBe("event-assignment-12345@example.instructure.com");
    expect(first.summary).toBe("Essay Draft Due [CS 101]");
    expect(first.url).toBe("https://example.instructure.com/courses/123/assignments/456");
  });

  test("unescapes newlines and backslashes in description", () => {
    const [first] = parseIcs(SAMPLE);
    expect(first.description).toContain("\n");
    expect(first.description).not.toContain("\\n");
  });

  test("date-only events are flagged allDay with YYYY-MM-DD value", () => {
    const [first] = parseIcs(SAMPLE);
    expect(first.allDay).toBe(true);
    expect(first.start).toBe("2026-06-01");
  });

  test("UTC datetimes are converted to local wall-time ISO with no Z suffix", () => {
    const [, second] = parseIcs(SAMPLE);
    expect(second.allDay).toBe(false);
    expect(second.start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    expect(second.start.endsWith("Z")).toBe(false);
  });

  test("DTEND missing falls back to DTSTART", () => {
    const text = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:no-end@example.com",
      "SUMMARY:Quiz",
      "DTSTART:20260701T120000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const [evt] = parseIcs(text);
    expect(evt.end).toBe(evt.start);
  });

  test("unfolds RFC-5545 continuation lines (space-prefixed)", () => {
    // RFC 5545: the leading whitespace fold character is dropped on unfold; whitespace
    // visible in the unfolded result must be encoded in the original line, not the fold.
    const text = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:folded@example.com",
      "SUMMARY:Very long title that has ",
      " been folded into two lines",
      "DTSTART;VALUE=DATE:20260801",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const [evt] = parseIcs(text);
    expect(evt.summary).toBe("Very long title that has been folded into two lines");
  });

  test("skips VEVENTs missing required fields (no UID)", () => {
    const text = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "SUMMARY:Orphan",
      "DTSTART;VALUE=DATE:20260901",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    expect(parseIcs(text)).toEqual([]);
  });

  test("handles LF-only line endings (not just CRLF)", () => {
    const text = SAMPLE.replace(/\r\n/g, "\n");
    expect(parseIcs(text)).toHaveLength(2);
  });
});
