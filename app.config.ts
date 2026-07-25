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
    buildNumber: "4",
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
        backgroundColor: "#2d642a",
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
