import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Alert, AppState, Linking } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { maybeExtendIndefiniteSeries } from "@/lib/seriesMaintenance";
import { syncIosCalendars } from "@/lib/calendar/sync";
import { mirrorSnapShiftEvents } from "@/lib/calendar/mirror";
import { connectCanvas, syncCanvas } from "@/lib/canvas/sync";
import { looksLikeCanvasFeedUrl } from "@/lib/canvas/preferences";
import { ThemeProvider, useTheme } from "@/lib/theme/ThemeProvider";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

function ThemedStack() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: { color: theme.colors.textPrimary },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="event/[id]"
        options={{ title: "Event Details", presentation: "modal" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    maybeExtendIndefiniteSeries().catch(console.warn);
  }, []);

  useEffect(() => {
    const runSync = () => {
      syncIosCalendars().catch(console.warn);
      syncCanvas().catch(console.warn);
      mirrorSnapShiftEvents().catch(console.warn);
    };
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") runSync();
    });
    runSync();
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Handles `snapshift://canvas-connect?url=...` from the iOS share extension.
    const handle = async (raw: string | null) => {
      if (!raw) return;
      let parsed: URL;
      try {
        parsed = new URL(raw);
      } catch {
        return;
      }
      // expo-linking normalizes the host into path on iOS; check both.
      const isCanvasConnect =
        parsed.host === "canvas-connect" ||
        parsed.pathname.replace(/^\//, "") === "canvas-connect";
      if (!isCanvasConnect) return;
      const feedUrl = parsed.searchParams.get("url");
      if (!feedUrl || !looksLikeCanvasFeedUrl(feedUrl)) return;
      try {
        const imported = await connectCanvas(feedUrl);
        Alert.alert("Canvas connected", `${imported} item${imported === 1 ? "" : "s"} imported.`);
      } catch (e: any) {
        Alert.alert("Couldn't connect Canvas", e?.message ?? "Unknown error fetching feed.");
      }
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener("url", ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ThemedStack />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
