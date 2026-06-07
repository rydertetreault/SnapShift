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

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    weekStart: { type: "string", description: "ISO date (YYYY-MM-DD) of the first day of the week or month shown, if visible. Omit if not visible." },
    shifts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dayOfWeek: { type: "string", description: "Full day name, e.g. Monday" },
          date: { type: "string", description: "YYYY-MM-DD if derivable from the image" },
          startTime: { type: "string", description: "h:mm AM/PM. OMIT if the source shows no specific times (e.g. monthly marker grid)." },
          endTime: { type: "string", description: "h:mm AM/PM. OMIT if the source shows no specific times." },
          department: { type: "string" },
        },
        required: ["dayOfWeek"],
      },
    },
  },
  required: ["shifts"],
};

const EXTRACTION_PROMPT = require("./extract-prompt.js");

function buildOpenRouterRequest({ imageBase64, mimeType, model }) {
  return {
    model,
    messages: [
      { role: "user", content: [
        { type: "text", text: EXTRACTION_PROMPT },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
      ]},
    ],
    // strict:false — marker-only monthly grids legitimately omit start/end time,
    // which OpenAI-style strict mode would reject. Prompt + tolerant parser are the guardrails.
    response_format: { type: "json_schema", json_schema: { name: "schedule", strict: false, schema: RESPONSE_JSON_SCHEMA } },
    temperature: 0.1,
    max_tokens: 4096,
  };
}

function parseExtractionResponse(openRouterJson) {
  const content =
    openRouterJson && openRouterJson.choices && openRouterJson.choices[0] &&
    openRouterJson.choices[0].message && openRouterJson.choices[0].message.content;
  if (!content) throw new Error("Empty response from vision service");
  const parsed = repairAndParseJson(content);
  const shifts = Array.isArray(parsed.shifts) ? parsed.shifts : [];
  return { weekStart: parsed.weekStart, shifts };
}

module.exports = { repairAndParseJson, buildOpenRouterRequest, parseExtractionResponse, RESPONSE_JSON_SCHEMA };
