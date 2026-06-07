// lib/__tests__/sharing-codec.test.ts
import {
  base64urlEncode,
  base64urlDecode,
  encodeWeek,
  decodeWeek,
} from "../sharing/codec";
import { SharedWeekPayload, SHARE_SCHEMA_VERSION } from "../sharing/types";

const sample: SharedWeekPayload = {
  v: SHARE_SCHEMA_VERSION,
  id: "k3f9a2",
  name: "Emma",
  week: "2026-06-08",
  shifts: [{ date: "2026-06-09", start: "09:00", end: "17:00", label: "Work" }],
  busy: [{ date: "2026-06-09", start: "18:00", end: "20:00" }],
};

describe("base64url", () => {
  test("round-trips unicode strings", () => {
    const s = 'Emma — café 😀 {"x":1}';
    expect(base64urlDecode(base64urlEncode(s))).toBe(s);
  });
  test("uses url-safe alphabet (no + / =)", () => {
    const out = base64urlEncode("any string ????");
    expect(out).not.toMatch(/[+/=]/);
  });
});

describe("encodeWeek/decodeWeek", () => {
  test("round-trips a payload", () => {
    expect(decodeWeek(encodeWeek(sample))).toEqual(sample);
  });
  test("rejects an unknown/newer schema version", () => {
    const future = encodeWeek({ ...sample, v: 999 });
    expect(() => decodeWeek(future)).toThrow(/version/i);
  });
  test("throws on garbage input", () => {
    expect(() => decodeWeek("!!!not-valid!!!")).toThrow();
  });
});
