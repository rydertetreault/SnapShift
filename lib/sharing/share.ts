// lib/sharing/share.ts
import { Alert, Share } from "react-native";
import { format } from "date-fns";
import { getAllEvents } from "../storage";
import { buildSharedWeek } from "./buildPayload";
import { buildShareUrl, buildInlineShareLink } from "./link";
import { createShortShare } from "./shortLink";
import { getOrCreateShareId, getShareName, setShareName } from "./identity";

// Prompt for a display name the first time. iOS Alert.prompt is fine here.
function promptForName(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.prompt(
      "Your name",
      "How should this show up for people you share with?",
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
        { text: "Save", onPress: (v?: string) => resolve((v ?? "").trim() || null) },
      ],
      "plain-text"
    );
  });
}

export async function shareWeek(weekStart: Date): Promise<void> {
  let name = await getShareName();
  if (!name) {
    name = await promptForName();
    if (!name) return;
    await setShareName(name);
  }
  const id = await getOrCreateShareId();
  const events = await getAllEvents();
  const payload = buildSharedWeek(events, format(weekStart, "yyyy-MM-dd"), { id, name });

  // Try short link first (much shorter URL + survives all autolinkers); on any
  // failure (offline, proxy down, etc.) fall back to a self-contained inline
  // link. Both shapes are path-based so neither gets truncated at `=`.
  const shortId = await createShortShare(payload);
  const link = shortId ? buildShareUrl(shortId) : buildInlineShareLink(payload);

  // Share the URL alone (no leading text) so iOS uses LPLinkMetadata to render
  // a rich preview cell at the top of the Share Sheet (app icon + title from
  // the page's OG/apple-touch-icon tags). When text is mixed with a URL, iOS
  // falls back to a generic text icon — hence URL-only here.
  await Share.share({
    url: link,
    // `message` is needed for non-URL-aware channels (SMS to Android, Slack
    // pasted as text, etc.) where the URL alone wouldn't carry context. iOS
    // shows the URL preview cell as long as `url` is set.
    message: link,
  });
}
