import { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";
import { Recurrence, RecurrenceFrequency, Weekday } from "@/lib/types";
import PickerField from "./PickerField";
import { format, parseISO } from "date-fns";

interface Props {
  value: Recurrence;
  onChange: (next: Recurrence) => void;
}

const PRESETS: { key: RecurrenceFrequency; label: string }[] = [
  { key: "none", label: "Never" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Biweekly" },
  { key: "monthly", label: "Monthly" },
  { key: "custom", label: "Custom" },
];

const WEEKDAYS: { d: Weekday; label: string }[] = [
  { d: 0, label: "S" },
  { d: 1, label: "M" },
  { d: 2, label: "T" },
  { d: 3, label: "W" },
  { d: 4, label: "T" },
  { d: 5, label: "F" },
  { d: 6, label: "S" },
];

export default function RepeatPicker({ value, onChange }: Props) {
  const [endMode, setEndMode] = useState<"never" | "date">(value.endDate ? "date" : "never");
  const [endDate, setEndDate] = useState<Date>(
    value.endDate ? parseISO(value.endDate) : new Date(Date.now() + 90 * 86400 * 1000)
  );

  function setFrequency(freq: RecurrenceFrequency) {
    const next: Recurrence = { ...value, frequency: freq };
    if (freq !== "custom") delete next.weekdays;
    else if (!next.weekdays) next.weekdays = [];
    onChange(next);
  }

  function toggleWeekday(d: Weekday) {
    const current = value.weekdays ?? [];
    const next = current.includes(d) ? current.filter((x) => x !== d) : [...current, d].sort();
    onChange({ ...value, weekdays: next as Weekday[] });
  }

  function applyEndMode(mode: "never" | "date") {
    setEndMode(mode);
    if (mode === "never") {
      const { endDate: _, ...rest } = value;
      onChange(rest);
    } else {
      onChange({ ...value, endDate: format(endDate, "yyyy-MM-dd") });
    }
  }

  function applyEndDate(d: Date) {
    setEndDate(d);
    onChange({ ...value, endDate: format(d, "yyyy-MM-dd") });
  }

  const showWeekdays = value.frequency === "custom";
  const showEndRow = value.frequency !== "none";

  return (
    <View>
      <Text style={styles.label}>Repeats</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {PRESETS.map((p) => {
          const active = value.frequency === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setFrequency(p.key)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {showWeekdays && (
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((w, i) => {
            const active = (value.weekdays ?? []).includes(w.d);
            return (
              <TouchableOpacity
                key={i}
                style={[styles.weekdayBtn, active && styles.weekdayBtnActive]}
                onPress={() => toggleWeekday(w.d)}
              >
                <Text style={[styles.weekdayText, active && styles.weekdayTextActive]}>
                  {w.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {showEndRow && (
        <View style={styles.endRow}>
          <Text style={styles.label}>Ends</Text>
          <View style={styles.endToggle}>
            <TouchableOpacity
              style={[styles.endChip, endMode === "never" && styles.endChipActive]}
              onPress={() => applyEndMode("never")}
            >
              <Text style={[styles.endChipText, endMode === "never" && styles.endChipTextActive]}>
                Never
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.endChip, endMode === "date" && styles.endChipActive]}
              onPress={() => applyEndMode("date")}
            >
              <Text style={[styles.endChipText, endMode === "date" && styles.endChipTextActive]}>
                On date
              </Text>
            </TouchableOpacity>
          </View>
          {endMode === "date" && (
            <PickerField label="End date" value={endDate} mode="date" onChange={applyEndDate} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  pills: { gap: 8, paddingVertical: 4 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  pillActive: { backgroundColor: "#4CAF50" },
  pillText: { fontSize: 14, color: "#555", fontWeight: "600" },
  pillTextActive: { color: "#fff" },
  weekdayRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  weekdayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  weekdayBtnActive: { backgroundColor: "#4CAF50" },
  weekdayText: { fontSize: 14, fontWeight: "700", color: "#666" },
  weekdayTextActive: { color: "#fff" },
  endRow: { marginTop: 16 },
  endToggle: { flexDirection: "row", gap: 8, marginBottom: 12 },
  endChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  endChipActive: { backgroundColor: "#4CAF50" },
  endChipText: { fontSize: 14, color: "#555", fontWeight: "600" },
  endChipTextActive: { color: "#fff" },
});
