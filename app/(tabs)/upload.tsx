import QuotaReachedModal from "@/components/QuotaReachedModal";
import ShiftReviewCard from "@/components/ShiftReviewCard";
import { parseScheduleImage } from "@/lib/ocr";
import { prepareImageForUpload } from "@/lib/ocr/prepareImage";
import { QuotaExceededError, reportFailedScreenshot } from "@/lib/ocr/vision";
import { resolveDates } from "@/lib/ocr/weekResolve";
import { useDefaultShift, DefaultShift } from "@/lib/preferences";
import { saveMultipleEvents } from "@/lib/storage";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { ExtractedShift, ScheduleEvent } from "@/lib/types";
import { applyDefaultShift, hhmmToDisplay } from "@/lib/upload/applyDefaultShift";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  addDays,
  addWeeks,
  format,
  parse,
  parseISO,
  startOfWeek,
  subWeeks,
} from "date-fns";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Step = "pick" | "loading" | "review";

export default function UploadScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [step, setStep] = useState<Step>("pick");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [shifts, setShifts] = useState<ExtractedShift[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 6 })
  );
  const [failedImage, setFailedImage] = useState<{
    base64: string;
    mimeType: string;
    error: string;
    preview?: string;
  } | null>(null);
  const [reportSending, setReportSending] = useState(false);
  const [quota, setQuota] = useState<{ resetAt?: number } | null>(null);

  const persistedDefault = useDefaultShift();
  const [perUploadOverride, setPerUploadOverride] = useState<DefaultShift | null>(null);
  const [overrideActive, setOverrideActive] = useState(false);
  const [originalShifts, setOriginalShifts] = useState<ExtractedShift[] | null>(null);
  const [editDefaultVisible, setEditDefaultVisible] = useState(false);

  const effective: DefaultShift = perUploadOverride ?? persistedDefault;

  function disableOverrideForThisUpload() {
    setOverrideActive(false);
    if (originalShifts) setShifts(originalShifts);
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to upload schedules."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setImageUri(asset.uri);
    await processImage(asset.uri, asset.width, asset.height);
  }

  async function processImage(uri: string, width?: number, height?: number) {
    setStep("loading");
    setFailedImage(null);

    // Hoist base64/mimeType so the catch block can attach them to the failure state.
    let base64 = "";
    let mimeType = "image/jpeg";

    try {
      // Downscale + JPEG-compress before upload: a full-res phone photo exceeds the
      // proxy's ~4 MB body limit (HTTP 413), and Claude downsamples past ~1568 px
      // anyway, so a smaller image loses no detail. See lib/ocr/prepareImage.ts.
      const prepared = await prepareImageForUpload(uri, width, height);
      base64 = prepared.base64;
      mimeType = prepared.mimeType;

      const result = await parseScheduleImage(base64, mimeType);

      if (result.shifts.length === 0) {
        setFailedImage({
          base64,
          mimeType,
          error: "No shifts were detected in this image.",
          preview: result.rawOcrText?.substring(0, 500),
        });
        setStep("pick");
        return;
      }

      setWeekStart(parseISO(result.weekStart));
      setOriginalShifts(result.shifts);
      if (effective.enabled) {
        setOverrideActive(true);
        setShifts(applyDefaultShift(result.shifts, effective));
      } else {
        setOverrideActive(false);
        setShifts(result.shifts);
      }
      setStep("review");
    } catch (error: any) {
      // Free-tier scan limit reached: show the upgrade prompt rather than a
      // "couldn't read that" failure card (the scan was fine, the quota wasn't).
      if (error instanceof QuotaExceededError) {
        setQuota({ resetAt: error.resetAt });
        setStep("pick");
        return;
      }
      setFailedImage({
        base64,
        mimeType,
        error: error?.message || "Unknown error",
        preview: undefined,
      });
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

  function changeWeek(next: Date) {
    setWeekStart(next);
    if (shifts.length === 0) return;
    const iso = format(next, "yyyy-MM-dd");
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
        // Parse the human-readable times like "2:00 PM" into Date objects.
        // For all-day shifts (marker-style schedules), startTime/endTime are
        // sentinel values ("12:00 AM" / "11:59 PM") so parseTimeString still works.
        const startDate = parseTimeString(shift.startTime, shift.date);
        const endDate = parseTimeString(shift.endTime, shift.date);
        const title = shift.allDay
          ? "Work"
          : shift.department
            ? shift.department
            : "Shift";

        return {
          id: Math.random().toString(36).substring(2, 10),
          title,
          date: shift.date,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          category: "work" as const,
          source: "ai" as const,
          createdAt: new Date().toISOString(),
          allDay: shift.allDay,
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
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 6 }));
    setFailedImage(null);
    setOverrideActive(false);
    setPerUploadOverride(null);
    setOriginalShifts(null);
    setEditDefaultVisible(false);
  }

  async function handleReportFailed() {
    if (!failedImage || reportSending) return;
    setReportSending(true);
    try {
      await reportFailedScreenshot(
        failedImage.base64,
        failedImage.mimeType,
        failedImage.error,
        failedImage.preview ?? ""
      );
      Alert.alert("Thanks", "We'll use this to make the next version better.");
      setFailedImage(null);
    } catch (err: any) {
      Alert.alert(
        "Could not send",
        err?.message || "Please try again later."
      );
    } finally {
      setReportSending(false);
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>
        Upload Schedule
      </Text>

      <Text style={[styles.label, { color: theme.colors.textMuted }]}>
        Schedule Week (Sat - Fri)
      </Text>
      <View
        style={[
          styles.weekSelector,
          { backgroundColor: theme.colors.surfaceAlt },
        ]}
      >
        <TouchableOpacity
          onPress={() => changeWeek(subWeeks(weekStart, 1))}
          style={styles.weekArrow}
          activeOpacity={0.6}
        >
          <Text style={[styles.weekArrowText, { color: theme.accent }]}>
            {"<"}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.weekLabel, { color: theme.colors.textPrimary }]}>
          {format(weekStart, "MMM d")} -{" "}
          {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </Text>
        <TouchableOpacity
          onPress={() => changeWeek(addWeeks(weekStart, 1))}
          style={styles.weekArrow}
          activeOpacity={0.6}
        >
          <Text style={[styles.weekArrowText, { color: theme.accent }]}>
            {">"}
          </Text>
        </TouchableOpacity>
      </View>

      {step === "pick" && (
        <>
          {/* Image preview if we have one from a previous attempt */}
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={[
                styles.preview,
                { backgroundColor: theme.colors.surfaceAlt },
              ]}
            />
          )}

          {failedImage && (
            <View
              style={[
                styles.reportCard,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.reportHeading,
                  { color: theme.colors.textPrimary },
                ]}
              >
                Couldn't read that schedule
              </Text>
              <Text
                style={[styles.reportBody, { color: theme.colors.textSecondary }]}
              >
                {failedImage.error}
              </Text>
              <TouchableOpacity
                style={[
                  styles.reportButton,
                  { backgroundColor: theme.accent },
                  reportSending && { backgroundColor: theme.colors.disabled },
                ]}
                onPress={handleReportFailed}
                disabled={reportSending}
                activeOpacity={0.8}
              >
                <Text style={styles.reportButtonText}>
                  {reportSending ? "Sending..." : "Send screenshot to improve"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.pickButton, { backgroundColor: theme.accent }]}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            <Text style={styles.pickButtonText}>Choose from Library</Text>
          </TouchableOpacity>

          <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
            Take a screenshot of your schedule and upload it here. The AI
            will read your shifts automatically.
          </Text>
        </>
      )}

      {step === "loading" && (
        <View style={styles.loadingContainer}>
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={[
                styles.previewSmall,
                { backgroundColor: theme.colors.surfaceAlt },
              ]}
            />
          )}
          <ActivityIndicator size="large" color={theme.accent} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textPrimary }]}
          >
            Reading your schedule...
          </Text>
          <Text
            style={[styles.loadingSubtext, { color: theme.colors.textMuted }]}
          >
            This usually takes a few seconds
          </Text>
        </View>
      )}

      {step === "review" && (
        <>
          {overrideActive && (
            <View
              style={[
                styles.banner,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[styles.bannerTitle, { color: theme.colors.textPrimary }]}
              >
                Using default shift hours — {hhmmToDisplay(effective.startTime)} to {hhmmToDisplay(effective.endTime)}
              </Text>
              <View style={styles.bannerActions}>
                <Pressable onPress={() => setEditDefaultVisible(true)}>
                  <Text style={[styles.bannerAction, { color: theme.accent }]}>
                    Edit
                  </Text>
                </Pressable>
                <Pressable onPress={disableOverrideForThisUpload}>
                  <Text
                    style={[
                      styles.bannerAction,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Disable for this upload
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          <Text
            style={[styles.reviewHeading, { color: theme.colors.textPrimary }]}
          >
            Found {shifts.length} shift{shifts.length !== 1 ? "s" : ""}
          </Text>
          <Text
            style={[styles.reviewSubtext, { color: theme.colors.textMuted }]}
          >
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
            style={[styles.saveButton, { backgroundColor: theme.accent }]}
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
            <Text
              style={[styles.retryButtonText, { color: theme.colors.textMuted }]}
            >
              Try a Different Photo
            </Text>
          </TouchableOpacity>
        </>
      )}

      <QuotaReachedModal
        visible={quota !== null}
        resetAt={quota?.resetAt}
        onClose={() => setQuota(null)}
      />

      <Modal visible={editDefaultVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              style={[styles.modalTitle, { color: theme.colors.textPrimary }]}
            >
              Edit hours for this upload
            </Text>
            <View style={styles.modalRow}>
              <Text
                style={[styles.modalLabel, { color: theme.colors.textMuted }]}
              >
                Start
              </Text>
              <DateTimePicker
                value={parseHHmm(effective.startTime)}
                mode="time"
                display="default"
                themeVariant={theme.mode}
                onChange={(_, selected) => {
                  if (selected) {
                    const next: DefaultShift = {
                      ...effective,
                      startTime: formatHHmm(selected),
                    };
                    setPerUploadOverride(next);
                    if (originalShifts)
                      setShifts(applyDefaultShift(originalShifts, next));
                  }
                }}
              />
            </View>
            <View style={styles.modalRow}>
              <Text
                style={[styles.modalLabel, { color: theme.colors.textMuted }]}
              >
                End
              </Text>
              <DateTimePicker
                value={parseHHmm(effective.endTime)}
                mode="time"
                display="default"
                themeVariant={theme.mode}
                onChange={(_, selected) => {
                  if (selected) {
                    const next: DefaultShift = {
                      ...effective,
                      endTime: formatHHmm(selected),
                    };
                    setPerUploadOverride(next);
                    if (originalShifts)
                      setShifts(applyDefaultShift(originalShifts, next));
                  }
                }}
              />
            </View>
            <Pressable
              onPress={() => setEditDefaultVisible(false)}
              style={[styles.modalDone, { backgroundColor: theme.accent }]}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function parseHHmm(hhmm: string): Date {
  return parse(hhmm, "HH:mm", new Date());
}

function formatHHmm(d: Date): string {
  return format(d, "HH:mm");
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
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  weekSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  },
  weekLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  preview: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 16,
  },
  previewSmall: {
    width: "100%",
    height: 150,
    borderRadius: 10,
    marginBottom: 20,
  },
  pickButton: {
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
  hint: {
    fontSize: 14,
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
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  reviewHeading: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  reviewSubtext: {
    fontSize: 14,
    marginBottom: 16,
  },
  saveButton: {
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
    fontSize: 15,
    fontWeight: "500",
  },
  reportCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  reportHeading: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  reportBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  reportButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  reportButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  banner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  bannerActions: {
    flexDirection: "row",
    gap: 16,
  },
  bannerAction: {
    fontSize: 14,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalDone: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});
