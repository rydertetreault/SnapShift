import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { format, parseISO } from "date-fns";
import { ScheduleEvent } from "@/lib/types";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants";

interface EventCardProps {
  event: ScheduleEvent;
  onPress: (event: ScheduleEvent) => void;
}

export default function EventCard({ event, onPress }: EventCardProps) {
  const startTime = format(parseISO(event.startTime), "h:mm a");
  const endTime = format(parseISO(event.endTime), "h:mm a");
  const color = CATEGORY_COLORS[event.category];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(event)}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryBar, { backgroundColor: color }]} />
      <View style={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.time}>
          {event.allDay ? "All day" : `${startTime} - ${endTime}`}
        </Text>
        <Text style={[styles.category, { color }]}>
          {CATEGORY_LABELS[event.category]}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginVertical: 4,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryBar: {
    width: 5,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  time: {
    fontSize: 14,
    color: "#555",
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    fontWeight: "500",
  },
});
