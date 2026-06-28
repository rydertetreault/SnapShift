// lib/appIcon.ts
// Thin wrapper around `expo-alternate-app-icons` that:
//   - exposes a typed list of selectable icons + their preview images
//   - safely no-ops in Expo Go / web / dev simulators where the native
//     side isn't linked (the package eagerly calls requireNativeModule
//     at import time, which throws otherwise)
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

// PascalCase keys MUST match the `name` field registered in app.config.ts.
// `null` represents the default icon (the original green icon.png).
export type AppIconKey =
  | null
  | "Blue"
  | "Purple"
  | "Pink"
  | "Orange"
  | "Red"
  | "Charcoal"
  | "Grey"
  | "GreyBlack"
  | "White";

export interface AppIconOption {
  /** API key. `null` = default green icon. */
  key: AppIconKey;
  /** Label shown in the picker. */
  label: string;
  /** require()d preview image used in the Settings grid. */
  preview: number;
}

// The order here is the order the picker renders.
// require() so Metro bundles the previews; the actual icons used by iOS at
// runtime are registered via the expo-alternate-app-icons plugin and live
// inside the native binary.
export const APP_ICON_OPTIONS: AppIconOption[] = [
  {
    key: null,
    label: "Green",
    preview: require("../assets/images/icon.png"),
  },
  {
    key: "Blue",
    label: "Blue",
    preview: require("../assets/images/icons-alt/icon-blue.png"),
  },
  {
    key: "Purple",
    label: "Purple",
    preview: require("../assets/images/icons-alt/icon-purple.png"),
  },
  {
    key: "Pink",
    label: "Pink",
    preview: require("../assets/images/icons-alt/icon-pink.png"),
  },
  {
    key: "Orange",
    label: "Orange",
    preview: require("../assets/images/icons-alt/icon-orange.png"),
  },
  {
    key: "Red",
    label: "Red",
    preview: require("../assets/images/icons-alt/icon-red.png"),
  },
  {
    key: "Charcoal",
    label: "Charcoal",
    preview: require("../assets/images/icons-alt/icon-charcoal.png"),
  },
  {
    key: "Grey",
    label: "Grey",
    preview: require("../assets/images/icons-alt/icon-grey.png"),
  },
  {
    key: "GreyBlack",
    label: "Grey · Dark",
    preview: require("../assets/images/icons-alt/icon-grey-black.png"),
  },
  {
    key: "White",
    label: "White",
    preview: require("../assets/images/icons-alt/icon-white.png"),
  },
];

// Detect at module-load time whether we can even attempt the native module.
// Expo Go ships without our config-plugin-registered native code, so any
// touch of the package's top-level `requireNativeModule` call throws. Same
// for web. We bail BEFORE the require so it never executes.
const IS_NATIVE_AVAILABLE =
  Platform.OS === "ios" &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

// Cache the loaded module (or `null` if the require failed) so we only try
// once. Failed requires are sticky.
let cachedModule: any = null;
let attemptedLoad = false;
function nativeModule(): any | null {
  if (!IS_NATIVE_AVAILABLE) return null;
  if (attemptedLoad) return cachedModule;
  attemptedLoad = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require("expo-alternate-app-icons");
    return cachedModule;
  } catch {
    cachedModule = null;
    return null;
  }
}

/**
 * Whether the current runtime can actually change the app icon. False in
 * Expo Go, on web, or in environments where the native module didn't load.
 */
export function canChangeAppIcon(): boolean {
  const mod = nativeModule();
  if (!mod) return false;
  try {
    return Boolean(mod.supportsAlternateIcons);
  } catch {
    return false;
  }
}

/**
 * Current app icon key, or `null` when the default icon is active.
 */
export function getCurrentAppIcon(): AppIconKey {
  const mod = nativeModule();
  if (!mod) return null;
  try {
    const name = mod.getAppIconName();
    return (name as AppIconKey) ?? null;
  } catch {
    return null;
  }
}

/**
 * Switch the app icon. Passing `null` resets to the default. Returns the
 * resolved key on success, or `null` if the change couldn't be applied.
 *
 * iOS will show a one-time system alert ("You have changed the icon for
 * SnapShift") that we have no control over.
 */
export async function setAppIcon(key: AppIconKey): Promise<AppIconKey> {
  const mod = nativeModule();
  if (!mod) return getCurrentAppIcon();
  try {
    const result = await mod.setAlternateAppIcon(key);
    return (result as AppIconKey) ?? null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[appIcon] setAlternateAppIcon failed:", e);
    return getCurrentAppIcon();
  }
}
