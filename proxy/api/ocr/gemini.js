// proxy/api/ocr/gemini.js
// Legacy route kept for installed app versions that still POST here.
// Delegates to the OpenRouter/Claude engine in extract.js.
module.exports = require("./extract.js");
