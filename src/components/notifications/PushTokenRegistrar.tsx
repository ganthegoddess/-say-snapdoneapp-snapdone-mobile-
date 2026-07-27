import { useEffect, useRef } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useNotifications } from "../../hooks/useNotifications";

/**
 * Registers the device push token with the backend when the user is authenticated.
 * Runs once per session — doesn't re-register on token refresh.
 */
export function PushTokenRegistrar() {
  const token = useAuthStore((state) => state.token);
  const { registerPushToken } = useNotifications();
  const registered = useRef(false);

  useEffect(() => {
    if (token && !registered.current) {
      registered.current = true;
      registerPushToken();
    }
  }, [token]);

  return null;
}
