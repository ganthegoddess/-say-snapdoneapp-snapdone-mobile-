import { useEffect, useRef } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import { AppProviders } from "../src/providers/AppProviders";
import { useAuthStore } from "../src/stores/authStore";
import { ShareExtensionHandler } from "../src/components/capture/ShareExtensionHandler";

// Configure notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    hydrate();
  }, []);

  // Handle notification taps — deep link to action
  useEffect(() => {
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.actionId) {
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