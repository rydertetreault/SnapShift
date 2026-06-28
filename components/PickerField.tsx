import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  StyleProp,
  ViewStyle,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { useTheme } from "@/lib/theme/ThemeProvider";

interface PickerFieldProps {
  label: string;
  value: Date;
  mode: "date" | "time";
  onChange: (date: Date) => void;
  /**
   * Optional override for the outermost container — lets parents that group
   * multiple PickerFields into a card collapse the default bottom margin.
   */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Date/time picker field.
 *
 * iOS: renders the native `compact` picker inline next to the label. Tapping
 * the field opens Apple's modern popup — a calendar grid for dates, a
 * numeric tap-pad for times. No scroll wheels.
 *
 * Android: renders a tappable summary that opens the platform modal dialog.
 */
export default function PickerField({
  label,
  value,
  mode,
  onChange,
  containerStyle,
}: PickerFieldProps) {
  const theme = useTheme();
  const [show, setShow] = useState(false);

  const displayText =
    mode === "date" ? format(value, "EEEE, MMM d, yyyy") : format(value, "h:mm a");

  function handleChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") {
      setShow(false);
    }
    if (date) {
      onChange(date);
    }
  }

  if (Platform.OS === "ios") {
    return (
      <View style={[styles.row, containerStyle]}>
        <Text style={[styles.label, styles.rowLabel, { color: theme.colors.textMuted }]}>
          {label}
        </Text>
        <DateTimePicker
          value={value}
          mode={mode}
          display="compact"
          themeVariant={theme.mode}
          accentColor={theme.accent}
          onChange={handleChange}
          minuteInterval={5}
          style={styles.iosPicker}
        />
      </View>
    );
  }

  // Android: tap a summary card → opens platform dialog (calendar / clock).
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.field,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surfaceAlt,
          },
        ]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.value, { color: theme.colors.textPrimary }]}>
          {displayText}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          onChange={handleChange}
          minuteInterval={5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    minHeight: 36,
  },
  rowLabel: {
    marginBottom: 0,
  },
  iosPicker: {
    // Compact picker auto-sizes; explicit no overrides keep native look.
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  field: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  value: {
    fontSize: 16,
  },
});
