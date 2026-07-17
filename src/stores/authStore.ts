import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "snapdone_auth_token";
const USER_KEY = "snapdone_user";

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  isOnboarded?: boolean;
}

export interface AuthState {
  /** Current JWT token, null if not authenticated */
  token: string | null;
  /** Current user profile, null if not authenticated */
  user: User | null;
  /** Whether auth state is being loaded from secure storage */
  isLoading: boolean;
  /** Whether a sign-in/sign-up request is in flight */
  isSubmitting: boolean;
  /** Last auth error message */
  error: string | null;

  // Actions
  setToken: (token: string | null) => Promise<void>;
  setUser: (user: User | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  hydrate: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,
  isSubmitting: false,
  error: null,

  setToken: async (token: string | null) => {
    if (token) {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    }
    set({ token });
  },

  setUser: (user: User | null) => {
    set({ user });
  },

  setIsLoading: (isLoading: boolean) => set({ isLoading }),
  setIsSubmitting: (isSubmitting: boolean) => set({ isSubmitting }),
  setError: (error: string | null) => set({ error }),

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      const user = userJson ? JSON.parse(userJson) : null;
      set({ token, user, isLoading: false });
    } catch {
      set({ token: null, user: null, isLoading: false });
    }
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ token: null, user: null, error: null });
  },
}));