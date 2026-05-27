// Minimal iCalendar (RFC 5545) parser for Canvas LMS feeds.
// Scope: VEVENT only. No VTIMEZONE / VTODO / recurrence rules — Canvas feeds emit one VEVENT per assignment/event.

export interface IcsEvent {
  uid: string;
  summary: string;
  description?: string;
  url?: string;
  location?: string;
  // ISO 8601 local datetime strings ("2026-06-01T23:59:00") or YYYY-MM-DD for all-day.
  start: string;
  end: string;
  allDay: boolean;
}

interface RawProperty {
  name: string;
  params: Record<string, string>;
  value: string;
}

// Unfold per RFC 5545 §3.1: lines starting with space or tab continue the previous line.
function unfold(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n");
  const out: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function parseProperty(line: string): RawProperty | null {
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const parts = head.split(";");
  const name = parts[0].toUpperCase();
  const params: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const eq = parts[i].indexOf("=");
    if (eq === -1) continue;
    params[parts[i].slice(0, eq).toUpperCase()] = parts[i].slice(eq + 1);
  }
  return { name, params, value };
}

// Reverses iCal text escaping: \\ → \, \n / \N → newline, \, → "," , \; → ";".
function unescapeText(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && i + 1 < s.length) {
      const next = s[i + 1];
      if (next === "n" || next === "N") out += "\n";
      else if (next === "\\" || next === "," || next === ";") out += next;
      else out += next;
      i++;
    } else {
      out += s[i];
    }
  }
  return out;
}

// Parses a DATE-TIME or DATE value into { iso, allDay }.
// Supported forms:
//   YYYYMMDD                  (all-day; with VALUE=DATE param)
//   YYYYMMDDTHHMMSS           (floating local)
//   YYYYMMDDTHHMMSSZ          (UTC — converted to local wall time)
function parseDate(value: string, params: Record<string, string>): { iso: string; allDay: boolean } | null {
  const isAllDay = params.VALUE === "DATE" || /^\d{8}$/.test(value);
  if (isAllDay) {
    const m = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
    if (!m) return null;
    return { iso: `${m[1]}-${m[2]}-${m[3]}`, allDay: true };
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (z === "Z") {
    // Convert UTC → local wall time so date/hour line up with how the user sees it in Canvas.
    const utc = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
    return { iso: localIso(utc), allDay: false };
  }
  // Floating / TZID-prefixed times: treat as local. (TZID handling adds tz-data weight we don't need yet.)
  return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s}`, allDay: false };
}

function localIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export function parseIcs(text: string): IcsEvent[] {
  const lines = unfold(text);
  const events: IcsEvent[] = [];
  let current: Partial<{
    uid: string;
    summary: string;
    description: string;
    url: string;
    location: string;
    start: string;
    end: string;
    allDay: boolean;
  }> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = { allDay: false };
      continue;
    }
    if (line === "END:VEVENT") {
      if (current && current.uid && current.summary && current.start) {
        // Canvas omits DTEND for due-date-only assignments. Mirror Apple Calendar's convention: end = start.
        const end = current.end ?? current.start;
        events.push({
          uid: current.uid,
          summary: current.summary,
          description: current.description,
          url: current.url,
          location: current.location,
          start: current.start,
          end,
          allDay: current.allDay ?? false,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const prop = parseProperty(line);
    if (!prop) continue;

    switch (prop.name) {
      case "UID":
        current.uid = prop.value;
        break;
      case "SUMMARY":
        current.summary = unescapeText(prop.value);
        break;
      case "DESCRIPTION":
        current.description = unescapeText(prop.value);
        break;
      case "URL":
        current.url = prop.value;
        break;
      case "LOCATION":
        current.location = unescapeText(prop.value);
        break;
      case "DTSTART": {
        const parsed = parseDate(prop.value, prop.params);
        if (parsed) {
          current.start = parsed.iso;
          current.allDay = parsed.allDay;
        }
        break;
      }
      case "DTEND": {
        const parsed = parseDate(prop.value, prop.params);
        if (parsed) current.end = parsed.iso;
        break;
      }
    }
  }
  return events;
}
