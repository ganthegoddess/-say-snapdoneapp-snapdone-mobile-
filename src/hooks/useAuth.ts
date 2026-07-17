import { useAuthStore } from "../stores/authStore";
import * as authService from "../services/auth";

/**
 * Hook for authentication operations.
 * Wraps the Zustand auth store with convenient accessors.
 */
export function useAuth() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const error = useAuthStore((state) => state.error);
  const signOut = useAuthStore((state) => state.signOut);

  return {
    // State
    isAuthenticated: !!token,
    user,
    token,
    isLoading,
    isSubmitting,
    error,

    // Actions
    signIn: authService.signin,
    signUp: authService.signup,
    signOut,
  };
}