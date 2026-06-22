import { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { ScheduleEvent } from "@/lib/types";
import { getAllEvents } from "@/lib/storage";
import { useTheme } from "@/lib/theme/ThemeProvider";
import {
  resolveCategory,
  useCategoryOverrides,
  ACCENT_PALETTE,
} from "@/lib/preferences";
import {
  resolveEventColor,
  useColorRules,
  useCalendarDefaults,
} from "@/lib/colors";
import { shareWeek } from "@/lib/sharing/share";
import {
  getSharedPeople,
  setSharedPersonHidden,
  setSharedPersonColor,
} from "@/lib/sharing/store";
import { overlayBlocksForDay } from "@/lib/sharing/overlay";
import { SharedPerson } from "@/lib/sharing/types";
import { getOverlayEnabled, setOverlayEnabled } from "@/lib/sharing/visibility";
import { maybeResyncCalendars } from "@/lib/calendar/throttledSync";
import SharedPeopleFilter from "@/components/SharedPeopleFilter";
import FontAwesome from "@expo/vector-icons/FontAwesome";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_VELOCITY = 500;
const SLIDE_DURATION = 200;

function personColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENT_PALETTE[h % ACCENT_PALETTE.length];
}

export default function WeeklyScreen() {
  const theme = useTheme();
  const overrides = useCategoryOverrides();
  const rules = useColorRules();
  const calendarDefaults = useCalendarDefaults();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [people, setPeople] = useState<SharedPerson[]>([]);
  const [overlayEnabled, setOverlayEnabledState] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
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
    setPeople(await getSharedPeople());
    setOverlayEnabledState(await getOverlayEnabled());
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6];
  // When the master toggle is off, no overlays at all. Otherwise honor per-person hidden.
  const overlayPeople = overlayEnabled ? people.filter((p) => !p.hidden) : [];
  const colorFor = (p: { id: string; color?: string }) =>
    p.color ?? personColor(p.id);
  // Subtle badge on the filter button when any filter is non-default.
  const hasActiveFilter =
    !overlayEnabled || people.some((p) => p.hidden) || people.some((p) => p.color);

  async function handleToggleOverlay(enabled: boolean) {
    setOverlayEnabledState(enabled);
    await setOverlayEnabled(enabled);
  }
  async function handleTogglePerson(id: string, visible: boolean) {
    // Optimistic: update local state immediately so the modal feels instant.
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, hidden: !visible } : p)));
    await setSharedPersonHidden(id, !visible);
  }
  async function handleChangePersonColor(id: string, color: string | undefined) {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, color } : p)));
    await setSharedPersonColor(id, color);
  }

  function getEventsForDay(day: Date): ScheduleEvent[] {
    const dayStr = format(day, "yyyy-MM-dd");
    return events
      .filter((e) => e.date === dayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const today = new Date();

  const translateX = useSharedValue(0);

  const commitWeekChange = useCallback((direction: "next" | "prev") => {
    if (direction === "next") setWeekStart((prev) => addWeeks(prev, 1));
    else setWeekStart((prev) => subWeeks(prev, 1));
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
            runOnJS(commitWeekChange)(direction);
            translateX.value = 0;
          }
        }
      );
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Week navigation header */}
      <View
        style={[
          styles.weekHeader,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setWeekStart(subWeeks(weekStart, 1))}
          style={styles.navButton}
        >
          <FontAwesome name="chevron-left" size={16} color={theme.accent} />
        </TouchableOpacity>
        <View style={styles.weekTitle}>
          <Text style={[styles.weekTitleText, { color: theme.colors.textPrimary }]}>
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </Text>
          <TouchableOpacity
            onPress={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            <Text style={[styles.todayLink, { color: theme.accent }]}>Today</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setWeekStart(addWeeks(weekStart, 1))}
            style={styles.navButton}
          >
            <FontAwesome name="chevron-right" size={16} color={theme.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => shareWeek(weekStart)}
            style={styles.navButton}
            accessibilityLabel="Share this week"
          >
            <FontAwesome
              name="share-square-o"
              size={20}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Right-aligned filter button — only when something has been imported.
          Replaces the old shared-people legend; names show on the overlay
          blocks themselves, and visibility/colors are managed via the modal. */}
      {people.length > 0 && (
        <View
          style={[
            styles.filterBar,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setFilterOpen(true)}
            style={styles.filterBtn}
            accessibilityLabel="Filter shared schedules"
            hitSlop={6}
          >
            <FontAwesome
              name="filter"
              size={14}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>
              Shared
            </Text>
            {hasActiveFilter && (
              <View style={[styles.filterDot, { backgroundColor: theme.accent }]} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Day rows */}
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.rowsContainer}
      >
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const dayStr = format(day, "yyyy-MM-dd");
          const overlay = overlayBlocksForDay(overlayPeople, dayStr);
          const isToday = isSameDay(day, today);

          return (
            <View
              key={day.toISOString()}
              style={[
                styles.dayRow,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                isToday && { borderColor: theme.accent, borderWidth: 2 },
              ]}
            >
              {/* Day label on the left */}
              <View
                style={[
                  styles.dayLabel,
                  {
                    backgroundColor: theme.colors.surfaceAlt,
                    borderRightColor: theme.colors.border,
                  },
                  isToday && { backgroundColor: theme.accent },
                ]}
              >
                <Text
                  style={[
                    styles.dayName,
                    { color: theme.colors.textSecondary },
                    isToday && { color: "#fff" },
                  ]}
                >
                  {format(day, "EEE").toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.dayDate,
                    { color: theme.colors.textMuted },
                    isToday && { color: "#fff" },
                  ]}
                >
                  {format(day, "M/d")}
                </Text>
              </View>

              {/* Events to the right */}
              <View style={styles.dayContent}>
                {dayEvents.length > 0 ? (
                  dayEvents.map((event) => {
                    const { color, name } = resolveEventColor(event, {
                      rules,
                      calendarDefaults,
                      categoryOverrides: overrides,
                    });
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
                            style={[
                              styles.eventTitle,
                              { color: theme.colors.textPrimary },
                            ]}
                            numberOfLines={1}
                          >
                            {event.title}
                          </Text>
                          <Text style={[styles.eventCategory, { color }]}>
                            {name}
                          </Text>
                        </View>
                        <Text style={[styles.eventTime, { color }]}>
                          {start} – {end}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={[styles.offText, { color: theme.colors.disabled }]}>
                    OFF
                  </Text>
                )}

                {/* Overlaid shared schedules */}
                {overlay.map((blk, i) => {
                  const c = personColor(blk.personId);
                  const isWork = blk.kind === "work";
                  return (
                    <View
                      key={`${blk.personId}-${blk.kind}-${i}`}
                      style={[
                        styles.overlayBlock,
                        isWork
                          ? { backgroundColor: c }
                          : { backgroundColor: c + "33" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.overlayText,
                          {
                            color: isWork ? "#fff" : theme.colors.textPrimary,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {blk.name}
                        {isWork && blk.label ? ` · ${blk.label}` : ""}
                        {` ${blk.start}–${blk.end}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
      </Animated.View>
      <SharedPeopleFilter
        visible={filterOpen}
        people={people}
        overlayEnabled={overlayEnabled}
        autoColorFor={personColor}
        onToggleOverlay={handleToggleOverlay}
        onTogglePerson={handleTogglePerson}
        onChangePersonColor={handleChangePersonColor}
        onManagePress={() => {
          setFilterOpen(false);
          // The Settings tab still owns the rename/delete UI.
          router.push("/(tabs)/settings");
        }}
        onClose={() => setFilterOpen(false)}
      />
    </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  navButton: {
    padding: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  weekTitle: {
    alignItems: "center",
  },
  weekTitleText: {
    fontSize: 16,
    fontWeight: "700",
  },
  todayLink: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  rowsContainer: {
    padding: 10,
    paddingBottom: 30,
  },
  dayRow: {
    flexDirection: "row",
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 64,
  },
  dayLabel: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    paddingVertical: 12,
  },
  dayName: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  dayDate: {
    fontSize: 12,
    marginTop: 2,
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
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
  },
  overlayBlock: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  overlayText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 2,
  },
});
