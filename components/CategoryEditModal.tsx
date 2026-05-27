// components/CategoryEditModal.tsx
import { useEffect, useState } from "react";
import { Modal, View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { ACCENT_PALETTE } from "@/lib/preferences";
import { EventCategory } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/constants";

interface Props {
  visible: boolean;
  categoryKey: EventCategory | null;
  initialName: string;
  initialColor: string;
  onSave: (name: string, color: string) => void;
  onReset: () => void;
  onCancel: () => void;
}

export default function CategoryEditModal({
  visible, categoryKey, initialName, initialColor, onSave, onReset, onCancel,
}: Props) {
  const theme = useTheme();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  // Reset local state whenever the modal opens with a new category.
  useEffect(() => {
    if (visible) {
      setName(initialName);
      setColor(initialColor);
    }
  }, [visible, initialName, initialColor]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Edit Category</Text>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Display name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            placeholderTextColor={theme.colors.textMuted}
            maxLength={24}
          />
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Color</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.palette}>
            {ACCENT_PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.swatch,
                  { backgroundColor: c, borderColor: c.toLowerCase() === color.toLowerCase() ? theme.colors.textPrimary : "transparent" },
                ]}
              />
            ))}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={[styles.btn, { borderColor: theme.colors.border }]}>
              <Text style={{ color: theme.colors.textPrimary }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => { if (categoryKey) onReset(); }}
              style={[styles.btn, { borderColor: theme.colors.border }]}
            >
              <Text style={{ color: theme.colors.textSecondary }}>Reset</Text>
            </Pressable>
            <Pressable
              onPress={() => onSave(name.trim() || (categoryKey ? CATEGORY_LABELS[categoryKey] : ""), color)}
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
  title: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16 },
  palette: { flexDirection: "row", gap: 10, paddingVertical: 8 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 20 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  btnPrimary: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
});
