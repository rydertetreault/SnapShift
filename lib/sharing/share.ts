// lib/sharing/share.ts
import { Alert, Share } from "react-native";
import { format } from "date-fns";
import { getAllEvents } from "../storage";
import { buildSharedWeek } from "./buildPayload";
import { buildShareLink } from "./link";
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
  const link = buildShareLink(payload);
  await Share.share({
    message: `${name}'s schedule for the week of ${format(weekStart, "MMM d")}: ${link}`,
  });
}
