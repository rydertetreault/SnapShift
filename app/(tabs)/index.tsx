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
import { CATEGORY_COLORS } from "@/lib/constants";
import EventCard from "@/components/EventCard";

interface DaySection {
  title: string;
  date: string;
  data: ScheduleEvent[];
}

export default function CalendarScreen() {
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
    const color = CATEGORY_COLORS[e.category];
    const dots = markedDates[e.date].dots;
    if (!dots.some((d: any) => d.color === color)) {
      dots.push({ key: e.category, color });
    }
  });

  // Highlight selected date
  if (markedDates[selectedDate]) {
    markedDates[selectedDate].selected = true;
    markedDates[selectedDate].selectedColor = "#4CAF50";
  } else {
    markedDates[selectedDate] = { selected: true, selectedColor: "#4CAF50" };
  }

  // Filter events for selected date
  const dayEvents = events
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const dateDisplay = format(parseISO(selectedDate), "EEEE, MMMM d");

  return (
    <View style={styles.container}>
      <Calendar
        current={selectedDate}
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        markingType="multi-dot"
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: "#4CAF50",
          todayTextColor: "#4CAF50",
          arrowColor: "#4CAF50",
          dotColor: "#4CAF50",
        }}
      />

      <View style={styles.dayHeader}>
        <Text style={styles.dayHeaderText}>{dateDisplay}</Text>
        <Text style={styles.eventCount}>
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
          <Text style={styles.emptyText}>No events this day</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dayHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  eventCount: {
    fontSize: 13,
    color: "#888",
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
    color: "#aaa",
  },
});
