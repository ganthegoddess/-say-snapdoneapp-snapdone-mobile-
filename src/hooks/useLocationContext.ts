import { useCallback, useState } from "react";
import * as Location from "expo-location";
import { fetchActions } from "../services/actions";
import type { ActionItem } from "../services/actions";
import { useLocationStore } from "../stores/locationStore";

interface LocationContextResult {
  matches: ActionItem[];
  nearby_count: number;
  place_name: string | null;
  place_type: string | null;
  checked_at: string;
}

/**
 * Hook for checking location context via the actions endpoint.
 *
 * On foreground or location change: get position → reverse geocode →
 * call `GET /api/v1/actions?place_name=X&place_type=Y` →
 * filter actions where `location_context.relevant === true`.
 *
 * Contract: The backend computes `location_context` dynamically
 * based on token matching between `action.location` and place params.
 */
export function useLocationContext() {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<LocationContextResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locationEnabled = useLocationStore((s) => s.locationRemindersEnabled);

  const checkLocationContext = useCallback(async (): Promise<LocationContextResult | null> => {
    if (!locationEnabled) return null;

    setIsChecking(true);
    setError(null);

    try {
      // Get current position
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        setIsChecking(false);
        return null;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // Reverse geocode to get place name / type
      let placeName: string | undefined;
      let placeType: string | undefined;

      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geocode.length > 0) {
          placeName = geocode[0].name || geocode[0].street || undefined;
          // expo-location doesn't provide Google Places types directly;
          // best-effort: derive from POI name patterns or leave undefined
        }
      } catch {
        // Reverse geocode is best-effort
      }

      // Fetch actions with place params — backend computes location_context
      const response = await fetchActions({
        place_name: placeName,
        place_type: placeType,
        limit: 100,
      });

      // Filter to only location-relevant actions
      const matches: ActionItem[] = response.actions.filter(
        (a) => a.location_context?.relevant === true
      );

      const result: LocationContextResult = {
        matches,
        nearby_count: matches.length,
        place_name: placeName || null,
        place_type: placeType || null,
        checked_at: new Date().toISOString(),
      };

      setLastResult(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to check location context";
      setError(message);
      console.warn("Location context check failed:", message);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [locationEnabled]);

  return {
    checkLocationContext,
    isChecking,
    lastResult,
    error,
  };
}
