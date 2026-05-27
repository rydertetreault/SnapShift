import { parseIcs, IcsEvent } from "./ics";

export class CanvasFeedError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "CanvasFeedError";
  }
}

// Some Canvas feed URLs use the `webcal://` scheme — swap to https so fetch() can handle it.
export function normalizeFeedUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith("webcal://")) {
    return "https://" + trimmed.slice("webcal://".length);
  }
  return trimmed;
}

export async function fetchCanvasFeed(url: string): Promise<IcsEvent[]> {
  const normalized = normalizeFeedUrl(url);
  let response: Response;
  try {
    response = await fetch(normalized, { headers: { Accept: "text/calendar" } });
  } catch (e: any) {
    throw new CanvasFeedError(`Network error fetching feed: ${e.message ?? e}`);
  }
  if (!response.ok) {
    throw new CanvasFeedError(`Feed responded ${response.status}`, response.status);
  }
  const text = await response.text();
  if (!text.includes("BEGIN:VCALENDAR")) {
    throw new CanvasFeedError("Response did not look like an iCalendar feed");
  }
  return parseIcs(text);
}
