import { post, get } from "./api";
import { AUTH } from "../constants/api";
import { useAuthStore, type User } from "../stores/authStore";

const USER_KEY = "snapdone_user";

// Web-compatible storage
async function setSecurely(key: string, value: string) {
  try {
    const { default: SecureStore } = await import("expo-secure-store");
    await SecureStore.setItemAsync(key, value);
  } catch {
    localStorage.setItem(key, value);
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

interface SocialLoginParams {
  provider: "google" | "apple";
  id_token: string;
  display_name?: string;
  avatar_url?: string;
}

interface SocialAuthResponse extends AuthResponse {
  is_new_user: boolean;
  linked_account?: boolean;
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
 * Sign in / sign up using Google, Apple, or Samsung social login.
 * Sends the provider's ID token to the backend for verification.
 * Handles both new user creation and existing user authentication.
 */
export async function socialLogin(params: SocialLoginParams): Promise<{ user: User; isNewUser: boolean; linkedAccount?: boolean }> {
  const authStore = useAuthStore.getState();
  authStore.setIsSubmitting(true);
  authStore.setError(null);

  try {
    const data = await post<SocialAuthResponse>(AUTH.SOCIAL, params, { noAuth: true });

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

    return { user, isNewUser: data.is_new_user, linkedAccount: data.linked_account };
  } catch (error) {
    authStore.setIsSubmitting(false);
    const message = error instanceof Error ? error.message : "Social sign in failed";
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

/** Response from POST /auth/forgot-password. */
export interface ForgotPasswordResponse {
  message: string;
  /**
   * Beta-only field (PASSWORD_RESET_BETA_RETURN_TOKEN=1): present only when the
   * account exists. Absent -> treat as "email sent" so the UI survives the flag
   * being flipped off before public launch.
   */
  reset_token?: string;
  reset_token_expires_at?: string;
}

/**
 * Request a password reset link for an email.
 * The server always returns the same generic message whether or not the account
 * exists (Memory Covenant — never reveals registration). Does not touch the
 * auth store; callers catch ApiError (status/code/message) to map UX copy.
 */
export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return post<ForgotPasswordResponse>(AUTH.FORGOT_PASSWORD, { email }, { noAuth: true });
}

/** Response from POST /auth/reset-password. */
export interface ResetPasswordResponse {
  message: string;
}

/**
 * Complete a password reset with a single-use token + new password.
 * The backend invalidates the token and all other outstanding tokens on success.
 */
export async function resetPassword(token: string, password: string): Promise<ResetPasswordResponse> {
  return post<ResetPasswordResponse>(AUTH.RESET_PASSWORD, { token, password }, { noAuth: true });
}