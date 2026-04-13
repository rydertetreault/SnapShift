import ShiftReviewCard from "@/components/ShiftReviewCard";
import { parseScheduleImage } from "@/lib/gemini";
import { saveMultipleEvents } from "@/lib/storage";
import { ExtractedShift, ScheduleEvent } from "@/lib/types";
import {
  addDays,
  addWeeks,
  format,
  parse,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Step = "pick" | "loading" | "review";

export default function UploadScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("pick");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [shifts, setShifts] = useState<ExtractedShift[]>([]);
  const [weekStart, setWeekStart] = useState(() =>
    // Default to this week's Saturday
    startOfWeek(new Date(), { weekStartsOn: 6 })
  );

  async function pickImage(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        `Please allow ${useCamera ? "camera" : "photo library"} access to upload schedules.`
      );
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.8,
        });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setImageUri(asset.uri);
    await processImage(asset.uri, asset.mimeType);
  }

  async function processImage(uri: string, pickerMimeType?: string | null) {
    setStep("loading");

    try {
      // Read image as base64
      const file = new File(uri);
      const base64 = await file.base64();

      // Use mime type from picker, fall back to detection from URI
      let mimeType = pickerMimeType || "image/jpeg";
      if (!pickerMimeType) {
        const lower = uri.toLowerCase();
        if (lower.endsWith(".png")) mimeType = "image/png";
        else if (lower.endsWith(".webp")) mimeType = "image/webp";
        else if (lower.endsWith(".gif")) mimeType = "image/gif";
      }

      const extracted = await parseScheduleImage(base64, mimeType, weekStart);

      if (extracted.length === 0) {
        Alert.alert(
          "No Shifts Found",
          "No shifts were detected in this image. Try a clearer photo."
        );
        setStep("pick");
        return;
      }

      setShifts(extracted);
      setStep("review");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong.");
      setStep("pick");
    }
  }

  function handleUpdateShift(index: number, updated: ExtractedShift) {
    const next = [...shifts];
    next[index] = updated;
    setShifts(next);
  }

  function handleRemoveShift(index: number) {
    setShifts(shifts.filter((_, i) => i !== index));
  }

  async function handleSaveAll() {
    if (shifts.length === 0) {
      Alert.alert("Nothing to save", "Add at least one shift.");
      return;
    }

    try {
      const events: ScheduleEvent[] = shifts.map((shift) => {
        // Parse the human-readable times like "2:00 PM" into Date objects
        const startDate = parseTimeString(shift.startTime, shift.date);
        const endDate = parseTimeString(shift.endTime, shift.date);

        return {
          id: Math.random().toString(36).substring(2, 10),
          title: shift.department
            ? `Publix - ${shift.department}`
            : "Publix Shift",
          date: shift.date,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          category: "work" as const,
          source: "ai" as const,
          createdAt: new Date().toISOString(),
        };
      });

      await saveMultipleEvents(events);

      Alert.alert(
        "Saved!",
        `${events.length} shift${events.length !== 1 ? "s" : ""} added to your calendar.`,
        [
          {
            text: "View Calendar",
            onPress: () => {
              resetState();
              router.navigate("/(tabs)");
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Save Error", error.message || "Could not save shifts.");
    }
  }

  function resetState() {
    setStep("pick");
    setImageUri(null);
    setShifts([]);
  }

  // Week navigation
  const weekLabel = `${format(weekStart, "MMM d")} - ${format(addDays(weekStart, 6), "MMM d, yyyy")}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>Upload Schedule</Text>

      {/* Week Selector */}
      <Text style={styles.label}>Schedule Week (Sat - Fri)</Text>
      <View style={styles.weekSelector}>
        <TouchableOpacity
          onPress={() => setWeekStart(subWeeks(weekStart, 1))}
          style={styles.weekArrow}
        >
          <Text style={styles.weekArrowText}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        <TouchableOpacity
          onPress={() => setWeekStart(addWeeks(weekStart, 1))}
          style={styles.weekArrow}
        >
          <Text style={styles.weekArrowText}>{">"}</Text>
        </TouchableOpacity>
      </View>

      {step === "pick" && (
        <>
          {/* Image preview if we have one from a previous attempt */}
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.preview} />
          )}

          <TouchableOpacity
            style={styles.pickButton}
            onPress={() => pickImage(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.pickButtonText}>Choose from Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pickButton, styles.cameraButton]}
            onPress={() => pickImage(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.cameraButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            Take a screenshot of your schedule and upload it here. The AI
            will read your shifts automatically.
          </Text>
        </>
      )}

      {step === "loading" && (
        <View style={styles.loadingContainer}>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.previewSmall} />
          )}
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Reading your schedule...</Text>
          <Text style={styles.loadingSubtext}>
            This usually takes a few seconds
          </Text>
        </View>
      )}

      {step === "review" && (
        <>
          <Text style={styles.reviewHeading}>
            Found {shifts.length} shift{shifts.length !== 1 ? "s" : ""}
          </Text>
          <Text style={styles.reviewSubtext}>
            Review and edit before saving. Tap "Remove" to skip a shift.
          </Text>

          {shifts.map((shift, index) => (
            <ShiftReviewCard
              key={`${shift.dayOfWeek}-${index}`}
              shift={shift}
              index={index}
              onUpdate={handleUpdateShift}
              onRemove={handleRemoveShift}
            />
          ))}

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveAll}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              Save {shifts.length} Shift{shifts.length !== 1 ? "s" : ""}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={resetState}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Try a Different Photo</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

/**
 * Parse a time string like "2:00 PM" into a Date on the given date string.
 */
function parseTimeString(timeStr: string, dateStr: string): Date {
  try {
    const date = parse(
      `${dateStr} ${timeStr}`,
      "yyyy-MM-dd h:mm a",
      new Date()
    );
    if (isNaN(date.getTime())) throw new Error();
    return date;
  } catch {
    // Fallback: try without space variations
    try {
      const date = parse(
        `${dateStr} ${timeStr}`,
        "yyyy-MM-dd h:mm a",
        new Date()
      );
      return date;
    } catch {
      // Last resort: return noon on that date
      const fallback = new Date(dateStr + "T12:00:00");
      return fallback;
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#222",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  weekSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  weekArrow: {
    padding: 12,
  },
  weekArrowText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  weekLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  preview: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: "#f0f0f0",
  },
  previewSmall: {
    width: "100%",
    height: 150,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: "#f0f0f0",
  },
  pickButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  pickButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  cameraButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  cameraButtonText: {
    color: "#4CAF50",
    fontSize: 17,
    fontWeight: "700",
  },
  hint: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 20,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: "center",
    paddingTop: 20,
  },
  loadingText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  reviewHeading: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  reviewSubtext: {
    fontSize: 14,
    color: "#888",
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  retryButton: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  retryButtonText: {
    color: "#888",
    fontSize: 15,
    fontWeight: "500",
  },
});
