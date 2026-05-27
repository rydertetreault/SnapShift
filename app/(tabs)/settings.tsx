import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
  Alert,
} from "react-native";
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
import { useTheme } from "@/lib/theme/ThemeProvider";

export default function SettingsScreen() {
  const theme = useTheme();
  const [granted, setGranted] = useState(false);
  const [calendars, setCalendars] = useState<IosCalendar[]>([]);
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);
  const [mirrorOn, setMirrorOn] = useState(false);

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

  if (!granted) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.surface }]}
        contentContainerStyle={{ padding: 20 }}
      >
        <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>iPhone Calendar</Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          Connect iPhone Calendar to see your existing events alongside SnapShift events, and optionally save SnapShift events back to your iPhone Calendar.
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
          onPress={handleGrant}
        >
          <Text style={styles.primaryBtnText}>Grant Calendar Access</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>iPhone Calendar</Text>

      <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>Show events from</Text>
      {calendars.map((c) => {
        const active = selectedIds.includes(c.id);
        return (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.row,
              { borderBottomColor: theme.colors.border },
              active && { backgroundColor: theme.colors.surfaceAlt },
            ]}
            onPress={() => toggleCalendar(c.id)}
          >
            <View style={[styles.dot, { backgroundColor: c.color || theme.colors.textMuted }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>{c.title}</Text>
              <Text style={[styles.rowSub, { color: theme.colors.textMuted }]}>{c.source}</Text>
            </View>
            <Text style={[styles.check, { color: theme.accent }]}>{active ? "✓" : ""}</Text>
          </TouchableOpacity>
        );
      })}

      <View style={[styles.mirrorRow, { borderTopColor: theme.colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>Save SnapShift events to iPhone Calendar</Text>
          <Text style={[styles.rowSub, { color: theme.colors.textMuted }]}>
            Creates a "SnapShift" calendar in the iPhone Calendar app and writes events there.
          </Text>
        </View>
        <Switch value={mirrorOn} onValueChange={handleMirrorToggle} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  primaryBtn: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  rowTitle: { fontSize: 15, fontWeight: "500" },
  rowSub: { fontSize: 12, marginTop: 2 },
  check: { fontSize: 18, fontWeight: "700" },
  mirrorRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginTop: 24,
    borderTopWidth: 1,
    gap: 12,
  },
});
