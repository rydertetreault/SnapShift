import PickerField from "@/components/PickerField";
import ShiftReviewCard from "@/components/ShiftReviewCard";
import { parseScheduleImage } from "@/lib/ocr";
import { resolveDates } from "@/lib/ocr/weekResolve";
import { saveMultipleEvents } from "@/lib/storage";
import { ExtractedShift, ScheduleEvent } from "@/lib/types";
import { addDays, format, parse, parseISO } from "date-fns";
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
  const [detectedWeek, setDetectedWeek] = useState<string | null>(null);
  const [showWeekOverride, setShowWeekOverride] = useState(false);
  const [overrideWeek, setOverrideWeek] = useState<Date>(new Date());

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

      const result = await parseScheduleImage(base64, mimeType);

      if (result.shifts.length === 0) {
        Alert.alert(
          "No Shifts Found",
          "No shifts were detected in this image. Try a clearer photo."
        );
        setStep("pick");
        return;
      }

      setDetectedWeek(result.weekStart);
      setOverrideWeek(parseISO(result.weekStart));
      setShowWeekOverride(false);
      setShifts(result.shifts);
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

  function handleOverrideWeekChange(d: Date) {
    setOverrideWeek(d);
    const iso = format(d, "yyyy-MM-dd");
    setDetectedWeek(iso);
    // Re-resolve dates for the existing shifts using the new week start.
    const reset = shifts.map((s) => ({ ...s, date: "" }));
    setShifts(resolveDates(reset, iso));
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
          title: shift.department ? shift.department : "Shift",
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
    setDetectedWeek(null);
    setShowWeekOverride(false);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>Upload Schedule</Text>

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
          {detectedWeek && (
            <View style={styles.weekBanner}>
              <Text style={styles.weekBannerText}>
                Detected week:{" "}
                {format(parseISO(detectedWeek), "MMM d")} -{" "}
                {format(addDays(parseISO(detectedWeek), 6), "MMM d, yyyy")}
              </Text>
              <TouchableOpacity
                onPress={() => setShowWeekOverride((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.weekBannerLink}>Wrong week?</Text>
              </TouchableOpacity>
            </View>
          )}

          {showWeekOverride && (
            <PickerField
              label="Override week (Saturday)"
              value={overrideWeek}
              mode="date"
              onChange={handleOverrideWeekChange}
            />
          )}

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
  weekBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  weekBannerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flexShrink: 1,
    marginRight: 12,
  },
  weekBannerLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
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
