import { FULL_API_URL } from "../constants/api";
import { useAuthStore } from "../stores/authStore";
import { handleAuthExpired } from "../lib/authExpiry";

/** Generic API error */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown[]
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Raw API response shape from the backend */
interface ApiErrorBody {
  error: string;
  message: string;
  details?: unknown[];
}

/** Options for API requests */
interface RequestOptions {
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  /** Don't include auth token */
  noAuth?: boolean;
  /** Override the default per-request timeout (ms). Default 15s. */
  timeoutMs?: number;
}

/** Per-request hard timeout (ms). Platform rule: no screen may spin forever. */
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Run a fetch with a hard timeout + a single automatic retry.
 *
 * Platform rule #3 (No infinite loading): every API call must either resolve,
 * reject with a friendly error, or time out — the promise is GUARANTEED to
 * settle so no caller is left in an infinite loading/skeleton state.
 */
async function fetchWithTimeout(
  url: string,
  fetchOptions: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Core fetch wrapper for SnapDone API.
 * - Automatically attaches JWT auth token
 * - Handles token refresh on 401
 * - Parses JSON response
 * - Throws ApiError on non-2xx
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = { method: "GET" },
  _retried = false
): Promise<T> {
  const { method, body, noAuth = false, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  // Attach auth token unless explicitly skipped
  if (!noAuth) {
    const token = useAuthStore.getState().token;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // Set Content-Type for non-multipart requests
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const url = endpoint.startsWith("http") ? endpoint : `${FULL_API_URL}${endpoint}`;

  const fetchOptions: RequestInit = {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  };

  let response: Response;
  try {
    response = await fetchWithTimeout(url, fetchOptions, timeoutMs);
  } catch (err) {
    const aborted =
      err instanceof Error && err.name === "AbortError";
    // Hard timeout or network failure → retry ONCE, then surface a friendly error.
    if (!_retried) {
      return request<T>(endpoint, options, true);
    }
    throw new ApiError(
      0,
      aborted ? "timeout" : "network_error",
      aborted
        ? "The request timed out. Please try again."
        : "No internet connection. Please try again."
    );
  }

  // Handle 401 - token might be expired, try refresh
  if (response.status === 401 && !noAuth) {
    const authStore = useAuthStore.getState();
    if (authStore.token) {
      let refreshed = false;
      try {
        refreshed = await refreshToken();
      } catch {
        refreshed = false;
      }
      if (refreshed) {
          // Retry the original request with new token (no further retry loop)
          headers["Authorization"] = `Bearer ${useAuthStore.getState().token}`;
          const retryResponse = await fetchWithTimeout(
            url,
            { ...fetchOptions, headers },
            timeoutMs
          );

          if (retryResponse.ok) {
            // Handle 204 No Content
            if (retryResponse.status === 204) {
              return undefined as T;
            }
            return retryResponse.json();
          }
      } else {
        // Refresh failed (e.g. a stale pre-rotation token) — clear the dead
        // session and surface a clear, warm re-login path. Never silently swallow.
        await handleAuthExpired();
        throw new ApiError(401, "token_expired", "Your session ended. Please sign back in to continue.")
      }
    }
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // Parse response
  const data = await response.json().catch(() => null);

  // Transient 5xx — retry once before surfacing the error.
  if (response.status >= 500 && !_retried) {
    return request<T>(endpoint, options, true);
  }

  if (!response.ok) {
    const errorBody = data as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      errorBody?.error || "unknown_error",
      errorBody?.message || `Request failed with status ${response.status}`,
      errorBody?.details
    );
  }

  return data as T;
}

/** Attempt to refresh the JWT token.
 * Returns true if successful, false otherwise.
 */
async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${FULL_API_URL}/auth/refresh`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().token}`,
          "Content-Type": "application/json",
        },
      },
      DEFAULT_TIMEOUT_MS
    );

    if (!response.ok) return false;

    const data = await response.json();
    await useAuthStore.getState().setToken(data.token);
    return true;
  } catch {
    return false;
  }
}

// Convenience methods

export function get<T>(endpoint: string, options?: Partial<RequestOptions>): Promise<T> {
  return request<T>(endpoint, { ...options, method: "GET" });
}

export function post<T>(
  endpoint: string,
  body?: unknown,
  options?: Partial<RequestOptions>
): Promise<T> {
  return request<T>(endpoint, { ...options, method: "POST", body });
}

export function patch<T>(
  endpoint: string,
  body?: unknown,
  options?: Partial<RequestOptions>
): Promise<T> {
  return request<T>(endpoint, { ...options, method: "PATCH", body });
}

export function del<T>(endpoint: string, options?: Partial<RequestOptions>): Promise<T> {
  return request<T>(endpoint, { ...options, method: "DELETE" });
}

/** Hard upload timeout (ms) — uploads must settle, never hang. */
const UPLOAD_TIMEOUT_MS = 120_000;

/** Upload a file via multipart/form-data */
export async function uploadFile<T>(
  endpoint: string,
  formData: FormData,
  onProgress?: (progress: number) => void,
  timeoutMs: number = UPLOAD_TIMEOUT_MS
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${FULL_API_URL}${endpoint}`;
  // Send the multipart body with a given auth token. Rejects on network/timeout.
  const doSend = (authToken: string | null): Promise<{ status: number; text: string }> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      // Hard timeout so an upload can never hang the screen forever.
      xhr.timeout = timeoutMs;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(event.loaded / event.total);
        }
      };
      xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
      xhr.onerror = () => reject(new ApiError(0, "network_error", "No internet connection. Please try again."));
      xhr.ontimeout = () => reject(new ApiError(0, "timeout", "The upload timed out. Please try again."));
      xhr.open("POST", url);
      if (authToken) xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
      xhr.send(formData);
    });

  // First attempt with the current token.
  let res = await doSend(useAuthStore.getState().token);
  // On 401 (expired/invalid token, e.g. after a JWT_SECRET rotation) try a
  // refresh once and retry with the new token.
  if (res.status === 401 && useAuthStore.getState().token) {
    let refreshed = false;
    try {
      refreshed = await refreshToken();
    } catch {
      refreshed = false;
    }
    if (refreshed) {
      res = await doSend(useAuthStore.getState().token);
    } else {
      // Refresh failed — clear the dead session + surface a warm re-login
      // path. Never silently swallow a 401 on photo/voice uploads.
      await handleAuthExpired();
      throw new ApiError(401, "token_expired", "Your session ended. Please sign back in to continue.");
    }
  }
  if (res.status >= 200 && res.status < 300) {
    return JSON.parse(res.text) as T;
  }
  let errorBody: ApiErrorBody | null = null;
  try {
    errorBody = JSON.parse(res.text) as ApiErrorBody | null;
  } catch {
    errorBody = null;
  }
  throw new ApiError(
    res.status,
    errorBody?.error || "upload_failed",
    errorBody?.message || "Upload failed"
  );
}