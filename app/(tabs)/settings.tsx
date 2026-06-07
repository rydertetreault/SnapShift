import { Children, ReactNode, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
  Alert,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, formatDistanceToNow, parse } from "date-fns";
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
import Checkbox from "@/components/Checkbox";
import {
  getCanvasFeedUrl,
  getCanvasLastSyncedAt,
  clearCanvasFeedUrl,
  looksLikeCanvasFeedUrl,
} from "@/lib/canvas/preferences";
import { connectCanvas, syncCanvas } from "@/lib/canvas/sync";
import { deleteAllCanvasEvents } from "@/lib/storage";
import { openAppStoreReviewPage } from "@/lib/review";
import { sentryEnabled, sendSentryTestEvent } from "@/lib/sentry";

const toDate = (hhmm: string): Date => parse(hhmm, "HH:mm", new Date());
const toHHmm = (d: Date): string => format(d, "HH:mm");
const toDisplay = (hhmm: string): string =>
  format(parse(hhmm, "HH:mm", new Date()), "h:mm a");

// A titled group with an optional one-line description, wrapping its rows/content
// in a single card. Gives every section consistent spacing and visual separation.
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>{title}</Text>
      {description ? (
        <Text style={[styles.sectionDesc, { color: theme.colors.textSecondary }]}>
          {description}
        </Text>
      ) : null}
      <Card>{children}</Card>
    </View>
  );
}

