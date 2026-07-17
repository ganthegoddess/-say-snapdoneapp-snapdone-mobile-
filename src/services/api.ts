import { FULL_API_URL } from "../constants/api";
import { useAuthStore } from "../stores/authStore";

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
  options: RequestOptions = { method: "GET" }
): Promise<T> {
  const { method, body, noAuth = false } = options;

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

  const response = await fetch(url, fetchOptions);

  // Handle 401 - token might be expired, try refresh
  if (response.status === 401 && !noAuth) {
    const authStore = useAuthStore.getState();
    if (authStore.token) {
      try {
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry the original request with new token
          headers["Authorization"] = `Bearer ${useAuthStore.getState().token}`;
          const retryResponse = await fetch(url, {
            ...fetchOptions,
            headers,
          });

          if (retryResponse.ok) {
            // Handle 204 No Content
            if (retryResponse.status === 204) {
              return undefined as T;
            }
            return retryResponse.json();
          }
        }
      } catch {
        // Refresh failed — sign out
        await authStore.signOut();
        throw new ApiError(401, "token_expired", "Session expired. Please sign in again.");
      }
    }
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // Parse response
  const data = await response.json().catch(() => null);

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

/**
 * Attempt to refresh the JWT token.
 * Returns true if successful, false otherwise.
 */
async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch(`${FULL_API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().token}`,
        "Content-Type": "application/json",
      },
    });

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

/** Upload a file via multipart/form-data */
export async function uploadFile<T>(
  endpoint: string,
  formData: FormData,
  onProgress?: (progress: number) => void
): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http") ? endpoint : `${FULL_API_URL}${endpoint}`;

  const xhr = new XMLHttpRequest();

  return new Promise<T>((resolve, reject) => {
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new ApiError(xhr.status, error.error || "upload_failed", error.message || "Upload failed"));
        } catch {
          reject(new ApiError(xhr.status, "upload_failed", "Upload failed"));
        }
      }
    };

    xhr.onerror = () => reject(new ApiError(0, "network_error", "Network error"));

    xhr.open("POST", url);
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.send(formData);
  });
}