import { useState, useCallback, useRef } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import { Alert, Platform } from "react-native";

/**
 * Hook for biometric (Face ID / Touch ID) authentication.
 * Caches the authentication state for the current session.
 */
export function useBiometricAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const authCheckedOnce = useRef(false);

  /** Check if biometrics are available on this device */
  const checkAvailability = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    return {
      hasHardware,
      isEnrolled,
      available: hasHardware && isEnrolled,
      biometryType:
        Platform.OS === "ios"
          ? await LocalAuthentication.supportedAuthenticationTypesAsync().then((types) =>
              types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
                ? "Face ID"
                : types.includes(LocalAuthentication.AuthenticationType.TOUCH_ID)
                  ? "Touch ID"
                  : "Biometrics"
            )
          : "Biometrics",
    };
  }, []);

  /** Attempt biometric authentication */
  const authenticate = useCallback(async (): Promise<boolean> => {
    // Already authenticated this session
    if (isAuthenticated) return true;

    setIsChecking(true);

    try {
      const { available } = await checkAvailability();

      if (!available) {
        // Fallback: try device passcode
        const passcodeResult = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to view sensitive content",
          fallbackLabel: "Use Passcode",
          disableDeviceFallback: false,
        });

        const success = passcodeResult.success;
        if (success) setIsAuthenticated(true);
        return success;
      }

      // Biometrics available — use them
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to view sensitive content",
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsAuthenticated(true);
        return true;
      }

      if (result.error === "user_cancel" || result.error === "system_cancel") {
        // User cancelled — don't show error
        return false;
      }

      // Some other failure
      return false;
    } catch {
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [isAuthenticated, checkAvailability]);

  /** Reset authentication state (e.g., on sign out) */
  const resetAuth = useCallback(() => {
    setIsAuthenticated(false);
    authCheckedOnce.current = false;
  }, []);

  return {
    isAuthenticated,
    isChecking,
    authenticate,
    checkAvailability,
    resetAuth,
  };
}
