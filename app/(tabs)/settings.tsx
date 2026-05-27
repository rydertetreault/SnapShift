import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { formatDistanceToNow } from "date-fns";
import {
  hasCalendarAccess,
  requestCalendarAccess,
  listIosCalendars,
  IosCalendar,
} from "@/lib/calendar/access";
import {
  getSelectedCalendarIds,
  setSelectedCalendarIds,
  getMirrorEnabled,
  setMirrorEnabled,
} from "@/lib/calendar/preferences";
import { syncIosCalendars } from "@/lib/calendar/sync";
import { mirrorSnapShiftEvents } from "@/lib/calendar/mirror";
import {
  getCanvasFeedUrl,
  getCanvasLastSyncedAt,
  clearCanvasFeedUrl,
  looksLikeCanvasFeedUrl,
} from "@/lib/canvas/preferences";
import { connectCanvas, syncCanvas } from "@/lib/canvas/sync";
import { deleteAllCanvasEvents } from "@/lib/storage";

export default function SettingsScreen() {
  const [granted, setGranted] = useState(false);
  const [calendars, setCalendars] = useState<IosCalendar[]>([]);
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);
  const [mirrorOn, setMirrorOn] = useState(false);

  // Canvas state
  const [canvasUrl, setCanvasUrl] = useState<string | null>(null);
  const [canvasLastSyncedAt, setCanvasLastSyncedAt] = useState<string | null>(null);
  const [feedInput, setFeedInput] = useState("");
  const [canvasBusy, setCanvasBusy] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const has = await hasCalendarAccess();
    setGranted(has);
    if (has) {
      try {
        setCalendars(await listIosCalendars());
        setSelectedIdsState(await getSelectedCalendarIds());
        setMirrorOn(await getMirrorEnabled());
      } catch (e: any) {
        Alert.alert("Could not load calendars", e.message);
      }
    }
    setCanvasUrl(await getCanvasFeedUrl());
    setCanvasLastSyncedAt(await getCanvasLastSyncedAt());
  }

  async function handleGrant() {
    const ok = await requestCalendarAccess();
    if (!ok) {
      Alert.alert(
        "Permission denied",
        "Open iPhone Settings then SnapShift to grant Calendar access later."
      );
      return;
    }
    await refresh();
  }

  async function toggleCalendar(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    setSelectedIdsState(next);
    await setSelectedCalendarIds(next);
    syncIosCalendars().catch(() => {});
  }

  async function handleMirrorToggle(value: boolean) {
    setMirrorOn(value);
    await setMirrorEnabled(value);
    if (value) {
      await mirrorSnapShiftEvents();
      Alert.alert(
        "Mirroring enabled",
        'A new calendar named "SnapShift" was added to your iPhone Calendar app. Your existing events have been written to it.'
      );
    } else {
      Alert.alert(
        "Mirroring disabled",
        'Future SnapShift events will not be written to iPhone Calendar. The existing "SnapShift" calendar in iPhone Calendar is not deleted; remove it manually from the Calendar app if you want.'
      );
    }
  }

  async function handleCanvasConnect() {
    const url = feedInput.trim();
    if (!looksLikeCanvasFeedUrl(url)) {
      Alert.alert(
        "Doesn't look like a Canvas feed",
        "Paste the full Calendar Feed URL from Canvas (Calendar → Calendar Feed). It usually ends in .ics."
      );
      return;
    }
    setCanvasBusy(true);
    try {
      const imported = await connectCanvas(url);
      setFeedInput("");
      await refresh();
      Alert.alert("Canvas connected", `${imported} item${imported === 1 ? "" : "s"} imported.`);
    } catch (e: any) {
      Alert.alert("Couldn't connect", e?.message ?? "Unknown error fetching feed.");
    } finally {
      setCanvasBusy(false);
    }
  }

  async function handleCanvasSyncNow() {
    setCanvasBusy(true);
    try {
      const result = await syncCanvas();
      await refresh();
      Alert.alert("Synced", `${result.imported} item${result.imported === 1 ? "" : "s"} in your feed.`);
    } catch (e: any) {
      Alert.alert("Sync failed", e?.message ?? "Unknown error fetching feed.");
    } finally {
      setCanvasBusy(false);
    }
  }

  function handleCanvasDisconnect() {
    Alert.alert(
      "Disconnect Canvas?",
      "All imported Canvas events will be removed. Your manual events and OCR'd shifts are unaffected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            setCanvasBusy(true);
            try {
              await deleteAllCanvasEvents();
              await clearCanvasFeedUrl();
              await refresh();
            } finally {
              setCanvasBusy(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.heading}>iPhone Calendar</Text>

      {!granted ? (
        <>
          <Text style={styles.body}>
            Connect iPhone Calendar to see your existing events alongside SnapShift events, and optionally save SnapShift events back to your iPhone Calendar.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleGrant}>
            <Text style={styles.primaryBtnText}>Grant Calendar Access</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Show events from</Text>
          {calendars.map((c) => {
            const active = selectedIds.includes(c.id);
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.row, active && styles.rowActive]}
                onPress={() => toggleCalendar(c.id)}
              >
                <View style={[styles.dot, { backgroundColor: c.color || "#888" }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{c.title}</Text>
                  <Text style={styles.rowSub}>{c.source}</Text>
                </View>
                <Text style={styles.check}>{active ? "✓" : ""}</Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.mirrorRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Save SnapShift events to iPhone Calendar</Text>
              <Text style={styles.rowSub}>
                Creates a "SnapShift" calendar in the iPhone Calendar app and writes events there.
              </Text>
            </View>
            <Switch value={mirrorOn} onValueChange={handleMirrorToggle} />
          </View>
        </>
      )}

      <Text style={[styles.heading, styles.canvasHeading]}>Canvas</Text>

      {canvasUrl ? (
        <View>
          <Text style={styles.body}>
            Connected. Your Canvas assignments and calendar events show up as school-category events.
            {canvasLastSyncedAt
              ? ` Last synced ${formatDistanceToNow(new Date(canvasLastSyncedAt), { addSuffix: true })}.`
              : ""}
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, canvasBusy && styles.btnDisabled]}
            onPress={handleCanvasSyncNow}
            disabled={canvasBusy}
          >
            {canvasBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Sync now</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, canvasBusy && styles.btnDisabled]}
            onPress={handleCanvasDisconnect}
            disabled={canvasBusy}
          >
            <Text style={styles.secondaryBtnText}>Disconnect Canvas</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text style={styles.body}>
            Paste your Canvas Calendar Feed URL to import assignments and events. In Canvas, open Calendar and tap "Calendar Feed" at the bottom right to copy the link.
          </Text>
          <TextInput
            style={styles.input}
            value={feedInput}
            onChangeText={setFeedInput}
            placeholder="Paste your feed URL here"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!canvasBusy}
          />
          <Text style={styles.hint}>Tip: long-press the field above and tap Paste.</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, canvasBusy && styles.btnDisabled]}
            onPress={handleCanvasConnect}
            disabled={canvasBusy || !feedInput.trim()}
          >
            {canvasBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Connect</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  canvasHeading: { marginTop: 36 },
  body: { fontSize: 15, color: "#555", lineHeight: 22, marginBottom: 20 },
  sectionLabel: {
    fontSize: 13,
    color: "#888",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: "#4CAF50",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    marginTop: 10,
  },
  secondaryBtnText: { color: "#333", fontSize: 16, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 12,
  },
  rowActive: { backgroundColor: "#f0f8f0" },
  dot: { width: 14, height: 14, borderRadius: 7 },
  rowTitle: { fontSize: 15, color: "#222", fontWeight: "500" },
  rowSub: { fontSize: 12, color: "#888", marginTop: 2 },
  check: { fontSize: 18, color: "#4CAF50", fontWeight: "700" },
  mirrorRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    color: "#888",
    marginBottom: 12,
  },
});
