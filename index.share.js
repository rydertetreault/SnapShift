// Bundle entry point for the iOS share extension. The first arg to
// AppRegistry.registerComponent MUST be "shareExtension" per expo-share-extension.
import { AppRegistry } from "react-native";
import ShareExtension from "./components/ShareExtension";

AppRegistry.registerComponent("shareExtension", () => ShareExtension);
