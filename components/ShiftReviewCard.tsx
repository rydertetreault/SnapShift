import { StyleSheet, Text, View, TouchableOpacity, TextInput } from "react-native";
import { ExtractedShift } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/constants";

interface ShiftReviewCardProps {
  shift: ExtractedShift;
  index: number;
  onUpdate: (index: number, shift: ExtractedShift) => void;
  onRemove: (index: number) => void;
}

export default function ShiftReviewCard({
  shift,
  index,
  onUpdate,
  onRemove,
}: ShiftReviewCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.bar, { backgroundColor: CATEGORY_COLORS.work }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.day}>{shift.dayOfWeek}</Text>
          <TouchableOpacity onPress={() => onRemove(index)}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.date}>{shift.date}</Text>

        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <Text style={styles.timeLabel}>Start</Text>
            <TextInput
              style={styles.timeInput}
              value={shift.startTime}
              onChangeText={(text) =>
                onUpdate(index, { ...shift, startTime: text })
              }
            />
          </View>
          <Text style={styles.timeDash}>-</Text>
          <View style={styles.timeField}>
            <Text style={styles.timeLabel}>End</Text>
            <TextInput
              style={styles.timeInput}
              value={shift.endTime}
              onChangeText={(text) =>
                onUpdate(index, { ...shift, endTime: text })
              }
            />
          </View>
        </View>

        {shift.department ? (
          <Text style={styles.department}>{shift.department}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  bar: {
    width: 5,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  day: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  removeText: {
    fontSize: 13,
    color: "#F44336",
    fontWeight: "500",
  },
  date: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    color: "#aaa",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 8,
    fontSize: 15,
    color: "#333",
  },
  timeDash: {
    fontSize: 18,
    color: "#aaa",
    marginHorizontal: 8,
    marginTop: 14,
  },
  department: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    marginTop: 6,
  },
});
