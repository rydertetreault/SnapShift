import { ConfigContext, ExpoConfig } from "expo/config";

// The Sentry config plugin (native init + source-map upload on EAS) is only
// added when a DSN is present. Until then the build is byte-for-byte unchanged.
// Set EXPO_PUBLIC_SENTRY_DSN (+ SENTRY_ORG / SENTRY_PROJECT for source maps,
// and SENTRY_AUTH_TOKEN as an EAS secret) to activate it.
const sentryPlugin: ExpoConfig["plugins"] = process.env.EXPO_PUBLIC_SENTRY_DSN
  ? [
      [
        "@sentry/react-native/expo",
        {
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
        },
      ],
    ]
  : [];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "SnapShift",
  slug: "snapshift",
  version: "1.3.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "snapshift",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: false,
    bundleIdentifier: "dev.rydertetreault.snapshift",
    buildNumber: "15",
    // Universal Links: https links to /s/* on the proxy domain open SnapShift
    // directly (no Safari hop). Requires the AASA file at
    // https://snap-shift-proxy.vercel.app/.well-known/apple-app-site-association
    // which is served by proxy/api/aasa.js.
    associatedDomains: ["applinks:snap-shift-proxy.vercel.app"],
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        "SnapShift needs access to your photo library so you can upload schedule screenshots. Selected images may be sent to an AI service for reading when our local parser cannot recognize the format.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#2d642a",
    },
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        // Neutral white so the splash pairs with any user-selected app icon
        // color (Green default, Blue, Pink, Charcoal, etc). The splash icon
        // itself is a dark logo on a transparent background; this color is
        // what shows behind it.
        backgroundColor: "#ffffff",
      },
    ],
    "@react-native-community/datetimepicker",
    "expo-web-browser",
    [
      "expo-calendar",
      {
        calendarPermission:
          "SnapShift uses your iPhone Calendar so you can see existing events alongside SnapShift events, and optionally save SnapShift events back to a dedicated SnapShift calendar.",
      },
    ],
    [
      "expo-share-extension",
      {
        // Single-URL share: Safari "Calendar Feed" link, Canvas in-app link share, etc.
        activationRules: [{ type: "url", max: 1 }],
        height: 260,
        excludedPackages: [
          "expo-dev-client",
          "expo-splash-screen",
          "expo-updates",
          "expo-font",
        ],
      },
    ],
    // Alternate app icons. The default icon stays at `./assets/images/icon.png`
    // (the original green). These are the user-selectable variants. Names use
    // PascalCase per the plugin's convention; the keys we ship in code below
    // mirror them (`Blue`, `Purple`, etc.). Adding/removing icons requires a
    // new App Store build — they can't be updated OTA.
    [
      "expo-alternate-app-icons",
      [
        { name: "Blue",     ios: "./assets/images/icons-alt/icon-blue.png" },
        { name: "Purple",   ios: "./assets/images/icons-alt/icon-purple.png" },
        { name: "Pink",     ios: "./assets/images/icons-alt/icon-pink.png" },
        { name: "Orange",   ios: "./assets/images/icons-alt/icon-orange.png" },
        { name: "Red",      ios: "./assets/images/icons-alt/icon-red.png" },
        { name: "Charcoal", ios: "./assets/images/icons-alt/icon-charcoal.png" },
        { name: "Grey",     ios: "./assets/images/icons-alt/icon-grey.png" },
        { name: "GreyBlack",ios: "./assets/images/icons-alt/icon-grey-black.png" },
        { name: "White",    ios: "./assets/images/icons-alt/icon-white.png" },
      ],
    ],
    ...sentryPlugin,
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "9ba1a8a9-913f-496c-a22d-06717ac3331b",
    },
  },
});
