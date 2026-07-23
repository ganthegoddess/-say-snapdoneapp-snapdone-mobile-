import { post, get } from "./api";
import { AUTH } from "../constants/api";
import { useAuthStore, type User } from "../stores/authStore";

const USER_KEY = "snapdone_user";

// In-memory storage fallback
const memoryStore = new Map<string, string>();
async function setSecurely(key: string, value: string) {
  try {
    const { default: SecureStore } = await import("expo-secure-store");
    await SecureStore.setItemAsync(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    display_name: string;
    avatar_url?: string;
    is_onboarded?: boolean;
  };
  token: string;
  token_expires_at: string;
}

interface SignupParams {
  email: string;
  password: string;
  display_name?: string;
}

interface SigninParams {
  email: string;
  password: string;
}

/**
 * Sign up a new user.
 * Stores the JWT and user profile on success.
 */
export async function signup(params: SignupParams): Promise<User> {
  const authStore = useAuthStore.getState();
  authStore.setIsSubmitting(true);
  authStore.setError(null);

  try {
    const data = await post<AuthResponse>(AUTH.SIGNUP, params, { noAuth: true });

    const user: User = {
      id: data.user.id,
      email: data.user.email,
      displayName: data.user.display_name,
      avatarUrl: data.user.avatar_url,
      isOnboarded: data.user.is_onboarded,
    };

    await authStore.setToken(data.token);
    await setSecurely(USER_KEY, JSON.stringify(user));
    authStore.setUser(user);
    authStore.setIsSubmitting(false);

    return user;
  } catch (error) {
    authStore.setIsSubmitting(false);
    const message = error instanceof Error ? error.message : "Sign up failed";
    authStore.setError(message);
    throw error;
  }
}

/**
 * Sign in an existing user.
 * Stores the JWT and user profile on success.
 */
export async function signin(params: SigninParams): Promise<User> {
  const authStore = useAuthStore.getState();
  authStore.setIsSubmitting(true);
  authStore.setError(null);

  try {
    const data = await post<AuthResponse>(AUTH.LOGIN, params, { noAuth: true });

    const user: User = {
      id: data.user.id,
      email: data.user.email,
      displayName: data.user.display_name,
      avatarUrl: data.user.avatar_url,
      isOnboarded: data.user.is_onboarded,
    };

    await authStore.setToken(data.token);
    await setSecurely(USER_KEY, JSON.stringify(user));
    authStore.setUser(user);
    authStore.setIsSubmitting(false);

    return user;
  } catch (error) {
    authStore.setIsSubmitting(false);
    const message = error instanceof Error ? error.message : "Sign in failed";
    authStore.setError(message);
    throw error;
  }
}

/**
 * Fetch the current user's profile using their token.
 */
export async function fetchProfile(): Promise<User> {
  try {
    // Note: Backend team will set this up — for now it's a GET /auth/me
    const data = await get<{ user: AuthResponse["user"] }>("/auth/me");
    return {
      id: data.user.id,
      email: data.user.email,
      displayName: data.user.display_name,
      avatarUrl: data.user.avatar_url,
      isOnboarded: data.user.is_onboarded,
    };
  } catch {
    throw new Error("Failed to fetch profile");
  }
}