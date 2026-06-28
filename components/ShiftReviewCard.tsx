import { StyleSheet, Text, View, TouchableOpacity, TextInput } from "react-native";
import { ExtractedShift } from "@/lib/types";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { resolveCategory, useCategoryOverrides } from "@/lib/preferences";

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
  const theme = useTheme();
  const overrides = useCategoryOverrides();
  const workCategory = resolveCategory("work", overrides);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.bar, { backgroundColor: workCategory.color }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.day, { color: theme.colors.textPrimary }]}>
            {shift.dayOfWeek}
          </Text>
          <TouchableOpacity onPress={() => onRemove(index)}>
            {/* TODO(v1.3): theme.colors.destructive */}
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.date, { color: theme.colors.textMuted }]}>
          {shift.date}
        </Text>

        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <Text style={[styles.timeLabel, { color: theme.colors.textMuted }]}>
              Start
            </Text>
            <TextInput
              style={[
                styles.timeInput,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                },
              ]}
              placeholderTextColor={theme.colors.textMuted}
              value={shift.startTime}
              onChangeText={(text) =>
                onUpdate(index, { ...shift, startTime: text })
              }
            />
          </View>
          <Text style={[styles.timeDash, { color: theme.colors.textMuted }]}>
            -
          </Text>
          <View style={styles.timeField}>
            <Text style={[styles.timeLabel, { color: theme.colors.textMuted }]}>
              End
            </Text>
            <TextInput
              style={[
                styles.timeInput,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                },
              ]}
              placeholderTextColor={theme.colors.textMuted}
              value={shift.endTime}
              onChangeText={(text) =>
                onUpdate(index, { ...shift, endTime: text })
              }
            />
          </View>
        </View>

        {shift.segments && shift.segments.length > 0 ? (
          <View style={styles.detailSection}>
            <Text style={[styles.detailHeader, { color: theme.colors.textMuted }]}>
              Roles
            </Text>
            {shift.segments.map((seg, i) => (
              <Text
                key={`seg-${i}`}
                style={[styles.detailLine, { color: theme.colors.textSecondary }]}
              >
                {seg.startTime} – {seg.endTime}   {seg.role}
              </Text>
            ))}
          </View>
        ) : shift.department ? (
          <Text style={[styles.department, { color: theme.accent }]}>
            {shift.department}
          </Text>
        ) : null}

        {shift.breaks && shift.breaks.length > 0 ? (
          <View style={styles.detailSection}>
            <Text style={[styles.detailHeader, { color: theme.colors.textMuted }]}>
              Breaks
            </Text>
            {shift.breaks.map((b, i) => (
              <Text
                key={`brk-${i}`}
                style={[styles.detailLine, { color: theme.colors.textSecondary }]}
              >
                {b.startTime} – {b.endTime}   {b.label ?? "Break"}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 10,
    marginVertical: 4,
    // shadowColor stays #000 — it's a shadow tint, not a theme surface color
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
  },
  removeText: {
    fontSize: 13,
    color: "#F44336",
    fontWeight: "500",
  },
  date: {
    fontSize: 13,
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
    textTransform: "uppercase",
    marginBottom: 4,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 15,
  },
  timeDash: {
    fontSize: 18,
    marginHorizontal: 8,
    marginTop: 14,
  },
  department: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
  },
  detailSection: {
    marginTop: 8,
  },
  detailHeader: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  detailLine: {
    fontSize: 13,
    paddingVertical: 1,
  },
});
