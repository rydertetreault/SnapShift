import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { format, parseISO } from "date-fns";
import { ScheduleEvent } from "@/lib/types";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { resolveCategory, useCategoryOverrides } from "@/lib/preferences";

interface EventCardProps {
  event: ScheduleEvent;
  onPress: (event: ScheduleEvent) => void;
}

export default function EventCard({ event, onPress }: EventCardProps) {
  const theme = useTheme();
  const overrides = useCategoryOverrides();
  const category = resolveCategory(event.category, overrides);
  const startTime = format(parseISO(event.startTime), "h:mm a");
  const endTime = format(parseISO(event.endTime), "h:mm a");

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={() => onPress(event)}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryBar, { backgroundColor: category.color }]} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {event.title}
        </Text>
        <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
          {event.allDay ? "All day" : `${startTime} - ${endTime}`}
        </Text>
        <Text style={[styles.category, { color: category.color }]}>
          {category.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 10,
    marginVertical: 4,
    marginHorizontal: 16,
    // shadowColor stays #000 — it's a shadow tint, not a theme surface color
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
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    fontWeight: "500",
  },
});
