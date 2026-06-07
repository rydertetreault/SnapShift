// lib/__tests__/sharing-peopleReducer.test.ts
import { upsertPerson, removePerson, setPersonHidden } from "../sharing/peopleReducer";
import { SharedPerson, SharedWeekPayload, SHARE_SCHEMA_VERSION } from "../sharing/types";

const payload = (over: Partial<SharedWeekPayload> = {}): SharedWeekPayload => ({
  v: SHARE_SCHEMA_VERSION, id: "emma", name: "Emma", week: "2026-06-08", shifts: [], busy: [], ...over,
});

describe("peopleReducer", () => {
  test("upsert adds a new person", () => {
    const out = upsertPerson([], payload(), "2026-06-07T00:00:00.000Z");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "emma", name: "Emma", week: "2026-06-08" });
  });
  test("upsert replaces an existing person by id (refresh, no dupes)", () => {
    const first = upsertPerson([], payload(), "t1");
    const out = upsertPerson(first, payload({ name: "Em", week: "2026-06-15" }), "t2");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: "Em", week: "2026-06-15", importedAt: "t2" });
  });
  test("upsert preserves hidden flag across refresh", () => {
    const hidden = setPersonHidden(upsertPerson([], payload(), "t1"), "emma", true);
    const out = upsertPerson(hidden, payload({ week: "2026-06-15" }), "t2");
    expect(out[0].hidden).toBe(true);
  });
  test("removePerson drops by id", () => {
    const out = removePerson(upsertPerson([], payload(), "t1"), "emma");
    expect(out).toHaveLength(0);
  });
  test("setPersonHidden toggles the flag", () => {
    const out = setPersonHidden(upsertPerson([], payload(), "t1"), "emma", true);
    expect(out[0].hidden).toBe(true);
  });
});
