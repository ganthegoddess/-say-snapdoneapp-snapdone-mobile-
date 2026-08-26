import { useCallback, useState } from "react";
import { Alert, Platform } from "react-native";
import * as Calendar from "expo-calendar";

interface CreateEventParams {
  title: string;
  notes?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  alarms?: { relativeOffset: number }[];
}

/**
 * Calendar integration using the expo-calendar 57 object-oriented API.
 *
 * NOTE: the legacy `*Async` methods (getCalendarPermissionsAsync,
 * requestCalendarPermissionsAsync, getCalendarsAsync, createCalendarAsync,
 * createEventAsync) THROW at runtime in expo-calendar 57 — they are deprecated
 * no-ops that raise an error telling you to migrate. This hook uses the new
 * API: `getCalendarPermissions()/requestCalendarPermissions()`,
 * `getCalendars()/createCalendar()` and `calendar.createEvent()`.
 */
export function useCalendar() {
  const [calendar, setCalendar] = useState<Calendar.ExpoCalendar | null>(null);

  /** Request calendar permissions */
  const requestPermissions = useCallback(async () => {
    const existing = await Calendar.getCalendarPermissions();
    if (existing.status === "granted") return true;
    const { status } = await Calendar.requestCalendarPermissions();
    return status === "granted";
  }, []);

  /** Get or create the SnapDone calendar */
  const ensureSnapDoneCalendar = useCallback(async (): Promise<Calendar.ExpoCalendar | null> => {
    // Use a cached calendar object if we already resolved one.
    if (calendar) return calendar;
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert("Calendar Access", "SnapDone needs calendar access to add events. Grant access in Settings.");
      return null;
    }
    // Look for an existing SnapDone calendar.
    const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
    const existing = calendars.find(
      (c) => c.title === "SnapDone" || c.source?.name === "SnapDone"
    );
    if (existing) {
      setCalendar(existing);
      return existing;
    }
    // Create a new SnapDone calendar (prefer a LOCAL writable source).
    const defaultSource = calendars.find(
      (c) => c.allowsModifications && c.source?.type === "LOCAL"
    )?.source;
    if (!defaultSource) {
      Alert.alert("Error", "Could not find a writable calendar source.");
      return null;
    }
    try {
      const created = await Calendar.createCalendar({
        title: "SnapDone",
        color: "#0891B2",
        entityType: Calendar.EntityTypes.EVENT,
        source: defaultSource,
        name: "SnapDone",
        ownerAccount: "snapdone",
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
      setCalendar(created);
      return created;
    } catch (err: any) {
      // Fallback: use the device's first writable calendar.
      const fallback = calendars.find((c) => c.allowsModifications);
      if (fallback) {
        setCalendar(fallback);
        return fallback;
      }
      console.warn("ensureSnapDoneCalendar failed:", err);
      return null;
    }
  }, [calendar, requestPermissions]);

  /** Create a calendar event */
  const createEvent = useCallback(
    async ({ title, notes, startDate, endDate, location, alarms }: CreateEventParams) => {
      const cal = await ensureSnapDoneCalendar();
      if (!cal) return null;
      const defaultEnd = new Date(startDate);
      defaultEnd.setHours(defaultEnd.getHours() + 1);
      try {
        const event = await cal.createEvent({
          title,
          notes: notes || undefined,
          startDate,
          endDate: endDate || defaultEnd,
          location: location || undefined,
          alarms: alarms || [{ relativeOffset: -15 }], // 15 min before
          timeZone: Platform.OS === "ios" ? undefined : Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        return event.id || event.calendarId || null;
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
