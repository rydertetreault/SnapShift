// components/AnnouncementModal.tsx
// One-time startup popup: thanks users for the recent surge, announces the
// upgraded scanner, and invites a review. Self-contained — it decides whether to
// show based on the dismissed-announcements store, and writes the dismissal flag
// when closed so it never reappears. Bump CURRENT_ANNOUNCEMENT_ID for a new one.
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/lib/theme/ThemeProvider";
import {
  CURRENT_ANNOUNCEMENT_ID,
  dismissAnnouncement,
  isAnnouncementDismissed,
} from "@/lib/preferences";
import { requestAppReview } from "@/lib/review";

export default function AnnouncementModal() {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    isAnnouncementDismissed(CURRENT_ANNOUNCEMENT_ID).then((dismissed) => {
      if (active && !dismissed) setVisible(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Dismiss for this launch only — the popup returns next time the app opens.
  function closeForNow() {
    setVisible(false);
  }

  // The only action that stops the popup from reappearing on future launches.
  async function dontShowAgain() {
    setVisible(false);
    await dismissAnnouncement(CURRENT_ANNOUNCEMENT_ID);
  }

  async function handleReview() {
    closeForNow();
    await requestAppReview();
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={closeForNow}>
      <Pressable style={styles.backdrop} onPress={closeForNow}>
        {/* Absorb taps on the card so they don't fall through to the backdrop. */}
        <Pressable
          style={[styles.card, { backgroundColor: theme.colors.surface }]}
          onPress={() => {}}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.accent }]}>
            <FontAwesome name="heart" size={26} color="#fff" />
          </View>

          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Thank you!
          </Text>

          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            SnapShift has welcomed a wave of new users lately, and I'm genuinely
            grateful you're here.
          </Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            I've also upgraded the scanner: it can now read virtually any schedule
            you throw at it. Snap a screenshot and give it a try.
          </Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            If SnapShift is helping you out, a quick App Store review goes a long
            way and helps others find it.
          </Text>

          <Pressable
            onPress={handleReview}
            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
            accessibilityRole="button"
          >
            <FontAwesome name="star" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Leave a Review</Text>
          </Pressable>

          <Pressable onPress={dontShowAgain} style={styles.dismissBtn} accessibilityRole="button">
            <Text style={[styles.dismissText, { color: theme.colors.textMuted }]}>
              Don't show this again
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  body: { fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 12 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  dismissBtn: { paddingVertical: 12, marginTop: 4 },
  dismissText: { fontSize: 15, fontWeight: "600" },
});
