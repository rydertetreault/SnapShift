// lib/theme/tokens.ts
export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Hint colors for off/empty states and disabled UI.
  disabled: string;
}

export const LIGHT_COLORS: ThemeColors = {
  background: "#ffffff",
  surface: "#ffffff",
  surfaceAlt: "#f5f5f5",
  border: "#e0e0e0",
  textPrimary: "#222222",
  textSecondary: "#555555",
  textMuted: "#999999",
  disabled: "#cccccc",
};

export const DARK_COLORS: ThemeColors = {
  background: "#121212",
  surface: "#1e1e1e",
  surfaceAlt: "#2a2a2a",
  border: "#333333",
  textPrimary: "#f1f1f1",
  textSecondary: "#bbbbbb",
  textMuted: "#888888",
  disabled: "#555555",
};

export interface Theme {
  mode: "light" | "dark";
  accent: string;
  colors: ThemeColors;
}
