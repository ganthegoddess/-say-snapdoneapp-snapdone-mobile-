import { useCallback, useEffect } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface ScheduleReminderParams {
  title: string;
  body?: string;
  date: Date;
  actionId?: string;
}

export function useNotifications() {
  /** Request notification permissions */
  const requestPermissions = useCallback(async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return false;
    }

    // Android: create notification channels
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("reminders", {
        name: "Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0891B2",
      });
      await Notifications.setNotificationChannelAsync("household", {
        name: "Household",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    return true;
  }, []);

  /** Schedule a local notification for a reminder. Resolves true when scheduled,
   *  false when it couldn't be (past-date, permission, or platform error) — the
   *  caller surfaces a warm message instead of a red throw. Never throws. */
  const scheduleReminder = useCallback(
    async ({ title, body, date, actionId }: ScheduleReminderParams): Promise<boolean> => {
      // A reminder scheduled in the past throws ERR_NOTIFICATIONS_FAILED_TO_SCHEDULE.
      if (!date || date.getTime() <= Date.now()) return false;
      // Defensive: reject the literal "null"/"undefined" strings the backend can
      // leak, plus empty/whitespace — a SnapBack must NEVER surface a bare "null".
      const cleanBody = (body ?? "").trim();
      const isLiteralNullish =
        cleanBody.length === 0 ||
        cleanBody.toLowerCase() === "null" ||
        cleanBody.toLowerCase() === "undefined";
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body: isLiteralNullish ? "Tap to view details" : cleanBody,
            data: { actionId, type: "reminder" },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
          },
        });
        return true;
      } catch (err) {
        console.warn("scheduleReminder failed:", err);
        return false;
      }
    },
    []
  );

  /** Cancel a scheduled notification */
  const cancelReminder = useCallback(async (notificationId: string) => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }, []);

  /** Cancel all scheduled notifications */
  const cancelAll = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }, []);

  /** Handle notification tap — returns the data payload */
  const handleNotificationTap = useCallback(
    (response: Notifications.NotificationResponse) => {
      return response.notification.request.content.data;
    },
    []
  );

  return {
    requestPermissions,
    scheduleReminder,
    cancelReminder,
    cancelAll,
    handleNotificationTap,
  };
}