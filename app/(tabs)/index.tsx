import { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { useFocusEffect, useRouter } from "expo-router";
import { addMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ScheduleEvent } from "@/lib/types";
import { getAllEvents } from "@/lib/storage";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { resolveCategory, useCategoryOverrides } from "@/lib/preferences";
import EventCard from "@/components/EventCard";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_VELOCITY = 500;
const SLIDE_DURATION = 200;

function shiftMonth(dateStr: string, direction: "next" | "prev"): string {
  const d = parseISO(dateStr);
  const target = direction === "next" ? addMonths(d, 1) : subMonths(d, 1);
  return format(startOfMonth(target), "yyyy-MM-dd");
}

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

  const translateX = useSharedValue(0);

  const commitMonthChange = useCallback((direction: "next" | "prev") => {
    setSelectedDate((prev) => shiftMonth(prev, direction));
  }, []);

  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      'worklet';
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      'worklet';
      const fast = Math.abs(e.velocityX) > SWIPE_VELOCITY;
      const far = Math.abs(e.translationX) > SWIPE_THRESHOLD;

      if (!fast && !far) {
        translateX.value = withTiming(0, { duration: SLIDE_DURATION });
        return;
      }

      const direction: "next" | "prev" = e.translationX < 0 ? "next" : "prev";
      const offscreen = direction === "next" ? -SCREEN_WIDTH : SCREEN_WIDTH;
      translateX.value = withTiming(
        offscreen,
        { duration: SLIDE_DURATION },
        (finished) => {
          if (finished) {
            runOnJS(commitMonthChange)(direction);
            translateX.value = 0;
          }
        }
      );
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

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
      <GestureDetector gesture={pan}>
        <Animated.View style={animatedStyle}>
          <Calendar
            key={`${theme.mode}-${theme.accent}`}
            current={selectedDate}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markingType="multi-dot"
            markedDates={markedDates}
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
        </Animated.View>
      </GestureDetector>

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
