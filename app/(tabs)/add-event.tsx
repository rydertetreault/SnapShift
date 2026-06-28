import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { format } from "date-fns";
import { EventCategory, Recurrence, ScheduleEvent } from "@/lib/types";
import { saveMultipleEvents } from "@/lib/storage";
import { expandRecurrence } from "@/lib/recurrence";
import CategoryPicker from "@/components/CategoryPicker";
import PickerField from "@/components/PickerField";
import RepeatPicker from "@/components/RepeatPicker";
import { useTheme } from "@/lib/theme/ThemeProvider";

export default function AddEventScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  });
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 2);
    return d;
  });
  const [category, setCategory] = useState<EventCategory>("personal");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>({ frequency: "none" });

  function resetForm() {
    setTitle("");
    setDate(new Date());
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    setStartTime(now);
    const later = new Date(now);
    later.setHours(later.getHours() + 1);
    setEndTime(later);
    setCategory("personal");
    setNotes("");
    setRecurrence({ frequency: "none" });
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a title for this event.");
      return;
    }
    const dateStr = format(date, "yyyy-MM-dd");
    const start = new Date(date);
    start.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    const end = new Date(date);
    end.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
    if (end <= start) {
      Alert.alert("Invalid Times", "End time must be after start time.");
      return;
    }

    const seriesId = recurrence.frequency === "none" ? undefined : randomId();
    const dates = expandRecurrence(dateStr, recurrence);

    const events: ScheduleEvent[] = dates.map((d) => {
      const occStart = withDate(d, start);
      const occEnd = withDate(d, end);
      return {
        id: randomId(),
        title: title.trim(),
        date: d,
        startTime: occStart.toISOString(),
        endTime: occEnd.toISOString(),
        category,
        source: "manual",
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
        seriesId,
        recurrence: seriesId ? recurrence : undefined,
      };
    });

    await saveMultipleEvents(events);

    const msg = events.length === 1
      ? `"${events[0].title}" added to your schedule.`
      : `${events.length} occurrences of "${events[0].title}" added.`;
    Alert.alert("Saved", msg, [{ text: "OK", onPress: () => { resetForm(); router.navigate("/(tabs)"); } }]);
  }

  function randomId() {
    return Math.random().toString(36).substring(2, 10);
  }

  function withDate(dateStr: string, timeSource: Date): Date {
    const d = new Date(dateStr + "T00:00:00");
    d.setHours(timeSource.getHours(), timeSource.getMinutes(), 0, 0);
    return d;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.surface }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>New Event</Text>

        {/* TITLE */}
        <Text style={[styles.sectionHeader, { color: theme.colors.textMuted }]}>Title</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
          <TextInput
            style={[styles.cardInput, { color: theme.colors.textPrimary }]}
            value={title}
            onChangeText={setTitle}
            placeholder='e.g. "Dr. Smith Appointment"'
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType="done"
          />
        </View>

        {/* WHEN */}
        <Text style={[styles.sectionHeader, { color: theme.colors.textMuted }]}>When</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
          <View style={styles.cardRow}>
            <PickerField
              label="Date"
              value={date}
              mode="date"
              onChange={setDate}
              containerStyle={styles.pickerInCard}
            />
          </View>
          <View style={[styles.cardDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.cardRow}>
            <PickerField
              label="Start Time"
              value={startTime}
              mode="time"
              onChange={setStartTime}
              containerStyle={styles.pickerInCard}
            />
          </View>
          <View style={[styles.cardDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.cardRow}>
            <PickerField
              label="End Time"
              value={endTime}
              mode="time"
              onChange={setEndTime}
              containerStyle={styles.pickerInCard}
            />
          </View>
        </View>

        {/* REPEAT */}
        <Text style={[styles.sectionHeader, { color: theme.colors.textMuted }]}>Repeat</Text>
        <View style={[styles.card, styles.cardTight, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
          <RepeatPicker value={recurrence} onChange={setRecurrence} />
        </View>

        {/* CATEGORY */}
        <Text style={[styles.sectionHeader, { color: theme.colors.textMuted }]}>Category</Text>
        <View style={[styles.card, styles.cardTight, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
          <CategoryPicker selected={category} onSelect={setCategory} />
        </View>

        {/* NOTES */}
        <Text style={[styles.sectionHeader, { color: theme.colors.textMuted }]}>Notes (optional)</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
          <TextInput
            style={[styles.cardInput, styles.notesInput, { color: theme.colors.textPrimary }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any extra details..."
            placeholderTextColor={theme.colors.textMuted}
            multiline
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.accent }]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>Save Event</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardTight: {
    // RepeatPicker and CategoryPicker render their own chips/pills with no
    // internal padding — add it on the card so the chips breathe inside.
    padding: 14,
  },
  cardRow: {
    paddingHorizontal: 14,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 14,
  },
  cardInput: {
    padding: 14,
    fontSize: 16,
  },
  pickerInCard: {
    marginBottom: 0,
    paddingVertical: 10,
    minHeight: 44,
  },
  // Legacy — kept for now since other call sites may still reference it.
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 28,
  },
  saveButtonText: {
    // Text on accent-filled button — keep white literal per token mapping.
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
