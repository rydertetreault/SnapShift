import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { maybeExtendIndefiniteSeries } from "@/lib/seriesMaintenance";
import { syncIosCalendars } from "@/lib/calendar/sync";
import { mirrorSnapShiftEvents } from "@/lib/calendar/mirror";
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
      mirrorSnapShiftEvents().catch(console.warn);
    };
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") runSync();
    });
    runSync();
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
