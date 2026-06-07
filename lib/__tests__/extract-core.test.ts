const { repairAndParseJson } = require("../../proxy/api/_lib/extract-core.js");

describe("repairAndParseJson", () => {
  test("parses plain JSON", () => {
    expect(repairAndParseJson('{"shifts":[]}')).toEqual({ shifts: [] });
  });
  test("strips ```json code fences", () => {
    const text = "```json\n{\"shifts\":[{\"dayOfWeek\":\"Monday\"}]}\n```";
    expect(repairAndParseJson(text)).toEqual({ shifts: [{ dayOfWeek: "Monday" }] });
  });
  test("ignores leading and trailing prose", () => {
    const text = 'Here is the schedule:\n{"shifts":[]}\nLet me know!';
    expect(repairAndParseJson(text)).toEqual({ shifts: [] });
  });
  test("throws on irrecoverable text", () => {
    expect(() => repairAndParseJson("no json here")).toThrow();
  });
});
