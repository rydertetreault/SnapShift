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
import { extractPayloadParam, isShortShareId } from "@/lib/sharing/link";
import { decodeWeek } from "@/lib/sharing/codec";
import { fetchShortShare } from "@/lib/sharing/shortLink";
import { importSharedWeek } from "@/lib/sharing/store";
import { ThemeProvider, useTheme } from "@/lib/theme/ThemeProvider";
import AnnouncementModal from "@/components/AnnouncementModal";
import { Sentry, initSentry } from "@/lib/sentry";

export { ErrorBoundary } from "expo-router";

// Initialize as early as possible so startup crashes are captured. No-op until
// EXPO_PUBLIC_SENTRY_DSN is set (see lib/sentry.ts).
initSentry();

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

function RootLayout() {
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
      // Universal Link to the proxy /s/* path counts as a share-week link.
      const isProxyShareUrl =
        parsed.protocol === "https:" &&
        parsed.host === "snap-shift-proxy.vercel.app" &&
        parsed.pathname.startsWith("/s/");
      // expo-linking normalizes the host into path on iOS; check both.
      const isAppSchemeShareWeek =
        parsed.protocol === "snapshift:" &&
        (parsed.host === "share-week" ||
          parsed.pathname.replace(/^\//, "") === "share-week");
      if (isProxyShareUrl || isAppSchemeShareWeek) {
        const token = extractPayloadParam(raw);
        if (!token) return;
        let payload;
        try {
          if (isShortShareId(token)) {
            const fetched = await fetchShortShare(token);
            if (!fetched) {
              Alert.alert(
                "Couldn't import schedule",
                "This shared link has expired or couldn't be loaded."
              );
              return;
            }
            payload = fetched;
          } else {
            payload = decodeWeek(token);
          }
        } catch (e: any) {
          Alert.alert("Couldn't import schedule", e?.message ?? "This link is invalid.");
          return;
        }
        Alert.alert(
          "Import shared week?",
          `${payload.name}'s schedule for the week of ${payload.week}.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Import",
              onPress: async () => {
                await importSharedWeek(payload);
                Alert.alert("Imported", `${payload.name}'s week is now on your calendar.`);
              },
            },
          ]
        );
        return;
      }
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
        <AnnouncementModal />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// Sentry.wrap enables native crash context + touch/navigation breadcrumbs.
// It's a transparent pass-through when no DSN is configured.
export default Sentry.wrap(RootLayout);
