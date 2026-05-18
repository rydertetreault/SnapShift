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

export default function AddEventScreen() {
  const router = useRouter();

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
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>New Event</Text>

        {/* Title */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder='e.g. "Dr. Smith Appointment"'
          placeholderTextColor="#bbb"
          returnKeyType="done"
        />

        {/* Date */}
        <PickerField
          label="Date"
          value={date}
          mode="date"
          onChange={setDate}
        />

        {/* Start Time */}
        <PickerField
          label="Start Time"
          value={startTime}
          mode="time"
          onChange={setStartTime}
        />

        {/* End Time */}
        <PickerField
          label="End Time"
          value={endTime}
          mode="time"
          onChange={setEndTime}
        />

        {/* Repeat */}
        <RepeatPicker value={recurrence} onChange={setRecurrence} />

        {/* Category */}
        <Text style={[styles.label, { marginTop: 20 }]}>Category</Text>
        <CategoryPicker selected={category} onSelect={setCategory} />

        {/* Notes */}
        <Text style={[styles.label, { marginTop: 20 }]}>
          Notes (optional)
        </Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any extra details..."
          placeholderTextColor="#bbb"
          multiline
        />

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
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
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#222",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    color: "#333",
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 28,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
