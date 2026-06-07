const { repairAndParseJson, buildOpenRouterRequest, parseExtractionResponse } = require("../../proxy/api/_lib/extract-core.js");
const completion = (content: any) => ({ choices: [{ message: { content } }] });

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

describe("buildOpenRouterRequest", () => {
  const req = buildOpenRouterRequest({ imageBase64: "AAAA", mimeType: "image/png", model: "anthropic/claude-sonnet-4.6" });
  test("sets the model", () => { expect(req.model).toBe("anthropic/claude-sonnet-4.6"); });
  test("includes the prompt as a text part", () => {
    const parts = req.messages[0].content;
    expect(parts.some((p: any) => p.type === "text" && p.text.length > 0)).toBe(true);
  });
  test("includes the image as a data URL", () => {
    const parts = req.messages[0].content;
    const img = parts.find((p: any) => p.type === "image_url");
    expect(img.image_url.url).toBe("data:image/png;base64,AAAA");
  });
  test("requests a json_schema response format", () => {
    expect(req.response_format.type).toBe("json_schema");
    expect(req.response_format.json_schema.schema.required).toContain("shifts");
  });
});

describe("parseExtractionResponse", () => {
  test("extracts shifts with times", () => {
    const out = parseExtractionResponse(completion('{"weekStart":"2026-05-03","shifts":[{"dayOfWeek":"Monday","date":"2026-05-04","startTime":"5:00 AM","endTime":"2:00 PM","department":"Deli"}]}'));
    expect(out.weekStart).toBe("2026-05-03");
    expect(out.shifts).toHaveLength(1);
    expect(out.shifts[0].startTime).toBe("5:00 AM");
  });
  test("keeps marker-only shifts without times", () => {
    const out = parseExtractionResponse(completion('{"shifts":[{"dayOfWeek":"Saturday","date":"2026-05-09"}]}'));
    expect(out.shifts[0].startTime).toBeUndefined();
  });
  test("returns empty shifts array when none found", () => {
    const out = parseExtractionResponse(completion('{"shifts":[]}'));
    expect(out.shifts).toEqual([]);
  });
  test("throws when the completion has no content", () => {
    expect(() => parseExtractionResponse({ choices: [] })).toThrow();
  });
});
