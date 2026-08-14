/**
 * Global error handler — prevents unhandled JS exceptions
 * from crashing the app (SIGABRT) in production builds.
 *
 * In React Native release builds, any unhandled JS error
 * is promoted to a native SIGABRT crash. This catcher
 * logs the error gracefully and keeps the app alive.
 *
 * Import this FIRST — before any other module in the app.
 */

import { Alert, Platform } from "react-native";

// Track whether we've already shown the recovery alert
let hasShownRecoveryAlert = false;

// Store original handler so we can still log
const originalHandler = (globalThis as any).ErrorUtils?.getGlobalHandler?.();

function globalErrorHandler(error: Error, isFatal?: boolean) {
  // Always log the error
  console.error("SnapDone: Unhandled error caught by global handler:", {
    message: error?.message,
    stack: error?.stack?.slice(0, 500),
    isFatal,
    platform: Platform.OS,
  });

  // For fatal errors on iOS, show a recovery message instead of crashing
  if (isFatal && !hasShownRecoveryAlert) {
    hasShownRecoveryAlert = true;
    try {
      Alert.alert(
        "Something went wrong",
        "SnapDone hit an unexpected error. Please restart the app.",
        [{ text: "OK" }]
      );
    } catch {
      // Alert might not be available this early
    }
  }

  // Call original handler if it exists (for logging/debugging)
  if (originalHandler && originalHandler !== globalErrorHandler) {
    try {
      originalHandler(error, isFatal);
    } catch {
      // Ignore
    }
  }
}

// Install the handler
try {
  (globalThis as any).ErrorUtils?.setGlobalHandler?.(globalErrorHandler);
  console.log("SnapDone: Global error handler installed");
} catch {
  console.warn("SnapDone: Could not install global error handler");
}
