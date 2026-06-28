import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { format, parseISO } from "date-fns";
import { ScheduleEvent } from "@/lib/types";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useCategoryOverrides } from "@/lib/preferences";
import {
  resolveEventColor,
  useColorRules,
  useCalendarDefaults,
} from "@/lib/colors";

interface EventCardProps {
  event: ScheduleEvent;
  onPress: (event: ScheduleEvent) => void;
}

export default function EventCard({ event, onPress }: EventCardProps) {
  const theme = useTheme();
  const overrides = useCategoryOverrides();
  const rules = useColorRules();
  const calendarDefaults = useCalendarDefaults();
  const resolved = resolveEventColor(event, {
    rules,
    calendarDefaults,
    categoryOverrides: overrides,
  });
  const startTime = format(parseISO(event.startTime), "h:mm a");
  const endTime = format(parseISO(event.endTime), "h:mm a");

  let breaksSummary: string | null = null;
  if (event.breaks && event.breaks.length > 0) {
    if (event.breaks.length === 1) {
      const b = event.breaks[0];
      const bStart = format(parseISO(b.start), "h:mm a");
      const bEnd = format(parseISO(b.end), "h:mm a");
      breaksSummary = `${b.label ?? "Break"} ${bStart} – ${bEnd}`;
    } else {
      breaksSummary = `${event.breaks.length} breaks`;
    }
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={() => onPress(event)}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryBar, { backgroundColor: resolved.color }]} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {event.title}
        </Text>
        <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
          {event.allDay ? "All day" : `${startTime} - ${endTime}`}
        </Text>
        {breaksSummary ? (
          <Text style={[styles.breaks, { color: theme.colors.textMuted }]}>
            {breaksSummary}
          </Text>
        ) : null}
        <Text style={[styles.category, { color: resolved.color }]}>
          {resolved.name}
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
  breaks: {
    fontSize: 12,
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    fontWeight: "500",
  },
});
