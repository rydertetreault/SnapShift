// components/ColorRuleEditor.tsx
// Bottom-sheet modal: pick a color and a scope for an event.
//   - "All events titled \"X\""             → title-only rule
//   - "Only from this iPhone calendar"      → title + calendar id rule
//                                              (only offered for ios events)
//   - "Reset to default"                    → delete the matching rule
// Designed to feel familiar against the existing CategoryEditModal — same
// palette, same backdrop, same button row.
import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { ACCENT_PALETTE } from "@/lib/preferences";

type Scope = "title" | "titleAndCalendar";

interface Props {
  visible: boolean;
  title: string;
  /** Present an "only from this calendar" choice when set. */
  iosCalendarId?: string;
  /** The currently-effective color (from rules → defaults → category). */
  currentColor: string;
  /** True when an existing rule matches — enables the Reset button. */
  hasExistingRule: boolean;
  onSave: (opts: { color: string; scope: Scope }) => void;
  onReset: () => void;
  onCancel: () => void;
}

export default function ColorRuleEditor({
  visible,
  title,
  iosCalendarId,
  currentColor,
  hasExistingRule,
  onSave,
  onReset,
  onCancel,
}: Props) {
  const theme = useTheme();
  const [color, setColor] = useState(currentColor);
  const [scope, setScope] = useState<Scope>("title");

  useEffect(() => {
    if (visible) {
      setColor(currentColor);
      setScope("title");
    }
  }, [visible, currentColor]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Color
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            For events titled “{title}”
          </Text>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Color</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.palette}
          >
            {ACCENT_PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.swatch,
                  {
                    backgroundColor: c,
                    borderColor:
                      c.toLowerCase() === color.toLowerCase()
                        ? theme.colors.textPrimary
                        : "transparent",
                  },
                ]}
              />
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Apply to</Text>
          <Pressable
            onPress={() => setScope("title")}
            style={[styles.scopeRow, { borderColor: theme.colors.border }]}
          >
            <View
              style={[
                styles.radio,
                { borderColor: theme.accent },
                scope === "title" && { backgroundColor: theme.accent },
              ]}
            />
            <Text style={[styles.scopeText, { color: theme.colors.textPrimary }]} numberOfLines={2}>
              All events titled “{title}”
            </Text>
          </Pressable>
          {iosCalendarId && (
            <Pressable
              onPress={() => setScope("titleAndCalendar")}
              style={[styles.scopeRow, { borderColor: theme.colors.border }]}
            >
              <View
                style={[
                  styles.radio,
                  { borderColor: theme.accent },
                  scope === "titleAndCalendar" && { backgroundColor: theme.accent },
                ]}
              />
              <Text style={[styles.scopeText, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                Only from this iPhone calendar
              </Text>
            </Pressable>
          )}

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={[styles.btn, { borderColor: theme.colors.border }]}>
              <Text style={{ color: theme.colors.textPrimary }}>Cancel</Text>
            </Pressable>
            {hasExistingRule && (
              <Pressable onPress={onReset} style={[styles.btn, { borderColor: theme.colors.border }]}>
                <Text style={{ color: theme.colors.textSecondary }}>Reset</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => onSave({ color, scope })}
              style={[styles.btnPrimary, { backgroundColor: theme.accent }]}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 14, marginTop: 2 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
  },
  palette: { flexDirection: "row", gap: 10, paddingVertical: 8 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
  scopeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 4,
    gap: 12,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  scopeText: { flex: 1, fontSize: 15 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 20,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnPrimary: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
});
