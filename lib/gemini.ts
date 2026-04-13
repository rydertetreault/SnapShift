import { ExtractedShift } from "./types";
import { addDays, format } from "date-fns";

const OCR_API_URL = "https://api.ocr.space/parse/image";
const OCR_API_KEY = process.env.EXPO_PUBLIC_OCR_API_KEY ?? "";

function resolveDate(dayOfWeek: string, weekStartSaturday: Date): string {
  const dayMap: Record<string, number> = {
    saturday: 0, sat: 0,
    sunday: 1, sun: 1,
    monday: 2, mon: 2,
    tuesday: 3, tue: 3, tues: 3,
    wednesday: 4, wed: 4,
    thursday: 5, thu: 5, thur: 5, thurs: 5,
    friday: 6, fri: 6,
  };

  const offset = dayMap[dayOfWeek.toLowerCase().trim()];
  if (offset === undefined) {
    return format(weekStartSaturday, "yyyy-MM-dd");
  }

  return format(addDays(weekStartSaturday, offset), "yyyy-MM-dd");
}

/**
 * Normalize various time formats to "h:mm AM/PM"
 * Handles: "1:15 p.m.", "5 a.m.", "2:00 PM", "2:00PM", "14:00"
 */
function normalizeTime(raw: string): string {
  let s = raw.trim();

  // Normalize "a.m." / "p.m." to "AM" / "PM"
  s = s.replace(/a\.m\./gi, "AM").replace(/p\.m\./gi, "PM");
  // Also handle "a.m" / "p.m" without trailing dot
  s = s.replace(/a\.m/gi, "AM").replace(/p\.m/gi, "PM");
  s = s.replace(/am/gi, "AM").replace(/pm/gi, "PM");

  // "h:mm AM/PM" or "h:mm AM/PM"
  const standard = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (standard) {
    return `${parseInt(standard[1])}:${standard[2]} ${standard[3]}`;
  }

  // No minutes: "5 AM" or "5AM"
  const noMin = s.match(/^(\d{1,2})\s*(AM|PM)$/);
  if (noMin) {
    return `${parseInt(noMin[1])}:00 ${noMin[2]}`;
  }

  // 24-hour format: "14:00"
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

/**
 * Parse OCR text to extract Publix schedule shifts.
 *
 * Publix schedule format (from mobile site):
 *   Sat 4    Not Scheduled
 *   Mon 6    1:15 p.m. - 10:30 p.m.   Deli Clerk   Store #0526   8.25 hours
 *   Wed 8    5 a.m. - 2 p.m.           Deli Clerk   Store #0526   8 hours
 *
 * OCR may put these on one line or split across multiple lines.
 */
function parseOcrText(text: string): { dayOfWeek: string; startTime: string; endTime: string; department?: string }[] {
  const shifts: { dayOfWeek: string; startTime: string; endTime: string; department?: string }[] = [];

  // Normalize the text: join lines and work with the full blob
  const fullText = text.replace(/\r\n/g, "\n");
  const lines = fullText.split("\n").map((l) => l.trim()).filter(Boolean);

  const dayPattern = /\b(sat|sun|mon|tue|tues|wed|thu|thur|thurs|fri|saturday|sunday|monday|tuesday|wednesday|thursday|friday)\b/i;

  const fullDayNames: Record<string, string> = {
    sat: "Saturday", saturday: "Saturday",
    sun: "Sunday", sunday: "Sunday",
    mon: "Monday", monday: "Monday",
    tue: "Tuesday", tues: "Tuesday", tuesday: "Tuesday",
    wed: "Wednesday", wednesday: "Wednesday",
    thu: "Thursday", thur: "Thursday", thurs: "Thursday", thursday: "Thursday",
    fri: "Friday", friday: "Friday",
  };

  // Time pattern that handles "a.m." / "p.m." / "AM" / "PM" formats
  // Matches: "1:15 p.m.", "5 a.m.", "10:30 p.m.", "2:00 PM"
  const timeStr = "\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?|AM|PM)";
  const timeRangePattern = new RegExp(`(${timeStr})\\s*[-–—]\\s*(${timeStr})`, "i");

  // Try to find shifts by scanning through lines
  // Sometimes the day and time are on the same line, sometimes split
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Skip "not scheduled" lines
    if (lower.includes("not scheduled")) continue;

    // Check if this line has a day name
    const dayMatch = line.match(dayPattern);
    if (!dayMatch) continue;

    const dayName = fullDayNames[dayMatch[1].toLowerCase()];
    if (!dayName) continue;

    // Look for time range on this line and the next few lines
    // OCR often splits: "Mon" / "6" / "1:15 p.m. - 10:30 p.m." across lines
    let timeMatch = line.match(timeRangePattern);
    let timeLineOffset = 0;

    if (!timeMatch) {
      // Search ahead up to 4 lines for the time range
      for (let j = 1; j <= 4 && i + j < lines.length; j++) {
        const ahead = lines[i + j];
        // Stop if we hit another day name or "not scheduled"
        if (ahead.toLowerCase().includes("not scheduled")) break;
        if (dayPattern.test(ahead) && j > 1) break;

        timeMatch = ahead.match(timeRangePattern);
        if (timeMatch) {
          timeLineOffset = j;
          break;
        }
      }
    }

    if (!timeMatch) continue;

    const startTime = normalizeTime(timeMatch[1]);
    const endTime = normalizeTime(timeMatch[2]);

    // Look for department info in surrounding lines
    let department: string | undefined;
    const searchLines: string[] = [];
    for (let j = 0; j <= 5 && i + j < lines.length; j++) {
      searchLines.push(lines[i + j]);
    }
    const searchText = searchLines.join(" ");
    const deptMatch = searchText.match(/\b(deli|grocery|bakery|produce|pharmacy|meat|seafood|floral|front.?service|customer.?service)\b/i);
    if (deptMatch) {
      department = deptMatch[1].charAt(0).toUpperCase() + deptMatch[1].slice(1).toLowerCase();
    }

    shifts.push({ dayOfWeek: dayName, startTime, endTime, department });
  }

  return shifts;
}

/**
 * Send a schedule screenshot to OCR.space and parse the extracted text.
 */
export async function parseScheduleImage(
  base64Image: string,
  mimeType: string,
  weekStartSaturday: Date
): Promise<ExtractedShift[]> {
  const dataUri = `data:${mimeType};base64,${base64Image}`;

  const formData = new FormData();
  formData.append("base64Image", dataUri);
  formData.append("apikey", OCR_API_KEY);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("OCREngine", "2");

  const response = await fetch(OCR_API_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR service error (${response.status}). Please try again.`);
  }

  const data = await response.json();

  if (data.IsErroredOnProcessing) {
    throw new Error(
      data.ErrorMessage?.[0] || "Could not process this image. Try a clearer photo."
    );
  }

  const ocrText = data.ParsedResults?.[0]?.ParsedText;
  if (!ocrText) {
    throw new Error("No text found in the image. Try a clearer photo.");
  }

  const rawShifts = parseOcrText(ocrText);

  if (rawShifts.length === 0) {
    const preview = ocrText.substring(0, 500);
    throw new Error(
      `Could not find shifts. Here's what was read from the image:\n\n${preview}`
    );
  }

  const shifts: ExtractedShift[] = rawShifts.map((item) => ({
    dayOfWeek: item.dayOfWeek,
    date: resolveDate(item.dayOfWeek, weekStartSaturday),
    startTime: item.startTime,
    endTime: item.endTime,
    department: item.department,
  }));

  return shifts;
}
