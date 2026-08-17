import { post } from "./api";
import { PUSH } from "../constants/api";

/**
 * Remote push registration for SnapBack delivery.
 *
 * Backend contract (live, verified 2026-08-17): POST /api/v1/push-token
 * accepts an Expo push token (`ExponentPushToken[...]` / `ExpoPushToken[...]`)
 * with the user's Bearer token; 200 `{ status: "ok" }` on success.
 * The SnapBack scheduler then delivers due memories to this device.
 */
export interface RegisterPushTokenResponse {
  status: string;
  message?: string;
}

export async function registerPushToken(
  token: string
): Promise<RegisterPushTokenResponse> {
  return post<RegisterPushTokenResponse>(PUSH.TOKEN, { token });
}