// Rounded card that draws a hairline divider between each of its direct children,
// so rows no longer need their own borders (which is what made things feel cramped).
function Card({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const items = Children.toArray(children);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 ? (
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          ) : null}
          {child}
        </View>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const appearance = useAppearance();
  const overrides = useCategoryOverrides();
  const defaultShift = useDefaultShift();
  const [shiftPickerMode, setShiftPickerMode] = useState<null | "start" | "end">(null);
  const [granted, setGranted] = useState(false);
  const [calendars, setCalendars] = useState<IosCalendar[]>([]);
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);
  const [mirrorOn, setMirrorOn] = useState(false);
  const [editingKey, setEditingKey] = useState<EventCategory | null>(null);

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

  function renderAppearanceSection() {
    return (
      <Section title="Appearance">
        <View style={styles.cardBody}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>Theme</Text>
          <View style={styles.pillRow}>
            {(["system", "light", "dark"] as const).map((mode) => {
              const active = appearance.mode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.pill,
                    { backgroundColor: active ? theme.accent : theme.colors.surfaceAlt },
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

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced, { color: theme.colors.textMuted }]}>
            Accent color
          </Text>
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
        </View>
      </Section>
    );
  }

  function renderCategoriesSection() {
    return (
      <Section title="Categories" description="Tap a category to rename it or change its color.">
        {ALL_CATEGORIES.map((key) => {
          const resolved = resolveCategory(key, overrides);
          return (
            <Pressable key={key} onPress={() => setEditingKey(key)} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: resolved.color }]} />
              <Text style={[styles.categoryName, { color: theme.colors.textPrimary }]}>
                {resolved.name}
              </Text>
              <Text style={[styles.chevron, { color: theme.colors.textMuted }]}>›</Text>
            </Pressable>
          );
        })}
      </Section>
    );
  }

  function renderDefaultShiftSection() {
    return (
      <Section
        title="Default Shift Hours"
        description="Apply a fixed start and end time to every shift you upload, instead of the times read from the screenshot."
      >
        <View style={styles.row}>
          <Text style={[styles.rowTitle, { color: theme.colors.textPrimary, flex: 1 }]}>
            Override extracted shift times
          </Text>
          <Switch
            value={defaultShift.enabled}
            onValueChange={(enabled) => setDefaultShift({ ...defaultShift, enabled })}
          />
        </View>
        {defaultShift.enabled ? (
          <Pressable onPress={() => setShiftPickerMode("start")} style={styles.row}>
            <Text style={[styles.rowTitle, { color: theme.colors.textPrimary, flex: 1 }]}>Start</Text>
            <Text style={[styles.rowValue, { color: theme.accent }]}>
              {toDisplay(defaultShift.startTime)}
            </Text>
          </Pressable>
        ) : null}
        {defaultShift.enabled ? (
          <Pressable onPress={() => setShiftPickerMode("end")} style={styles.row}>
            <Text style={[styles.rowTitle, { color: theme.colors.textPrimary, flex: 1 }]}>End</Text>
            <Text style={[styles.rowValue, { color: theme.accent }]}>
              {toDisplay(defaultShift.endTime)}
            </Text>
          </Pressable>
        ) : null}
      </Section>
    );
  }

  function renderCanvasSection() {
    if (canvasUrl) {
      return (
        <Section title="Canvas">
          <View style={styles.cardBody}>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              Connected. Your Canvas assignments and calendar events show up as
              school-category events.
              {canvasLastSyncedAt
                ? ` Last synced ${formatDistanceToNow(new Date(canvasLastSyncedAt), {
                    addSuffix: true,
                  })}.`
                : ""}
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.accent }, canvasBusy && styles.btnDisabled]}
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
              style={[
                styles.secondaryBtn,
                { borderColor: theme.colors.border },
                canvasBusy && styles.btnDisabled,
              ]}
              onPress={handleCanvasDisconnect}
              disabled={canvasBusy}
            >
              {/* TODO(v1.3): theme.colors.destructive */}
              <Text style={[styles.secondaryBtnText, { color: "#F44336" }]}>Disconnect Canvas</Text>
            </TouchableOpacity>
          </View>
        </Section>
      );
    }
    return (
      <Section
        title="Canvas"
        description="Import your Canvas assignments and events. In Canvas, open Calendar and tap “Calendar Feed” (bottom right) to copy your feed link."
      >
        <View style={styles.cardBody}>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surfaceAlt,
              },
            ]}
            value={feedInput}
            onChangeText={setFeedInput}
            placeholder="Paste your feed URL here"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!canvasBusy}
          />
          <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
            Tip: long-press the field above and tap Paste.
          </Text>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: theme.accent },
              (canvasBusy || !feedInput.trim()) && styles.btnDisabled,
            ]}
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
      </Section>
    );
  }

  function renderCalendarSection() {
    if (!granted) {
      return (
        <Section title="iPhone Calendar">
          <View style={styles.cardBody}>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              Connect iPhone Calendar to see your existing events alongside SnapShift
              events, and optionally save SnapShift events back to your iPhone Calendar.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
              onPress={handleGrant}
            >
              <Text style={styles.primaryBtnText}>Grant Calendar Access</Text>
            </TouchableOpacity>
          </View>
        </Section>
      );
    }
    return (
      <Section
        title="iPhone Calendar"
        description="Choose which calendars appear alongside SnapShift events."
      >
        {calendars.map((c) => {
          const active = selectedIds.includes(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              style={styles.row}
              onPress={() => toggleCalendar(c.id)}
            >
              <View style={[styles.dot, { backgroundColor: c.color || theme.colors.textMuted }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>{c.title}</Text>
                <Text style={[styles.rowSub, { color: theme.colors.textMuted }]}>{c.source}</Text>
              </View>
              <Checkbox
                checked={active}
                onChange={() => toggleCalendar(c.id)}
                accessibilityLabel={`Show events from ${c.title}`}
              />
            </TouchableOpacity>
          );
        })}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>
              Save SnapShift events to iPhone Calendar
            </Text>
            <Text style={[styles.rowSub, { color: theme.colors.textMuted }]}>
              Creates a "SnapShift" calendar in the iPhone Calendar app and writes events there.
            </Text>
          </View>
          <Switch value={mirrorOn} onValueChange={handleMirrorToggle} />
        </View>
      </Section>
    );
  }

  function renderReviewSection() {
    return (
      <Section title="Support SnapShift">
        <View style={styles.cardBody}>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            SnapShift is built by one person. If it's helping you stay on top of your
            schedule, a quick App Store review means a lot and helps others find it.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
            onPress={openAppStoreReviewPage}
          >
            <Text style={styles.primaryBtnText}>Leave a Review</Text>
          </TouchableOpacity>
        </View>
      </Section>
    );
  }

  function renderDiagnosticsSection() {
    // Only shown once a Sentry DSN is configured. Safe to leave in production —
    // it just fires a known test error. Remove the section if you'd rather not
    // expose it to users.
    if (!sentryEnabled) return null;
    return (
      <Section
        title="Diagnostics"
        description="Confirm crash reporting is working. Test events only send from TestFlight / App Store builds, not local development."
      >
        <View style={styles.cardBody}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.colors.border, marginTop: 0 }]}
            onPress={() => {
              sendSentryTestEvent();
              Alert.alert(
                "Test event sent",
                "On a TestFlight or App Store build it should appear in Sentry within a minute."
              );
            }}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.colors.textPrimary }]}>
              Send test report
            </Text>
          </TouchableOpacity>
        </View>
      </Section>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.surfaceAlt }]}
      contentContainerStyle={styles.content}
    >
      {renderAppearanceSection()}
      {renderCategoriesSection()}
      {renderDefaultShiftSection()}
      {renderCanvasSection()}
      {renderCalendarSection()}
      {renderReviewSection()}
      {renderDiagnosticsSection()}

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

      <Modal visible={shiftPickerMode !== null} animationType="slide" transparent>
        <View style={[styles.modalBackdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {shiftPickerMode === "start" ? "Start time" : "End time"}
            </Text>
            {shiftPickerMode && (
              <DateTimePicker
                value={toDate(
                  shiftPickerMode === "start" ? defaultShift.startTime : defaultShift.endTime
                )}
                mode="time"
                display="spinner"
                themeVariant={theme.mode}
                onChange={(_, selected) => {
                  if (!selected) return;
                  const next: DefaultShift =
                    shiftPickerMode === "start"
                      ? { ...defaultShift, startTime: toHHmm(selected) }
                      : { ...defaultShift, endTime: toHHmm(selected) };
                  setDefaultShift(next);
                }}
              />
            )}
            <Pressable
              onPress={() => setShiftPickerMode(null)}
              style={[styles.modalDone, { backgroundColor: theme.accent }]}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },

  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
    marginLeft: 4,
    marginRight: 4,
  },

  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  cardBody: { padding: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 54,
    gap: 12,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  fieldLabelSpaced: { marginTop: 20 },
  bodyText: { fontSize: 15, lineHeight: 22, marginBottom: 16 },

  primaryBtn: { padding: 14, borderRadius: 10, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 10,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },

  dot: { width: 14, height: 14, borderRadius: 7 },
  rowTitle: { fontSize: 15, fontWeight: "500" },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowValue: { fontSize: 15, fontWeight: "600" },
  categoryName: { flex: 1, fontSize: 15, fontWeight: "500" },
  chevron: { fontSize: 22, fontWeight: "300" },

  pillRow: { flexDirection: "row", gap: 8 },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  pillText: { fontSize: 14, fontWeight: "600" },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },

  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 6 },
  hint: { fontSize: 12, marginBottom: 16 },

  modalBackdrop: { flex: 1, justifyContent: "flex-end" },
  modalSheet: { padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16, alignItems: "stretch" },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  modalDone: { marginTop: 12, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
});
