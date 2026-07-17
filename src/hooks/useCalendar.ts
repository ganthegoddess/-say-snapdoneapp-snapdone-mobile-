import { useCallback, useState } from "react";
import * as Calendar from "expo-calendar";
import { Platform, Alert } from "react-native";

interface CreateEventParams {
  title: string;
  notes?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  alarms?: { relativeOffset: number }[];
}

export function useCalendar() {
  const [calendarId, setCalendarId] = useState<string | null>(null);

  /** Request calendar permissions */
  const requestPermissions = useCallback(async () => {
    const { status: existing } = await Calendar.getCalendarPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  }, []);

  /** Get or create the SnapDone calendar */
  const ensureSnapDoneCalendar = useCallback(async () => {
    // Check if we already have a cached calendar ID
    if (calendarId) return calendarId;

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert("Calendar Access", "SnapDone needs calendar access to add events. Grant access in Settings.");
      return null;
    }

    // Look for existing SnapDone calendar
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const existing = calendars.find(
      (c) => c.title === "SnapDone" || c.source.name === "SnapDone"
    );

    if (existing) {
      setCalendarId(existing.id);
      return existing.id;
    }

    // Create a new SnapDone calendar
    const defaultSource = calendars.find(
      (c) => c.allowsModifications && c.source.type === "LOCAL"
    )?.source;

    if (!defaultSource) {
      Alert.alert("Error", "Could not find a writable calendar source.");
      return null;
    }

    try {
      const newId = await Calendar.createCalendarAsync({
        title: "SnapDone",
        color: "#0891B2",
        entityType: Calendar.EntityTypes.EVENT,
        source: defaultSource,
        name: "SnapDone",
        ownerAccount: "snapdone",
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });

      setCalendarId(newId);
      return newId;
    } catch {
      // Fallback: use device default calendar
      const defaultCalendar = calendars.find((c) => c.allowsModifications);
      if (defaultCalendar) {
        setCalendarId(defaultCalendar.id);
        return defaultCalendar.id;
      }
      return null;
    }
  }, [calendarId]);

  /** Create a calendar event */
  const createEvent = useCallback(
    async ({ title, notes, startDate, endDate, location, alarms }: CreateEventParams) => {
      const calId = await ensureSnapDoneCalendar();
      if (!calId) return null;

      const defaultEnd = new Date(startDate);
      defaultEnd.setHours(defaultEnd.getHours() + 1);

      try {
        const eventId = await Calendar.createEventAsync(calId, {
          title,
          notes,
          startDate,
          endDate: endDate || defaultEnd,
          location: location || undefined,
          alarms: alarms || [{ relativeOffset: -15 }], // 15 min before
          timeZone: Platform.OS === "ios" ? undefined : Intl.DateTimeFormat().resolvedOptions().timeZone,
        });

        return eventId;
      } catch (err: any) {
        Alert.alert("Calendar Error", err.message || "Could not create event");
        return null;
      }
    },
    [ensureSnapDoneCalendar]
  );

  return {
    requestPermissions,
    createEvent,
    ensureSnapDoneCalendar,
  };
}