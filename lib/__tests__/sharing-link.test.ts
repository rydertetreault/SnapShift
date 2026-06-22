// lib/__tests__/sharing-link.test.ts
import {
  buildShareUrl,
  buildInlineShareLink,
  extractPayloadParam,
  isShortShareId,
  SHARE_BASE_URL,
} from "../sharing/link";
import { encodeWeek } from "../sharing/codec";
import { SharedWeekPayload, SHARE_SCHEMA_VERSION } from "../sharing/types";

const sample: SharedWeekPayload = {
  v: SHARE_SCHEMA_VERSION,
  id: "abc",
  name: "Emma",
  week: "2026-06-08",
  shifts: [],
  busy: [],
};

describe("share link", () => {
  test("buildShareUrl produces a path-based https link (no ?d=)", () => {
    const link = buildShareUrl("abc12345");
    expect(link).toBe(`${SHARE_BASE_URL}/s/abc12345`);
    expect(link).not.toContain("?");
    expect(link).not.toContain("=");
  });

  test("buildInlineShareLink path-encodes the full payload (offline fallback)", () => {
    const link = buildInlineShareLink(sample);
    const encoded = encodeWeek(sample);
    expect(link).toBe(`${SHARE_BASE_URL}/s/${encoded}`);
    // Path-based: must still avoid '?' and '=' so SMS auto-linkers don't chop it.
    expect(link).not.toContain("?");
    expect(link).not.toContain("=");
  });

  test("extractPayloadParam reads the new path-based form", () => {
    const link = buildShareUrl("abc12345");
    expect(extractPayloadParam(link)).toBe("abc12345");
  });

  test("extractPayloadParam still reads the legacy ?d= form (back-compat)", () => {
    const d = encodeWeek(sample);
    expect(extractPayloadParam(`${SHARE_BASE_URL}/s?d=${d}`)).toBe(d);
  });

  test("extractPayloadParam reads the in-app snapshift:// deep link", () => {
    const d = encodeWeek(sample);
    expect(extractPayloadParam(`snapshift://share-week?d=${d}`)).toBe(d);
  });

  test("extractPayloadParam reads inline payload from path form", () => {
    const link = buildInlineShareLink(sample);
    expect(extractPayloadParam(link)).toBe(encodeWeek(sample));
  });

  test("extractPayloadParam returns null when no token present", () => {
    expect(extractPayloadParam(`${SHARE_BASE_URL}/s`)).toBeNull();
  });

  test("isShortShareId distinguishes short IDs from inline payloads", () => {
    expect(isShortShareId("abc12345")).toBe(true);
    expect(isShortShareId("aB3xY7Qz")).toBe(true);
    // Inline base64url payloads contain - or _ and/or are much longer.
    expect(isShortShareId(encodeWeek(sample))).toBe(false);
    expect(isShortShareId("abc")).toBe(false); // too short
    expect(isShortShareId("a".repeat(20))).toBe(false); // too long
    expect(isShortShareId("abc_1234")).toBe(false); // underscore (base64url, not id)
  });
});
