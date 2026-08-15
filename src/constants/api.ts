// SnapDone API & environment constants

// The API base URL is env-driven: EAS builds set EXPO_PUBLIC_API_URL
// (production → https://snapdoneapp.com, see eas.json), local dev can
// override via .env. Production is the default fallback so a build can
// never silently point at a dev tunnel.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://snapdoneapp.com";

export const API_PREFIX = "/api/v1";

export const FULL_API_URL = API_BASE_URL;

// Health check
export const HEALTH = `${API_PREFIX}/health`;

// Auth endpoints
export const AUTH = {
  SIGNUP: `${API_PREFIX}/auth/signup`,
  LOGIN: `${API_PREFIX}/auth/login`,
  REFRESH: `${API_PREFIX}/auth/refresh`,
  SOCIAL: `${API_PREFIX}/auth/social`,
  FORGOT_PASSWORD: `${API_PREFIX}/auth/forgot-password`,
  RESET_PASSWORD: `${API_PREFIX}/auth/reset-password`,
} as const;

// Capture endpoints
export const CAPTURE = {
  UPLOAD: `${API_PREFIX}/capture`,
  TEXT: `${API_PREFIX}/capture/text`,
  /** Voice note upload — multipart with an `audio` file field (Whisper → AI pipeline) */
  VOICE: `${API_PREFIX}/capture/voice`,
  RESULT: (id: string) => `${API_PREFIX}/capture/${id}/result`,
} as const;

// Action endpoints
export const ACTIONS = {
  LIST: `${API_PREFIX}/actions`,
  DETAIL: (id: string) => `${API_PREFIX}/actions/${id}`,
  COMPLETE: (id: string) => `${API_PREFIX}/actions/${id}/complete`,
  ACKNOWLEDGE: (id: string) => `${API_PREFIX}/actions/${id}/acknowledge`,
  SCHEDULE: (id: string) => `${API_PREFIX}/actions/${id}/schedule`,
  MEMORY_STATE: (id: string) => `${API_PREFIX}/actions/${id}/memory-state`,
  /** Share a memory with specific household members */
  SHARE: (id: string) => `${API_PREFIX}/actions/${id}/share`,
  /** Revoke sharing on a memory */
  UNSHARE: (id: string) => `${API_PREFIX}/actions/${id}/share`,
} as const;

// Household endpoints
export const HOUSEHOLDS = {
  LIST: `${API_PREFIX}/households`,
  DETAIL: (id: string) => `${API_PREFIX}/households/${id}`,
  CREATE: `${API_PREFIX}/households`,
  JOIN: `${API_PREFIX}/households/join`,
  LEAVE: (id: string) => `${API_PREFIX}/households/${id}/leave`,
  /** Household feed — memories shared within the household */
  FEED: (id: string) => `${API_PREFIX}/household/${id}/feed`,
} as const;

// Subscription endpoints
export const SUBSCRIPTIONS = {
  STATUS: `${API_PREFIX}/subscriptions/status`,
  CREATE_CHECKOUT: `${API_PREFIX}/subscriptions/create-checkout`,
  PORTAL: `${API_PREFIX}/subscriptions/portal`,
  CANCEL: `${API_PREFIX}/subscriptions/cancel`,
} as const;

// Push notifications
export const PUSH = {
  TOKEN: `${API_PREFIX}/push-token`,
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
  MAX_CAPTURES_PER_MONTH: 30,
  MAX_ACTIVE_ACTIONS: 5,
} as const;

// Memory / recall endpoints
export const MEMORIES = {
  RECALL: `${API_PREFIX}/memories/recall`,
  ASK: `${API_PREFIX}/memories/ask`,
} as const;

// Analytics endpoints
export const ANALYTICS = {
  EVENT: `${API_PREFIX}/analytics/event`,
  INVITE_EVENT: `${API_PREFIX}/analytics/invite-event`,
} as const;