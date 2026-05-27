import { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  TouchableOpacity,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { useFocusEffect, useRouter } from "expo-router";
import { format, parseISO } from "date-fns";
import { ScheduleEvent } from "@/lib/types";
import { getAllEvents } from "@/lib/storage";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { resolveCategory, useCategoryOverrides } from "@/lib/preferences";
import EventCard from "@/components/EventCard";

interface DaySection {
  title: string;
  date: string;
  data: ScheduleEvent[];
}

export default function CalendarScreen() {
  const theme = useTheme();
  const overrides = useCategoryOverrides();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  async function loadEvents() {
    const loaded = await getAllEvents();
    setEvents(loaded);
  }

  function handleEventPress(event: ScheduleEvent) {
    router.push(`/event/${event.id}`);
  }

  // Build marked dates with colored dots
  const markedDates: Record<string, any> = {};
  events.forEach((e) => {
    if (!markedDates[e.date]) {
      markedDates[e.date] = { dots: [], marked: true };
    }
    const color = resolveCategory(e.category, overrides).color;
    const dots = markedDates[e.date].dots;
    if (!dots.some((d: any) => d.color === color)) {
      dots.push({ key: e.category, color });
    }
  });

  // Highlight selected date
  if (markedDates[selectedDate]) {
    markedDates[selectedDate].selected = true;
    markedDates[selectedDate].selectedColor = theme.accent;
  } else {
    markedDates[selectedDate] = { selected: true, selectedColor: theme.accent };
  }

  // Filter events for selected date
  const dayEvents = events
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const dateDisplay = format(parseISO(selectedDate), "EEEE, MMMM d");

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Calendar
        key={`${theme.mode}-${theme.accent}`}
        current={selectedDate}
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        markingType="multi-dot"
        markedDates={markedDates}
        enableSwipeMonths
        theme={{
          calendarBackground: theme.colors.surface,
          backgroundColor: theme.colors.surface,
          dayTextColor: theme.colors.textPrimary,
          textDisabledColor: theme.colors.disabled,
          textSectionTitleColor: theme.colors.textMuted,
          monthTextColor: theme.colors.textPrimary,
          textMonthFontWeight: "600",
          selectedDayBackgroundColor: theme.accent,
          selectedDayTextColor: "#fff",
          todayTextColor: theme.accent,
          todayBackgroundColor: "transparent",
          arrowColor: theme.accent,
          dotColor: theme.accent,
          selectedDotColor: "#fff",
        }}
      />

      <View style={[styles.dayHeader, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.dayHeaderText, { color: theme.colors.textPrimary }]}>
          {dateDisplay}
        </Text>
        <Text style={[styles.eventCount, { color: theme.colors.textMuted }]}>
          {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {dayEvents.length > 0 ? (
        <View style={styles.eventList}>
          {dayEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={handleEventPress}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            No events this day
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dayHeaderText: {
    fontSize: 16,
    fontWeight: "600",
  },
  eventCount: {
    fontSize: 13,
  },
  eventList: {
    flex: 1,
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
  },
});
