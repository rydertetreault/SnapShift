// components/QuotaReachedModal.tsx
// Shown when the proxy reports the device has used up its free-tier scan quota
// (HTTP 429 / code DEVICE_QUOTA). Frames the limit as a soft cap with a paid
// "unlimited" tier on the way — turning a wall into a signal of demand.
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { formatDistanceToNow } from "date-fns";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/lib/theme/ThemeProvider";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Epoch ms when the free quota refreshes, if the server reported it. */
  resetAt?: number;
}

export default function QuotaReachedModal({ visible, onClose, resetAt }: Props) {
  const theme = useTheme();

  const resetLabel =
    resetAt && resetAt > Date.now()
      ? `Your free scans reset in about ${formatDistanceToNow(new Date(resetAt))}.`
      : null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.colors.surface }]}
          onPress={() => {}}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.accent }]}>
            <FontAwesome name="bolt" size={26} color="#fff" />
          </View>

          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            You're on a roll!
          </Text>

          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            You've used all your free schedule scans for now. Thanks for putting
            SnapShift to work.
          </Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            Unlimited scans are coming soon as a SnapShift Premium feature. Until
            then, your free scans will refresh automatically.
          </Text>
          {resetLabel && (
            <Text style={[styles.reset, { color: theme.colors.textMuted }]}>
              {resetLabel}
            </Text>
          )}

          <Pressable
            onPress={onClose}
            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>Got it</Text>
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
  reset: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 4,
    fontStyle: "italic",
  },
  primaryBtn: {
    alignSelf: "stretch",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
