/// <reference types="expo-task-manager" />

import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import { useLocationStore } from "../stores/locationStore";
import { locationContextFromText } from "../utils/locationContext";

export const GEOFENCE_TASK = "SNAPDONE_GEOFENCE_TASK";

/**
 * The shape of data received by the geofence task from expo-location.
 * Matches Location.GeofencingEventType.Enter (1) and LocationRegion.
 */
interface GeofenceEvent {
  eventType: number; // 1 = Enter, 2 = Exit
  region: {
    identifier?: string;
    latitude: number;
    longitude: number;
    radius: number;
    state?: number;
  };
}

/**
 * Background task that handles geofence enter/exit events from expo-location.
 *
 * Called by the OS when the user crosses a registered geofence boundary.
 * On enter: fires a local notification and cleans up the geofence.
 */
try {
  TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.warn("Geofence task error:", error.message);
    return;
  }

  const event = data as GeofenceEvent;

  // Only handle enter events (eventType 1 = Enter)
  if (event.eventType !== 1) return;

  const regionId = event.region.identifier;
  if (!regionId) return;

  const store = useLocationStore.getState();
  const entry = store.geofences[regionId];

  if (!entry) return;

  const ctx = locationContextFromText(entry.locationContext);
  const placeLabel = entry.locationContext || "this place";

  // Fire local notification immediately
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${ctx.icon} Location reminder`,
      body: `You're near ${placeLabel} — don't forget: ${entry.actionTitle}`,
      data: { actionId: entry.actionId, type: "location_snapback" },
      sound: true,
    },
    trigger: null,
  });

  // Clean up all geofences linked to this action
  store.removeGeofencesByActionId(entry.actionId);

  // Notify backend for analytics (best-effort, fire-and-forget)
  try {
    const { post } = await import("../services/api");
    await post("/api/v1/location/update", {
      lat: event.region.latitude,
      lng: event.region.longitude,
      place_name: placeLabel,
      place_type: ctx.type,
    });
  } catch {
    // Best-effort — backend ping is fire-and-forget
    }
  });
} catch {
  // TaskManager not available — geofencing disabled gracefully
}
