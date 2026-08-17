import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { registerPushToken } from "../services/push";

/**
 * Remote push wiring for SnapBack — the app's half of the push pipeline.
 *
 * Backend (live): the SnapBack scheduler POSTs to Expo's push service with
 * `data.url = snapdone://action/<actionId>`; the app must register its device
 * token so the scheduler knows where to send.
 *
 * Policies:
 * - Permission is requested ONLY while a user is authenticated (never on
 *   cold start before auth resolves). A restored session (stay-logged-in)
 *   counts as authenticated — the prompt appears after the home screen mounts.
 * - Everything degrades gracefully: denied permission, token fetch failure, or
 *   a backend error never blocks or crashes the app. SnapBack still works
 *   in-app (Home recall) and via email fallback server-side.
 */

/** Request permission + register the Expo push token with the backend. */
export async function setupPushRegistration(): Promise<void> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      // User declined — graceful: no token, no error surface.
      return;
    }

    // Android: SnapBack channel must exist for reliable delivery.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("snapback", {
        name: "SnapBack",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0891B2",
      });
    }

    const token = await Notifications.getExpoPushTokenAsync();
    await registerPushToken(token.data);
  } catch (err) {
    // Remote push is best-effort; never let it break the app.
    console.warn("Push registration skipped:", err);
  }
}

/**
 * Cold-start deep link: when the app is launched BY TAPPING a SnapBack
 * notification, the response listener does not fire — the pending response
 * must be read once after launch. Navigates to the action screen.
 */
export async function handleColdStartNotification(): Promise<boolean> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return false;
    const data = response.notification.request.content
      .data as Record<string, unknown> | undefined;
    if (data?.actionId) {
      // One tick delay so the navigation tree is mounted.
      setTimeout(() => router.push(`/action/${data.actionId}`), 300);
      return true;
    }
    if (data?.captureId) {
      setTimeout(() => router.push(`/processing/${data.captureId}`), 300);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
