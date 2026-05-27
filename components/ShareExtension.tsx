import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import {
  close,
  openHostApp,
  Text,
  InitialProps,
} from "expo-share-extension";

// Mirrors lib/canvas/preferences.ts#looksLikeCanvasFeedUrl — duplicated rather than
// imported because the share extension is a separate bundle and we don't want
// AsyncStorage / other RN modules pulled into its build.
function looksLikeCanvasFeedUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed) && !/^webcal:\/\//i.test(trimmed)) return false;
  return /\.ics(\?|$)/i.test(trimmed) || /\/feeds\/calendars\//i.test(trimmed);
}

export default function ShareExtension({ url }: InitialProps) {
  const [message, setMessage] = useState("Adding to SnapShift…");

  useEffect(() => {
    if (!url) {
      setMessage("No URL was shared.");
      const t = setTimeout(close, 1200);
      return () => clearTimeout(t);
    }
    if (!looksLikeCanvasFeedUrl(url)) {
      setMessage("That doesn't look like a Canvas calendar feed URL.");
      const t = setTimeout(close, 1600);
      return () => clearTimeout(t);
    }
    // Hand off to the main app via a deep link; the main app's _layout picks this
    // up and runs connectCanvas() on the URL.
    openHostApp(`canvas-connect?url=${encodeURIComponent(url)}`);
  }, [url]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2196F3" />
      <Text style={styles.message} allowFontScaling={false}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  message: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
});
