// components/SharedPeopleFilter.tsx
// Bottom-sheet modal opened from the Weekly view header that lets the user:
//   - master-toggle whether imported shared schedules are drawn at all
//   - per-person hide/show via a checkbox
//   - per-person color override via an inline palette
//   - jump into Settings to delete/rename via "Manage in Settings →"
//
// All state is hoisted — callbacks fire and the parent persists + reloads.
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.colors.surface }]}
          // Stop tap-through so taps inside the sheet don't dismiss it.
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Shared schedules
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <FontAwesome name="close" size={22} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.rowText, { color: theme.colors.textPrimary }]}>
              Show on weekly view
            </Text>
            <Switch
              value={overlayEnabled}
              onValueChange={onToggleOverlay}
              trackColor={{ false: theme.colors.border, true: theme.accent }}
            />
          </View>

          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 4 }}>
            {people.length === 0 ? (
              <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
                No imported schedules yet.
              </Text>
            ) : (
              people.map((p) => {
                const visible = !p.hidden;
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
                        checked={visible}
                        onChange={(next) => onTogglePerson(p.id, next)}
                        accessibilityLabel={`Show ${p.name}'s schedule`}
                        disabled={!overlayEnabled}
                      />
                      <Pressable
                        onPress={() =>
                          setEditingColorFor(editing ? null : p.id)
                        }
                        hitSlop={6}
                        accessibilityLabel={`Change color for ${p.name}`}
                        style={[
                          styles.swatch,
                          {
                            backgroundColor: swatch,
                            borderColor: editing ? theme.colors.textPrimary : "transparent",
                          },
                        ]}
                      />
                      <Text
                        style={[styles.personName, { color: theme.colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                    </View>
                    {editing && (
                      <View style={[styles.paletteRow, { borderBottomColor: theme.colors.border }]}>
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
                            <Text style={[styles.resetText, { color: theme.colors.textSecondary }]}>
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

          <Pressable onPress={onManagePress} style={styles.manage} hitSlop={6}>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "75%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { fontSize: 16 },
  list: { maxHeight: 360 },
  empty: { padding: 20, textAlign: "center", fontStyle: "italic" },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  personName: { flex: 1, fontSize: 16 },
  paletteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  palette: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  paletteSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
  },
  resetBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  resetText: { fontSize: 13, fontWeight: "600" },
  manage: {
    paddingHorizontal: 20,
    paddingTop: 14,
    alignSelf: "flex-end",
  },
  manageText: { fontSize: 14, fontWeight: "600" },
});
