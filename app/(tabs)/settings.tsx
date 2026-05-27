import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
  Alert,
  Pressable,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, parse } from "date-fns";
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
import {
  ACCENT_PALETTE,
  setAppearance,
  useAppearance,
  resolveCategory,
  useCategoryOverrides,
  setCategoryOverrides,
  CategoryOverrides,
  useDefaultShift,
  setDefaultShift,
  DefaultShift,
} from "@/lib/preferences";
import { ALL_CATEGORIES } from "@/lib/constants";
import { EventCategory } from "@/lib/types";
import CategoryEditModal from "@/components/CategoryEditModal";

const toDate = (hhmm: string): Date => parse(hhmm, "HH:mm", new Date());
const toHHmm = (d: Date): string => format(d, "HH:mm");
const toDisplay = (hhmm: string): string =>
  format(parse(hhmm, "HH:mm", new Date()), "h:mm a");

export default function SettingsScreen() {
  const theme = useTheme();
  const appearance = useAppearance();
  const overrides = useCategoryOverrides();
  const defaultShift = useDefaultShift();
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [granted, setGranted] = useState(false);
  const [calendars, setCalendars] = useState<IosCalendar[]>([]);
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);
  const [mirrorOn, setMirrorOn] = useState(false);
  const [editingKey, setEditingKey] = useState<EventCategory | null>(null);

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
        <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Appearance</Text>
        <View style={styles.pillRow}>
          {(["system", "light", "dark"] as const).map((mode) => {
            const active = appearance.mode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? theme.accent : theme.colors.surfaceAlt,
                  },
                ]}
                onPress={() => setAppearance({ ...appearance, mode })}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: active ? "#fff" : theme.colors.textSecondary },
                  ]}
                >
                  {mode === "system" ? "System" : mode === "light" ? "Light" : "Dark"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>Accent color</Text>
        <View style={styles.swatchRow}>
          {ACCENT_PALETTE.map((accent) => {
            const selected = appearance.accent.toLowerCase() === accent.toLowerCase();
            return (
              <TouchableOpacity
                key={accent}
                onPress={() => setAppearance({ ...appearance, accent })}
                style={[
                  styles.swatch,
                  {
                    backgroundColor: accent,
                    borderColor: selected ? theme.colors.textPrimary : "transparent",
                  },
                ]}
              />
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>Categories</Text>
        {ALL_CATEGORIES.map((key) => {
          const resolved = resolveCategory(key, overrides);
          return (
            <Pressable
              key={key}
              onPress={() => setEditingKey(key)}
              style={[styles.categoryRow, { borderBottomColor: theme.colors.border }]}
            >
              <View style={[styles.dot, { backgroundColor: resolved.color }]} />
              <Text style={[styles.categoryName, { color: theme.colors.textPrimary }]}>{resolved.name}</Text>
              <Text style={[styles.chevron, { color: theme.colors.textMuted }]}>›</Text>
            </Pressable>
          );
        })}

        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>Default Shift Hours</Text>
        <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>
              Override extracted shift times
            </Text>
            <Text style={[styles.rowSub, { color: theme.colors.textMuted }]}>
              Apply a fixed start/end time to every uploaded shift.
            </Text>
          </View>
          <Switch
            value={defaultShift.enabled}
            onValueChange={(enabled) => {
              const next: DefaultShift = { ...defaultShift, enabled };
              setDefaultShift(next);
            }}
          />
        </View>
        {defaultShift.enabled && (
          <>
            <Pressable
              onPress={() => setShowStartPicker(true)}
              style={[styles.row, { borderBottomColor: theme.colors.border }]}
            >
              <Text style={[styles.rowTitle, { color: theme.colors.textPrimary, flex: 1 }]}>Start</Text>
              <Text style={[styles.rowValue, { color: theme.accent }]}>{toDisplay(defaultShift.startTime)}</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowEndPicker(true)}
              style={[styles.row, { borderBottomColor: theme.colors.border }]}
            >
              <Text style={[styles.rowTitle, { color: theme.colors.textPrimary, flex: 1 }]}>End</Text>
              <Text style={[styles.rowValue, { color: theme.accent }]}>{toDisplay(defaultShift.endTime)}</Text>
            </Pressable>
            {showStartPicker && (
              <DateTimePicker
                value={toDate(defaultShift.startTime)}
                mode="time"
                display="default"
                themeVariant={theme.mode}
                onChange={(event, selected) => {
                  setShowStartPicker(false);
                  if (selected) {
                    const next: DefaultShift = { ...defaultShift, startTime: toHHmm(selected) };
                    setDefaultShift(next);
                  }
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={toDate(defaultShift.endTime)}
                mode="time"
                display="default"
                themeVariant={theme.mode}
                onChange={(event, selected) => {
                  setShowEndPicker(false);
                  if (selected) {
                    const next: DefaultShift = { ...defaultShift, endTime: toHHmm(selected) };
                    setDefaultShift(next);
                  }
                }}
              />
            )}
          </>
        )}

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

        <CategoryEditModal
          visible={editingKey !== null}
          categoryKey={editingKey}
          initialName={editingKey ? resolveCategory(editingKey, overrides).name : ""}
          initialColor={editingKey ? resolveCategory(editingKey, overrides).color : ""}
          onSave={async (name, color) => {
            if (!editingKey) return;
            const next: CategoryOverrides = { ...overrides, [editingKey]: { name, color } };
            await setCategoryOverrides(next);
            setEditingKey(null);
          }}
          onReset={async () => {
            if (!editingKey) return;
            const next: CategoryOverrides = { ...overrides };
            delete next[editingKey];
            await setCategoryOverrides(next);
            setEditingKey(null);
          }}
          onCancel={() => setEditingKey(null)}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Appearance</Text>
      <View style={styles.pillRow}>
        {(["system", "light", "dark"] as const).map((mode) => {
          const active = appearance.mode === mode;
          return (
            <TouchableOpacity
              key={mode}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? theme.accent : theme.colors.surfaceAlt,
                },
              ]}
              onPress={() => setAppearance({ ...appearance, mode })}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: active ? "#fff" : theme.colors.textSecondary },
                ]}
              >
                {mode === "system" ? "System" : mode === "light" ? "Light" : "Dark"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>Accent color</Text>
      <View style={styles.swatchRow}>
        {ACCENT_PALETTE.map((accent) => {
          const selected = appearance.accent.toLowerCase() === accent.toLowerCase();
          return (
            <TouchableOpacity
              key={accent}
              onPress={() => setAppearance({ ...appearance, accent })}
              style={[
                styles.swatch,
                {
                  backgroundColor: accent,
                  borderColor: selected ? theme.colors.textPrimary : "transparent",
                },
              ]}
            />
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>Categories</Text>
      {ALL_CATEGORIES.map((key) => {
        const resolved = resolveCategory(key, overrides);
        return (
          <Pressable
            key={key}
            onPress={() => setEditingKey(key)}
            style={[styles.categoryRow, { borderBottomColor: theme.colors.border }]}
          >
            <View style={[styles.dot, { backgroundColor: resolved.color }]} />
            <Text style={[styles.categoryName, { color: theme.colors.textPrimary }]}>{resolved.name}</Text>
            <Text style={[styles.chevron, { color: theme.colors.textMuted }]}>›</Text>
          </Pressable>
        );
      })}

      <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>Default Shift Hours</Text>
      <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>
            Override extracted shift times
          </Text>
          <Text style={[styles.rowSub, { color: theme.colors.textMuted }]}>
            Apply a fixed start/end time to every uploaded shift.
          </Text>
        </View>
        <Switch
          value={defaultShift.enabled}
          onValueChange={(enabled) => {
            const next: DefaultShift = { ...defaultShift, enabled };
            setDefaultShift(next);
          }}
        />
      </View>
      {defaultShift.enabled && (
        <>
          <Pressable
            onPress={() => setShowStartPicker(true)}
            style={[styles.row, { borderBottomColor: theme.colors.border }]}
          >
            <Text style={[styles.rowTitle, { color: theme.colors.textPrimary, flex: 1 }]}>Start</Text>
            <Text style={[styles.rowValue, { color: theme.accent }]}>{toDisplay(defaultShift.startTime)}</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowEndPicker(true)}
            style={[styles.row, { borderBottomColor: theme.colors.border }]}
          >
            <Text style={[styles.rowTitle, { color: theme.colors.textPrimary, flex: 1 }]}>End</Text>
            <Text style={[styles.rowValue, { color: theme.accent }]}>{toDisplay(defaultShift.endTime)}</Text>
          </Pressable>
          {showStartPicker && (
            <DateTimePicker
              value={toDate(defaultShift.startTime)}
              mode="time"
              display="default"
              themeVariant={theme.mode}
              onChange={(event, selected) => {
                setShowStartPicker(false);
                if (selected) {
                  const next: DefaultShift = { ...defaultShift, startTime: toHHmm(selected) };
                  setDefaultShift(next);
                }
              }}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={toDate(defaultShift.endTime)}
              mode="time"
              display="default"
              themeVariant={theme.mode}
              onChange={(event, selected) => {
                setShowEndPicker(false);
                if (selected) {
                  const next: DefaultShift = { ...defaultShift, endTime: toHHmm(selected) };
                  setDefaultShift(next);
                }
              }}
            />
          )}
        </>
      )}

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

      <CategoryEditModal
        visible={editingKey !== null}
        categoryKey={editingKey}
        initialName={editingKey ? resolveCategory(editingKey, overrides).name : ""}
        initialColor={editingKey ? resolveCategory(editingKey, overrides).color : ""}
        onSave={async (name, color) => {
          if (!editingKey) return;
          const next: CategoryOverrides = { ...overrides, [editingKey]: { name, color } };
          await setCategoryOverrides(next);
          setEditingKey(null);
        }}
        onReset={async () => {
          if (!editingKey) return;
          const next: CategoryOverrides = { ...overrides };
          delete next[editingKey];
          await setCategoryOverrides(next);
          setEditingKey(null);
        }}
        onCancel={() => setEditingKey(null)}
      />
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
  rowValue: { fontSize: 15, fontWeight: "600" },
  check: { fontSize: 18, fontWeight: "700" },
  mirrorRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginTop: 24,
    borderTopWidth: 1,
    gap: 12,
  },
  pillRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  pillText: { fontSize: 14, fontWeight: "600" },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingVertical: 4, marginBottom: 16 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
  categoryRow: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, gap: 12 },
  categoryName: { flex: 1, fontSize: 15, fontWeight: "500" },
  chevron: { fontSize: 22, fontWeight: "300" },
});
