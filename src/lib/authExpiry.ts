import { router } from "expo-router";
import { Alert } from "react-native";
import { useAuthStore } from "../stores/authStore";
import { pip } from "../constants/pipCopy";

/**
 * Global auth-expiry handler (ONE voice, warm — DESIGN-SYSTEM §6).
 *
 * Triggered on ANY API 401 (token expired / invalid) from the JSON `request`
 * path OR the multipart `uploadFile` (photo/voice) path. The security rotation
 * of JWT_SECRET invalidated every pre-rotation token, so a user whose device
 * still holds a stale token would otherwise see every save silently "do
 * nothing" — with no path back in. This handler guarantees a recoverable,
 * explicitly-surfaced re-login flow:
 *   1. Clears the dead token + user from SecureStore (signOut).
 *   2. Pops a warm, PIP-voiced prompt.
 *   3. "Sign back in" → auth screen.
 *
 * A short in-flight guard prevents alert spam when several requests 401 at once
 * (e.g. a photo + a parallel voice upload both failing on the same stale token).
 */
let handling = false;

export async function handleAuthExpired(
  opts?: { message?: string }
): Promise<void> {
  const store = useAuthStore.getState();
  const hadSession = !!store.token;
  if (!hadSession) {
    // Nothing to clear — already signed out. Just make sure we surface a path.
    router.replace("/(auth)/sign-in");
    return;
  }
  if (handling) return; // an auth-expiry flow is already in flight
  handling = true;
  try {
    await store.signOut();
    Alert.alert(
      "PIP needs you to sign back in",
      opts?.message ??
        `${pip.gotIt} That session quietly ended, so I paused saving to keep your memories safe. Sign back in whenever you're ready — everything's still here.`,
      [
        { text: "Not now", style: "cancel" },
        { text: "Sign back in", onPress: () => router.replace("/(auth)/sign-in") },
      ]
    );
  } finally {
    handling = false;
  }
}
