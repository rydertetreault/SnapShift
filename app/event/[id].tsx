import { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { format, parseISO } from "date-fns";
import * as Calendar from "expo-calendar";
import { ScheduleEvent, EventCategory } from "@/lib/types";
import { getEventById, updateEvent, deleteEvent } from "@/lib/storage";
import { deleteFutureInSeries, deleteSeries, updateSeries } from "@/lib/storage";
import CategoryPicker from "@/components/CategoryPicker";
import PickerField from "@/components/PickerField";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useCategoryOverrides, resolveCategory } from "@/lib/preferences";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const overrides = useCategoryOverrides();
  const [event, setEvent] = useState<ScheduleEvent | null>(null);
  const [editing, setEditing] = useState(false);

  // Editable fields
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [category, setCategory] = useState<EventCategory>("other");
  const [notes, setNotes] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadEvent();
    }, [id])
  );

  async function loadEvent() {
    if (!id) return;
    const found = await getEventById(id);
    if (found) {
      setEvent(found);
      setTitle(found.title);
      setDate(parseISO(found.date));
      setStartTime(parseISO(found.startTime));
      setEndTime(parseISO(found.endTime));
      setCategory(found.category);
      setNotes(found.notes || "");
    }
  }

  function resetEdits() {
    if (!event) return;
    setTitle(event.title);
    setDate(parseISO(event.date));
    setStartTime(parseISO(event.startTime));
    setEndTime(parseISO(event.endTime));
    setCategory(event.category);
    setNotes(event.notes || "");
    setEditing(false);
  }

  async function handleSave() {
    if (!event) return;
    if (!title.trim()) {
      Alert.alert("Error", "Title is required");
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

    const updates = {
      title: title.trim(),
      category,
      notes: notes.trim() || undefined,
    };

    // Time-of-day updates apply across the series; date updates only make sense for one event.
    const timeUpdates = {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };

    if (!event.seriesId) {
      await updateEvent(event.id, { ...updates, date: dateStr, ...timeUpdates });
      setEditing(false);
      await loadEvent();
      return;
    }

    Alert.alert("Edit Repeating Event", "Apply changes to:", [
      { text: "Cancel", style: "cancel" },
      {
        text: "This event only",
        onPress: async () => {
          // Detach this occurrence from the series so series-level edits won't clobber it.
          await updateEvent(event.id, { ...updates, date: dateStr, ...timeUpdates, seriesId: undefined });
          setEditing(false);
          await loadEvent();
        },
      },
      {
        text: "This and future events",
        onPress: async () => {
          // Apply title/category/notes + time-of-day to every future occurrence; leave dates alone.
          await updateSeries(event.seriesId!, { ...updates, ...timeUpdates }, event.date);
          setEditing(false);
          await loadEvent();
        },
      },
      {
        text: "All events in the series",
        onPress: async () => {
          await updateSeries(event.seriesId!, { ...updates, ...timeUpdates });
          setEditing(false);
          await loadEvent();
        },
      },
    ]);
  }

  async function handleDelete() {
    if (!event) return;

    if (!event.seriesId) {
      Alert.alert("Delete Event", `Delete "${event.title}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteEvent(event.id);
            router.back();
          },
        },
      ]);
      return;
    }

    Alert.alert("Delete Repeating Event", "What would you like to delete?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "This event only",
        onPress: async () => {
          await deleteEvent(event.id);
          router.back();
        },
      },
      {
        text: "This and future events",
        style: "destructive",
        onPress: async () => {
          await deleteFutureInSeries(event.seriesId!, event.date);
          router.back();
        },
      },
      {
        text: "All events in the series",
        style: "destructive",
        onPress: async () => {
          await deleteSeries(event.seriesId!);
          router.back();
        },
      },
    ]);
  }

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>Loading...</Text>
      </View>
    );
  }

  const displayStart = format(parseISO(event.startTime), "h:mm a");
  const displayEnd = format(parseISO(event.endTime), "h:mm a");
  const dateDisplay = format(parseISO(event.date), "EEEE, MMMM d, yyyy");
  const resolved = resolveCategory(event.category, overrides);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      contentContainerStyle={styles.content}
    >
      {/* Color banner */}
      <View style={[styles.banner, { backgroundColor: resolved.color }]}>
        <Text style={styles.bannerCategory}>{resolved.name}</Text>
        <Text style={styles.bannerSource}>
          {event.source === "ai"
            ? "From screenshot"
            : event.source === "ios"
            ? "From iPhone Calendar"
            : "Manual entry"}
        </Text>
      </View>

      {editing ? (
        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Title</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Event title"
            placeholderTextColor={theme.colors.textMuted}
          />

          <PickerField
            label="Date"
            value={date}
            mode="date"
            onChange={setDate}
          />

          <PickerField
            label="Start Time"
            value={startTime}
            mode="time"
            onChange={setStartTime}
          />

          <PickerField
            label="End Time"
            value={endTime}
            mode="time"
            onChange={setEndTime}
          />

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Category</Text>
          <CategoryPicker selected={category} onSelect={setCategory} />

          <Text style={[styles.label, { color: theme.colors.textMuted, marginTop: 16 }]}>Notes</Text>
          <TextInput
            style={[
              styles.input,
              styles.notesInput,
              { borderColor: theme.colors.border, color: theme.colors.textPrimary },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes"
            placeholderTextColor={theme.colors.textMuted}
            multiline
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.surfaceAlt }]}
              onPress={resetEdits}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.accent }]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.details}>
          <Text style={[styles.eventTitle, { color: theme.colors.textPrimary }]}>{event.title}</Text>
          <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>{dateDisplay}</Text>
          <Text style={[styles.timeText, { color: theme.colors.textPrimary }]}>
            {event.allDay ? "All day" : `${displayStart} - ${displayEnd}`}
          </Text>

          {event.notes ? (
            <View style={styles.notesSection}>
              <Text style={[styles.label, { color: theme.colors.textMuted }]}>Notes</Text>
              <Text style={[styles.notesText, { color: theme.colors.textSecondary }]}>{event.notes}</Text>
            </View>
          ) : null}

          {event.source === "ios" ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.accent }]}
                onPress={() =>
                  Calendar.openEventInCalendarAsync({
                    id: event.iosCalendarEventId!,
                  })
                }
              >
                <Text style={styles.editButtonText}>Open in Calendar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.accent }]}
                onPress={() => setEditing(true)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.deleteButton,
                  { backgroundColor: theme.colors.surface },
                ]}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  banner: {
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 12 : 20,
  },
  bannerCategory: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  bannerSource: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 4,
  },
  details: {
    paddingHorizontal: 20,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
  },
  dateText: {
    fontSize: 16,
    marginTop: 8,
  },
  timeText: {
    fontSize: 18,
    marginTop: 4,
    fontWeight: "500",
  },
  notesSection: {
    marginTop: 20,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 4,
  },
  notesInput: {
    height: 100,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    borderWidth: 2,
    borderColor: "#F44336", // TODO(v1.3): theme.colors.destructive
  },
  deleteButtonText: {
    color: "#F44336", // TODO(v1.3): theme.colors.destructive
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
