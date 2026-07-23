import { useCallback, useEffect } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
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

  /** Schedule a local notification for a reminder */
  const scheduleReminder = useCallback(
    async ({ title, body, date, actionId }: ScheduleReminderParams) => {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: body || "Tap to view details",
          data: { actionId, type: "reminder" },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
      return id;
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