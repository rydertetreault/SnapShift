const OCR_API_URL = "https://api.ocr.space/parse/image";
const OCR_API_KEY = process.env.EXPO_PUBLIC_OCR_API_KEY ?? "";

export interface PublixParseResult {
  shifts: Array<{
    dayOfWeek: string;
    dayOfMonth?: number;
    startTime: string;
    endTime: string;
    department?: string;
  }>;
  rawOcrText: string;
}

function normalizeTime(raw: string): string {
  let s = raw.trim();
  s = s.replace(/a\.m\./gi, "AM").replace(/p\.m\./gi, "PM");
  s = s.replace(/a\.m/gi, "AM").replace(/p\.m/gi, "PM");
  s = s.replace(/am/gi, "AM").replace(/pm/gi, "PM");

  const standard = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (standard) return `${parseInt(standard[1])}:${standard[2]} ${standard[3]}`;

  const noMin = s.match(/^(\d{1,2})\s*(AM|PM)$/);
  if (noMin) return `${parseInt(noMin[1])}:00 ${noMin[2]}`;

  const mil = s.match(/^(\d{1,2}):(\d{2})$/);
  if (mil) {
    let h = parseInt(mil[1]);
    const m = mil[2];
    const ampm = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  }

  return raw.trim();
}

export function parseOcrText(text: string) {
  const shifts: {
    dayOfWeek: string;
    dayOfMonth?: number;
    startTime: string;
    endTime: string;
    department?: string;
  }[] = [];
  const fullText = text.replace(/\r\n/g, "\n");
  const lines = fullText.split("\n").map((l) => l.trim()).filter(Boolean);

  // NEW: capture day-of-month number alongside the day-of-week name.
  // Pattern: "Mon 6", "Saturday 12", etc.
  const dayPattern =
    /\b(sat|sun|mon|tue|tues|wed|thu|thur|thurs|fri|saturday|sunday|monday|tuesday|wednesday|thursday|friday)\s+(\d{1,2})\b/i;
  const dayOnlyPattern =
    /\b(sat|sun|mon|tue|tues|wed|thu|thur|thurs|fri|saturday|sunday|monday|tuesday|wednesday|thursday|friday)\b/i;

  const fullDayNames: Record<string, string> = {
    sat: "Saturday", saturday: "Saturday",
    sun: "Sunday", sunday: "Sunday",
    mon: "Monday", monday: "Monday",
    tue: "Tuesday", tues: "Tuesday", tuesday: "Tuesday",
    wed: "Wednesday", wednesday: "Wednesday",
    thu: "Thursday", thur: "Thursday", thurs: "Thursday", thursday: "Thursday",
    fri: "Friday", friday: "Friday",
  };

  const timeStr = "\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?|AM|PM)";
  const timeRangePattern = new RegExp(`(${timeStr})\\s*[-–—]\\s*(${timeStr})`, "i");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    if (lower.includes("not scheduled")) continue;

    // Try the "day + number" pattern first to capture day-of-month
    const dayMatch = line.match(dayPattern);
    let dayName: string | undefined;
    let dayOfMonth: number | undefined;

    if (dayMatch) {
      dayName = fullDayNames[dayMatch[1].toLowerCase()];
      dayOfMonth = parseInt(dayMatch[2]);
    } else {
      const dayOnly = line.match(dayOnlyPattern);
      if (dayOnly) {
        dayName = fullDayNames[dayOnly[1].toLowerCase()];
        // OCR.space frequently splits the badge into two lines:
        //   "Mon"
        //   "6"
        // Look at the next 1-2 lines for a bare 1- or 2-digit number.
        // Stop early if we hit another day name or a time range.
        for (let j = 1; j <= 2 && i + j < lines.length; j++) {
          const ahead = lines[i + j];
          if (dayOnlyPattern.test(ahead)) break;
          if (timeRangePattern.test(ahead)) break;
          const numMatch = ahead.match(/^(\d{1,2})$/);
          if (numMatch) {
            dayOfMonth = parseInt(numMatch[1]);
            break;
          }
        }
      }
    }
    if (!dayName) continue;

    let timeMatch = line.match(timeRangePattern);
    if (!timeMatch) {
      // Look ahead a few lines for a time range. Don't bail on a stray
      // "Not Scheduled" line: OCR.space sometimes reorders content so a
      // "Not Scheduled" from an adjacent day lands between this day's
      // badge and its actual time, and bailing would drop a real shift.
      // The day-name break at j>1 still prevents us from grabbing the
      // next day's time.
      for (let j = 1; j <= 4 && i + j < lines.length; j++) {
        const ahead = lines[i + j];
        if (dayOnlyPattern.test(ahead) && j > 1) break;
        timeMatch = ahead.match(timeRangePattern);
        if (timeMatch) break;
      }
    }
    if (!timeMatch) continue;

    const startTime = normalizeTime(timeMatch[1]);
    const endTime = normalizeTime(timeMatch[2]);

    let department: string | undefined;
    const searchLines: string[] = [];
    for (let j = 0; j <= 5 && i + j < lines.length; j++) {
      searchLines.push(lines[i + j]);
    }
    const searchText = searchLines.join(" ");
    const deptMatch = searchText.match(
      /\b(deli|grocery|bakery|produce|pharmacy|meat|seafood|floral|front.?service|customer.?service)\b/i
    );
    if (deptMatch) {
      department =
        deptMatch[1].charAt(0).toUpperCase() + deptMatch[1].slice(1).toLowerCase();
    }

    shifts.push({ dayOfWeek: dayName, dayOfMonth, startTime, endTime, department });
  }
  return shifts;
}

export async function runPublixOcr(
  base64Image: string,
  mimeType: string
): Promise<PublixParseResult> {
  const dataUri = `data:${mimeType};base64,${base64Image}`;
  const formData = new FormData();
  formData.append("base64Image", dataUri);
  formData.append("apikey", OCR_API_KEY);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("OCREngine", "2");

  const response = await fetch(OCR_API_URL, { method: "POST", body: formData });
  if (!response.ok) throw new Error(`OCR service error (${response.status}).`);

  const data = await response.json();
  if (data.IsErroredOnProcessing) {
    throw new Error(
      data.ErrorMessage?.[0] || "Could not process this image. Try a clearer photo."
    );
  }

  const ocrText = data.ParsedResults?.[0]?.ParsedText;
  if (!ocrText) throw new Error("No text found in the image. Try a clearer photo.");

  const shifts = parseOcrText(ocrText);
  return { shifts, rawOcrText: ocrText };
}
