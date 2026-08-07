import { useCallback } from "react";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useLocationStore } from "../stores/locationStore";
import { GEOFENCE_TASK } from "../tasks/geofenceTask";
import { locationContextFromText } from "../utils/locationContext";

/** Radius in meters for location context types */
const CONTEXT_RADII: Record<string, number> = {
  grocery_store: 500,
  pharmacy: 500,
  school: 1000,
  work: 1000,
  medical: 500,
  default: 500,
};

function getRadius(context: string): number {
  return CONTEXT_RADII[context] || CONTEXT_RADII.default;
}

export function useGeofence() {
  const locationRemindersEnabled = useLocationStore((s) => s.locationRemindersEnabled);
  const addGeofence = useLocationStore((s) => s.addGeofence);
  const removeGeofence = useLocationStore((s) => s.removeGeofence);
  const removeGeofencesByActionId = useLocationStore((s) => s.removeGeofencesByActionId);

  /** Request foreground location permissions */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === "granted";
    } catch {
      return false;
    }
  }, []);

  /** Register a geofence region for the given action and location text */
  const registerGeofence = useCallback(
    async (
      actionId: string,
      actionTitle: string,
      locationText: string,
      latitude: number,
      longitude: number
    ): Promise<string | null> => {
      if (!locationRemindersEnabled) return null;

      try {
        const ctx = locationContextFromText(locationText);
        const radius = ctx.radius;
        const regionId = `snapdone-${actionId}-${Date.now()}`;

        // Start geofencing for the region
        await Location.startGeofencingAsync(GEOFENCE_TASK, [
          {
            identifier: regionId,
            latitude,
            longitude,
            radius,
            notifyOnEnter: true,
            notifyOnExit: false,
          },
        ]);

        // Persist the mapping
        addGeofence({
          regionId,
          actionId,
          actionTitle,
          locationContext: locationText,
          registeredAt: new Date().toISOString(),
        });

        return regionId;
      } catch (err) {
        console.warn("Failed to register geofence:", err);
        return null;
      }
    },
    [locationRemindersEnabled, addGeofence]
  );

  /** Unregister a specific geofence region */
  const unregisterGeofence = useCallback(
    async (regionId: string) => {
      try {
        await Location.stopGeofencingAsync(GEOFENCE_TASK);
        removeGeofence(regionId);
      } catch (err) {
        console.warn("Failed to unregister geofence:", err);
      }
    },
    [removeGeofence]
  );

  /** Handle geofence enter event — fire notification and clean up */
  const handleGeofenceEnter = useCallback(
    async (regionId: string) => {
      const store = useLocationStore.getState();
      const entry = store.geofences[regionId];
      if (!entry) return;

      const ctx = locationContextFromText(entry.locationContext);
      const placeLabel = entry.locationContext || "this place";

      // Fire local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${ctx.icon} Location reminder`,
          body: `You're near ${placeLabel} — don't forget: ${entry.actionTitle}`,
          data: { actionId: entry.actionId, type: "location_snapback" },
          sound: true,
        },
        trigger: null, // immediate
      });

      // Clean up: unregister local geofences for this action
      removeGeofencesByActionId(entry.actionId);

      // Notify backend for analytics (best-effort)
      try {
        const { post } = await import("../services/api");
        await post("/api/v1/location/update", {
          action_id: entry.actionId,
          region_id: regionId,
          place_name: placeLabel,
          place_type: ctx.type,
        });
      } catch {
        // Best-effort — backend ping is fire-and-forget
      }
    },
    [removeGeofencesByActionId]
  );

  return {
    locationRemindersEnabled,
    requestPermissions,
    registerGeofence,
    unregisterGeofence,
    handleGeofenceEnter,
  };
}

// Location context helpers moved to src/utils/locationContext.ts
