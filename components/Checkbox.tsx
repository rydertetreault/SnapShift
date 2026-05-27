// components/Checkbox.tsx
import { Pressable, StyleSheet } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTheme } from "@/lib/theme/ThemeProvider";

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  size?: number;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export default function Checkbox({
  checked,
  onChange,
  size = 22,
  accessibilityLabel,
  disabled = false,
}: Props) {
  const theme = useTheme();
  const borderColor = checked ? theme.accent : theme.colors.border;
  const bg = checked ? theme.accent : "transparent";
  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.box,
        { width: size, height: size, borderColor, backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      {checked && <FontAwesome name="check" size={size * 0.6} color="#fff" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
});
