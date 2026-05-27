import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { EventCategory } from "@/lib/types";
import { ALL_CATEGORIES } from "@/lib/constants";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { resolveCategory, useCategoryOverrides } from "@/lib/preferences";

interface CategoryPickerProps {
  selected: EventCategory;
  onSelect: (category: EventCategory) => void;
}

export default function CategoryPicker({ selected, onSelect }: CategoryPickerProps) {
  const theme = useTheme();
  const overrides = useCategoryOverrides();
  return (
    <View style={styles.container}>
      {ALL_CATEGORIES.map((cat) => {
        const isSelected = cat === selected;
        const { name, color } = resolveCategory(cat, overrides);
        return (
          <TouchableOpacity
            key={cat}
            style={[
              styles.chip,
              { borderColor: color },
              isSelected && { backgroundColor: color },
            ]}
            onPress={() => onSelect(cat)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                { color: isSelected ? "#fff" : color },
              ]}
            >
              {name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
});
