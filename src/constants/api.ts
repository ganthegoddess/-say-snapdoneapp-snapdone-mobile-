// SnapDone API & environment constants

// The current site URL - backend API will be served from the same origin
export const API_BASE_URL = "https://5f7a3e77abaf27c48a69cce1b874bb58.ctonew.app";

export const API_PREFIX = "/api/v1";

export const FULL_API_URL = `${API_BASE_URL}${API_PREFIX}`;

// Health check
export const HEALTH = `${API_PREFIX}/health`;

// Auth endpoints
export const AUTH = {
  SIGNUP: `${API_PREFIX}/auth/signup`,
  LOGIN: `${API_PREFIX}/auth/login`,
  REFRESH: `${API_PREFIX}/auth/refresh`,
} as const;

// Capture endpoints
export const CAPTURE = {
  UPLOAD: `${API_PREFIX}/capture`,
  TEXT: `${API_PREFIX}/capture/text`,
  RESULT: (id: string) => `${API_PREFIX}/capture/${id}/result`,
} as const;

// Action endpoints
export const ACTIONS = {
  LIST: `${API_PREFIX}/actions`,
  DETAIL: (id: string) => `${API_PREFIX}/actions/${id}`,
  COMPLETE: (id: string) => `${API_PREFIX}/actions/${id}/complete`,
} as const;

// Household endpoints
export const HOUSEHOLDS = {
  LIST: `${API_PREFIX}/households`,
  DETAIL: (id: string) => `${API_PREFIX}/households/${id}`,
  CREATE: `${API_PREFIX}/households`,
  JOIN: `${API_PREFIX}/households/join`,
  LEAVE: (id: string) => `${API_PREFIX}/households/${id}/leave`,
} as const;

// Subscription endpoints
export const SUBSCRIPTIONS = {
  STATUS: `${API_PREFIX}/subscriptions/status`,
  CREATE_CHECKOUT: `${API_PREFIX}/subscriptions/create-checkout`,
  PORTAL: `${API_PREFIX}/subscriptions/portal`,
  CANCEL: `${API_PREFIX}/subscriptions/cancel`,
} as const;

// Deep links
export const DEEP_LINKS = {
  PAYMENT_SUCCESS: "snapdone://payment/success",
  PAYMENT_CANCEL: "snapdone://payment/cancel",
  ACTION: (id: string) => `snapdone://action/${id}`,
  CAPTURE: (id: string) => `snapdone://capture/${id}`,
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  DEFAULT_OFFSET: 0,
} as const;

// Upload limits (matching backend spec)
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_MB: 20,
  MAX_IMAGE_DIMENSION: 1920,
  JPEG_QUALITY: 0.8,
  MAX_VOICE_DURATION_MS: 120_000, // 2 minutes
  AUDIO_BITRATE: 64000,
  POLL_INTERVAL_MS: 2000,
  MAX_POLL_TIME_MS: 30_000,
} as const;

// Free tier limits
export const FREE_TIER = {
  MAX_CAPTURES_PER_MONTH: 10,
  MAX_ACTIVE_ACTIONS: 5,
} as const;