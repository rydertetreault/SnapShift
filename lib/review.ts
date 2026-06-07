// lib/review.ts
// Two ways to ask for an App Store review:
//   - requestAppReview(): try Apple's native in-app prompt, fall back to the
//     App Store page if the OS won't show it (it rate-limits the native prompt).
//   - openAppStoreReviewPage(): always open the App Store "write a review" page.
import * as StoreReview from "expo-store-review";
import { Linking } from "react-native";
import { APP_STORE_ID } from "./constants";

const WRITE_REVIEW_URL = `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;

/** Open the App Store review composer directly. Used by the explicit Settings button. */
export async function openAppStoreReviewPage(): Promise<void> {
  try {
    await Linking.openURL(WRITE_REVIEW_URL);
  } catch {
    // Nothing more we can do if the App Store can't be opened.
  }
}

/**
 * Ask for a review. Prefers Apple's native in-app prompt (no app switch); if the
 * OS reports it as unavailable, falls back to opening the App Store review page.
 */
export async function requestAppReview(): Promise<void> {
  try {
    const available = await StoreReview.isAvailableAsync();
    if (available) {
      await StoreReview.requestReview();
      return;
    }
  } catch {
    // Fall through to the link fallback.
  }
  await openAppStoreReviewPage();
}
