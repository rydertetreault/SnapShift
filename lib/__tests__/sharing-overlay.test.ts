import { overlayBlocksForDay } from "../sharing/overlay";
import { SharedPerson } from "../sharing/types";

const emma: SharedPerson = {
  id: "emma", name: "Emma", week: "2026-06-08", importedAt: "t",
  shifts: [{ date: "2026-06-09", start: "09:00", end: "17:00", label: "Work" }],
  busy: [{ date: "2026-06-09", start: "18:00", end: "20:00" }],
};

describe("overlayBlocksForDay", () => {
  test("returns work + busy blocks for that person on that date", () => {
    const out = overlayBlocksForDay([emma], "2026-06-09");
    expect(out).toEqual([
      { personId: "emma", name: "Emma", kind: "work", start: "09:00", end: "17:00", label: "Work" },
      { personId: "emma", name: "Emma", kind: "busy", start: "18:00", end: "20:00" },
    ]);
  });
  test("excludes hidden people", () => {
    expect(overlayBlocksForDay([{ ...emma, hidden: true }], "2026-06-09")).toEqual([]);
  });
  test("returns nothing for a date outside the shared week", () => {
    expect(overlayBlocksForDay([emma], "2026-07-01")).toEqual([]);
  });
});
