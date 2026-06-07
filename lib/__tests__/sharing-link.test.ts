// lib/__tests__/sharing-link.test.ts
import { buildShareLink, extractPayloadParam } from "../sharing/link";
import { encodeWeek } from "../sharing/codec";
import { SharedWeekPayload, SHARE_SCHEMA_VERSION } from "../sharing/types";

const sample: SharedWeekPayload = {
  v: SHARE_SCHEMA_VERSION, id: "abc", name: "Emma", week: "2026-06-08", shifts: [], busy: [],
};

describe("share link", () => {
  test("builds an https link with the payload in ?d=", () => {
    const link = buildShareLink(sample);
    expect(link.startsWith("https://snap-shift-proxy.vercel.app/s?d=")).toBe(true);
    expect(extractPayloadParam(link)).toBe(encodeWeek(sample));
  });
  test("extracts d= from an app-scheme deep link too", () => {
    const d = encodeWeek(sample);
    expect(extractPayloadParam(`snapshift://share-week?d=${d}`)).toBe(d);
  });
  test("returns null when no d= present", () => {
    expect(extractPayloadParam("https://snap-shift-proxy.vercel.app/s")).toBeNull();
  });
});
