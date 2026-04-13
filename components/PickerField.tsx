import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { format } from "date-fns";

interface PickerFieldProps {
  label: string;
  value: Date;
  mode: "date" | "time";
  onChange: (date: Date) => void;
}

export default function PickerField({
  label,
  value,
  mode,
  onChange,
}: PickerFieldProps) {
  const [show, setShow] = useState(false);

  const displayText =
    mode === "date" ? format(value, "EEEE, MMM d, yyyy") : format(value, "h:mm a");

  function handleChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") {
      setShow(false);
    }
    if (date) {
      onChange(date);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.field}
        onPress={() => setShow(!show)}
        activeOpacity={0.7}
      >
        <Text style={styles.value}>{displayText}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value}
          mode={mode}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          themeVariant="light"
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
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  field: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#fafafa",
  },
  value: {
    fontSize: 16,
    color: "#333",
  },
});
