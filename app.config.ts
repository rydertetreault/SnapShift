import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "SnapShift",
  slug: "snapshift",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "snapshift",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: false,
    bundleIdentifier: "dev.rydertetreault.snapshift",
    buildNumber: "1",
    infoPlist: {
      NSCameraUsageDescription:
        "SnapShift uses the camera so you can take a photo of your work schedule and have it added to your calendar.",
      NSPhotoLibraryUsageDescription:
        "SnapShift needs access to your photo library so you can upload schedule screenshots and have them added to your calendar.",
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
