import { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  format,
  parseISO,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
} from "date-fns";
import { ScheduleEvent } from "@/lib/types";
import { getAllEvents } from "@/lib/storage";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export default function WeeklyScreen() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
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

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6];

  function getEventsForDay(day: Date): ScheduleEvent[] {
    const dayStr = format(day, "yyyy-MM-dd");
    return events
      .filter((e) => e.date === dayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const today = new Date();

  return (
    <View style={styles.container}>
      {/* Week navigation header */}
      <View style={styles.weekHeader}>
        <TouchableOpacity
          onPress={() => setWeekStart(subWeeks(weekStart, 1))}
          style={styles.navButton}
        >
          <FontAwesome name="chevron-left" size={16} color="#4CAF50" />
        </TouchableOpacity>
        <View style={styles.weekTitle}>
          <Text style={styles.weekTitleText}>
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </Text>
          <TouchableOpacity
            onPress={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            <Text style={styles.todayLink}>Today</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => setWeekStart(addWeeks(weekStart, 1))}
          style={styles.navButton}
        >
          <FontAwesome name="chevron-right" size={16} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* Day rows */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.rowsContainer}
      >
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, today);

          return (
            <View
              key={day.toISOString()}
              style={[styles.dayRow, isToday && styles.todayRow]}
            >
              {/* Day label on the left */}
              <View
                style={[styles.dayLabel, isToday && styles.todayDayLabel]}
              >
                <Text
                  style={[styles.dayName, isToday && styles.todayDayName]}
                >
                  {format(day, "EEE").toUpperCase()}
                </Text>
                <Text
                  style={[styles.dayDate, isToday && styles.todayDayDate]}
                >
                  {format(day, "M/d")}
                </Text>
              </View>

              {/* Events to the right */}
              <View style={styles.dayContent}>
                {dayEvents.length > 0 ? (
                  dayEvents.map((event) => {
                    const color = CATEGORY_COLORS[event.category];
                    const start = format(parseISO(event.startTime), "h:mm a");
                    const end = format(parseISO(event.endTime), "h:mm a");

                    return (
                      <TouchableOpacity
                        key={event.id}
                        style={[
                          styles.eventBlock,
                          {
                            borderLeftColor: color,
                            backgroundColor: color + "15",
                          },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => router.push(`/event/${event.id}`)}
                      >
                        <View style={styles.eventRow}>
                          <Text
                            style={styles.eventTitle}
                            numberOfLines={1}
                          >
                            {event.title}
                          </Text>
                          <Text style={[styles.eventCategory, { color }]}>
                            {CATEGORY_LABELS[event.category]}
                          </Text>
                        </View>
                        <Text style={[styles.eventTime, { color }]}>
                          {start} – {end}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.offText}>OFF</Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  navButton: {
    padding: 8,
  },
  weekTitle: {
    alignItems: "center",
  },
  weekTitleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  todayLink: {
    fontSize: 13,
    color: "#4CAF50",
    fontWeight: "600",
    marginTop: 2,
  },
  rowsContainer: {
    padding: 10,
    paddingBottom: 30,
  },
  dayRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    overflow: "hidden",
    minHeight: 64,
  },
  todayRow: {
    borderColor: "#4CAF50",
    borderWidth: 2,
  },
  dayLabel: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
    borderRightWidth: 1,
    borderRightColor: "#eee",
    paddingVertical: 12,
  },
  todayDayLabel: {
    backgroundColor: "#4CAF50",
  },
  dayName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#555",
    letterSpacing: 0.5,
  },
  todayDayName: {
    color: "#fff",
  },
  dayDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  todayDayDate: {
    color: "#fff",
  },
  dayContent: {
    flex: 1,
    padding: 8,
    justifyContent: "center",
  },
  eventBlock: {
    borderLeftWidth: 4,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  eventCategory: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  eventTime: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  offText: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
