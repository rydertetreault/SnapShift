// components/SharedPeopleFilter.tsx
// Dropdown panel anchored under the Weekly view's "Shared" button. Lets the user:
//   - master-toggle whether imported shared schedules are drawn at all
//   - per-person hide/show via a checkbox
//   - per-person color override via an inline palette (tap the swatch to open)
//   - jump into Settings to delete/rename via "Manage in Settings →"
//
// Renders inside a transparent Modal so it can float above the page chrome and
// dismiss on outside-tap, but visually it's a dropdown — anchored at `anchorY`
// (the screen-Y of the bottom of the trigger button).
import { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { ACCENT_PALETTE } from "@/lib/preferences";
import { SharedPerson } from "@/lib/sharing/types";
import Checkbox from "./Checkbox";

interface Props {
  visible: boolean;
  people: SharedPerson[];
  overlayEnabled: boolean;
  /** Screen-Y (px) the dropdown should drop from. Bottom of the trigger row. */
  anchorY: number;
  /** Derives the auto color from a person id when the user hasn't picked one. */
  autoColorFor: (personId: string) => string;
  onToggleOverlay: (enabled: boolean) => void;
  onTogglePerson: (id: string, visible: boolean) => void;
  onChangePersonColor: (id: string, color: string | undefined) => void;
  onManagePress: () => void;
  onClose: () => void;
}

export default function SharedPeopleFilter({
  visible,
  people,
  overlayEnabled,
  anchorY,
  autoColorFor,
  onToggleOverlay,
  onTogglePerson,
  onChangePersonColor,
  onManagePress,
  onClose,
}: Props) {
  const theme = useTheme();
  const [editingColorFor, setEditingColorFor] = useState<string | null>(null);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.panel,
            {
              top: anchorY + 4,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: "#000",
            },
          ]}
          // Stop tap-through so taps inside the panel don't dismiss it.
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                Shared schedules
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                Tap a color dot to recolor • uncheck to hide
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <FontAwesome name="close" size={20} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          {/* Master toggle */}
          <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowText, { color: theme.colors.textPrimary }]}>
                Show on weekly view
              </Text>
              <Text style={[styles.rowSub, { color: theme.colors.textMuted }]}>
                Master toggle for all imported schedules
              </Text>
            </View>
            <Switch
              value={overlayEnabled}
              onValueChange={onToggleOverlay}
              trackColor={{ false: theme.colors.border, true: theme.accent }}
            />
          </View>

          {/* People list */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 4 }}
            keyboardShouldPersistTaps="handled"
          >
            {people.length === 0 ? (
              <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
                No imported schedules yet.
              </Text>
            ) : (
              people.map((p) => {
                const isVisible = !p.hidden;
                const swatch = p.color ?? autoColorFor(p.id);
                const editing = editingColorFor === p.id;
                return (
                  <View key={p.id}>
                    <View
                      style={[
                        styles.personRow,
                        { borderBottomColor: theme.colors.border },
                        !overlayEnabled && { opacity: 0.45 },
                      ]}
                    >
                      <Checkbox
                        checked={isVisible}
                        onChange={(next) => onTogglePerson(p.id, next)}
                        accessibilityLabel={`Show ${p.name}'s schedule`}
                        disabled={!overlayEnabled}
                      />
                      {/* Color swatch — wrapped in a labeled, more obvious pressable */}
                      <Pressable
                        onPress={() => setEditingColorFor(editing ? null : p.id)}
                        hitSlop={8}
                        accessibilityLabel={`Change color for ${p.name}`}
                        style={({ pressed }) => [
                          styles.swatchBtn,
                          {
                            borderColor: editing
                              ? theme.accent
                              : theme.colors.border,
                            backgroundColor: pressed
                              ? theme.colors.background
                              : "transparent",
                          },
                        ]}
                      >
                        <View
                          style={[styles.swatchDot, { backgroundColor: swatch }]}
                        />
                        <FontAwesome
                          name={editing ? "caret-up" : "caret-down"}
                          size={12}
                          color={theme.colors.textMuted}
                        />
                      </Pressable>
                      <Text
                        style={[styles.personName, { color: theme.colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                    </View>
                    {editing && (
                      <View
                        style={[
                          styles.paletteRow,
                          {
                            borderBottomColor: theme.colors.border,
                            backgroundColor: theme.colors.background,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.paletteHint, { color: theme.colors.textMuted }]}
                        >
                          Pick a color
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.palette}
                        >
                          {ACCENT_PALETTE.map((c) => (
                            <Pressable
                              key={c}
                              onPress={() => {
                                onChangePersonColor(p.id, c);
                                setEditingColorFor(null);
                              }}
                              style={[
                                styles.paletteSwatch,
                                {
                                  backgroundColor: c,
                                  borderColor:
                                    c.toLowerCase() === swatch.toLowerCase()
                                      ? theme.colors.textPrimary
                                      : "transparent",
                                },
                              ]}
                            />
                          ))}
                        </ScrollView>
                        {p.color !== undefined && (
                          <Pressable
                            onPress={() => {
                              onChangePersonColor(p.id, undefined);
                              setEditingColorFor(null);
                            }}
                            style={styles.resetBtn}
                          >
                            <Text
                              style={[styles.resetText, { color: theme.colors.textSecondary }]}
                            >
                              Reset
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer */}
          <Pressable
            onPress={onManagePress}
            style={[styles.manage, { borderTopColor: theme.colors.border }]}
            hitSlop={6}
          >
            <Text style={[styles.manageText, { color: theme.accent }]}>
              Manage in Settings →
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  panel: {
    position: "absolute",
    right: 8,
    left: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    maxHeight: "75%",
    // shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowText: { fontSize: 15, fontWeight: "500" },
  rowSub: { fontSize: 12, marginTop: 2 },
  list: { maxHeight: 360 },
  empty: { padding: 20, textAlign: "center", fontStyle: "italic" },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  swatchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 16,
  },
  swatchDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  personName: { flex: 1, fontSize: 15, fontWeight: "500" },
  paletteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  paletteHint: { fontSize: 12, fontWeight: "600", marginRight: 4 },
  palette: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  paletteSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
  },
  resetBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  resetText: { fontSize: 12, fontWeight: "600" },
  manage: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-end",
  },
  manageText: { fontSize: 13, fontWeight: "600" },
});
