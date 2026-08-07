import { create } from "zustand";

/** Geofence-to-action mapping stored locally */
export interface GeofenceEntry {
  /** The geofence region identifier returned by expo-location */
  regionId: string;
  /** The action this geofence is linked to */
  actionId: string;
  /** Human-readable title for the notification */
  actionTitle: string;
  /** Context type: grocery_store, pharmacy, school, work, etc. */
  locationContext: string;
  /** When the geofence was registered */
  registeredAt: string;
}

export interface LocationState {
  /** Whether location-based reminders are enabled by the user */
  locationRemindersEnabled: boolean;
  /** Active geofence entries keyed by regionId */
  geofences: Record<string, GeofenceEntry>;
  /** Unix timestamp (ms) of last foreground location context check */
  lastLocationCheck: number;

  setLocationRemindersEnabled: (enabled: boolean) => void;
  /** Record a location check to throttle future checks (30 min cooldown) */
  markLocationChecked: () => void;
  addGeofence: (entry: GeofenceEntry) => void;
  removeGeofence: (regionId: string) => void;
  removeGeofencesByActionId: (actionId: string) => void;
  getGeofencesForAction: (actionId: string) => GeofenceEntry[];
}

const LOCATION_CHECK_COOLDOWN = 30 * 60 * 1000; // 30 minutes

export const useLocationStore = create<LocationState>((set, get) => ({
  locationRemindersEnabled: true,
  geofences: {},
  lastLocationCheck: 0,

  setLocationRemindersEnabled: (enabled) => set({ locationRemindersEnabled: enabled }),

  markLocationChecked: () => set({ lastLocationCheck: Date.now() }),

  addGeofence: (entry) =>
    set((state) => ({
      geofences: { ...state.geofences, [entry.regionId]: entry },
    })),

  removeGeofence: (regionId) =>
    set((state) => {
      const next = { ...state.geofences };
      delete next[regionId];
      return { geofences: next };
    }),

  removeGeofencesByActionId: (actionId) =>
    set((state) => {
      const next = { ...state.geofences };
      for (const key of Object.keys(next)) {
        if (next[key].actionId === actionId) delete next[key];
      }
      return { geofences: next };
    }),

  getGeofencesForAction: (actionId) =>
    Object.values(get().geofences).filter((g) => g.actionId === actionId),
}));
