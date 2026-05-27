// Wraps Metro so the iOS share extension target (index.share.tsx) is bundled correctly.
const { getDefaultConfig } = require("expo/metro-config");
const { withShareExtension } = require("expo-share-extension/metro");

module.exports = withShareExtension(getDefaultConfig(__dirname), {
  isCSSEnabled: true,
});
