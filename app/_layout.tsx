import { useEffect, useRef } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import { AppState } from "react-native";
import { AppProviders } from "../src/providers/AppProviders";
import { useAuthStore } from "../src/stores/authStore";
import { useLocationStore } from "../src/stores/locationStore";
import { ShareExtensionHandler } from "../src/components/capture/ShareExtensionHandler";
import { trackEvent, identifyUser } from "../src/lib/posthog";
import "../src/tasks/geofenceTask"; // register background geofence handler
import { GEOFENCE_TASK } from "../src/tasks/geofenceTask";

/** Radius lookup for location context types */
const CONTEXT_RADII: Record<string, number> = {
  grocery_store: 500,
  pharmacy: 500,
  school: 1000,
  work: 1000,
  default: 500,
};

async function registerGeofenceFromPayload(payload: Record<string, unknown>) {
  const actionId = payload.actionId as string | undefined;
  const actionLocation = payload.location as string | undefined;
  const latitude = payload.geofence_lat ? Number(payload.geofence_lat) : undefined;
  const longitude = payload.geofence_lng ? Number(payload.geofence_lng) : undefined;

  if (!actionId || !actionLocation || latitude === undefined || longitude === undefined) return;
  if (isNaN(latitude) || isNaN(longitude)) return;

  // Respect user setting
  const { locationRemindersEnabled } = useLocationStore.getState();
  if (!locationRemindersEnabled) return;

  try {
    const radius = CONTEXT_RADII.default;
    const regionId = `snapdone-push-${actionId}-${Date.now()}`;

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

    // Persist to store
    useLocationStore.getState().addGeofence({
      regionId,
      actionId,
      actionTitle: (payload.title as string) || "Untitled",
      locationContext: actionLocation,
      registeredAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Failed to register push-triggered geofence:", err);
  }
}

// Configure notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const user = useAuthStore((state) => state.user);
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    hydrate();
  }, []);

  // Identify user with PostHog when auth state changes
  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id, {
        email: user.email,
        // Backend auth response does not include a subscription tier yet.
        // Tracked as "free" until the subscription API returns a real tier.
        tier: "free",
      });
    }
  }, [user?.id]);

  // Session tracking — fire once per app foreground
  useEffect(() => {
    trackEvent("user_session_started");
    const todayKey = `ph_daily_${new Date().toISOString().slice(0, 10)}`;
    const fired = (globalThis as Record<string, unknown>)[todayKey];
    if (!fired) {
      (globalThis as Record<string, unknown>)[todayKey] = true;
      trackEvent("daily_active");
    }
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") trackEvent("user_session_started");
    });
    return () => sub.remove();
  }, []);

  // Handle notification taps — deep link to action, register geofences from push
  useEffect(() => {
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.actionId) {
          // If push payload includes a location with coords, register geofence
          if (data?.location && data?.geofence_lat) {
            registerGeofenceFromPayload(data);
          }
          router.push(`/action/${data.actionId}`);
        } else if (data?.captureId) {
          router.push(`/processing/${data.captureId}`);
        }
      });

    return () => {
      notificationResponseListener.current?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="capture"
            options={{
              presentation: "fullScreenModal",
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="onboarding"
            options={{
              presentation: "fullScreenModal",
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="paywall"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="action/[id]"
            options={{
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="processing/[id]"
            options={{
              presentation: "modal",
              animation: "fade",
            }}
          />
        </Stack>

        {/* Share extension handler overlay */}
        <ShareExtensionHandler />
      </AppProviders>
    </GestureHandlerRootView>
  );
}