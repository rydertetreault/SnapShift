// lib/sentry.ts
// Crash + error reporting. Entirely gated on EXPO_PUBLIC_SENTRY_DSN: with no
// DSN set, init is a no-op and nothing is sent — so the app behaves identically
// to before Sentry was added until you wire up a real project.
//
// Privacy: SnapShift is local-first and privacy-focused (see PRIVACY.md). We
// never attach PII and never send request bodies (schedule images stay on the
// device / go only to the vision proxy). This captures crashes and errors only.
import * as Sentry from "@sentry/react-native";

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** True when a DSN is configured, so UI can hide diagnostics affordances. */
export const sentryEnabled = Boolean(SENTRY_DSN);

export function initSentry(): void {
  if (!SENTRY_DSN) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    // Don't report from local dev / Expo Go — only real (preview/prod) builds.
    enabled: !__DEV__,
    // Never attach IP/PII. Crashes and errors only.
    sendDefaultPii: false,
    // Light performance sampling; raise once you know your volume.
    tracesSampleRate: 0.2,
  });
}

/** Fire a known error so you can confirm events are landing in Sentry. */
export function sendSentryTestEvent(): void {
  Sentry.captureException(new Error("SnapShift Sentry test event"));
}

export { Sentry };
