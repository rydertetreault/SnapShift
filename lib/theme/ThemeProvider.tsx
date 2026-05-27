// lib/theme/ThemeProvider.tsx
import { createContext, ReactNode, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useAppearance } from "@/lib/preferences";
import { DARK_COLORS, LIGHT_COLORS, Theme } from "./tokens";

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const appearance = useAppearance();
  const systemScheme = useColorScheme();
  const theme = useMemo<Theme>(() => {
    const resolved =
      appearance.mode === "system"
        ? systemScheme === "dark" ? "dark" : "light"
        : appearance.mode;
    return {
      mode: resolved,
      accent: appearance.accent,
      colors: resolved === "dark" ? DARK_COLORS : LIGHT_COLORS,
    };
  }, [appearance.mode, appearance.accent, systemScheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const v = useContext(ThemeContext);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}
