// Recover a JSON object from model output that may be fenced or wrapped in prose.
function repairAndParseJson(text) {
  if (typeof text !== "string") throw new Error("No text to parse");
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch (_) {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Could not parse JSON from model output");
    }
    return JSON.parse(t.slice(start, end + 1));
  }
}

module.exports = { repairAndParseJson };
