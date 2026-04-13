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
import { EventCategory, ScheduleEvent } from "@/lib/types";
import { saveEvent } from "@/lib/storage";
import CategoryPicker from "@/components/CategoryPicker";
import PickerField from "@/components/PickerField";

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
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a title for this event.");
      return;
    }

    // Build the full start/end datetimes using the selected date + times
    const dateStr = format(date, "yyyy-MM-dd");

    const start = new Date(date);
    start.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

    const end = new Date(date);
    end.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

    if (end <= start) {
      Alert.alert(
        "Invalid Times",
        "End time must be after start time."
      );
      return;
    }

    const event: ScheduleEvent = {
      id: Math.random().toString(36).substring(2, 10),
      title: title.trim(),
      date: dateStr,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      category,
      source: "manual",
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    await saveEvent(event);

    Alert.alert("Saved", `"${event.title}" added to your schedule.`, [
      {
        text: "OK",
        onPress: () => {
          resetForm();
          router.navigate("/(tabs)");
        },
      },
    ]);
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

        {/* Category */}
        <Text style={styles.label}>Category</Text>
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
