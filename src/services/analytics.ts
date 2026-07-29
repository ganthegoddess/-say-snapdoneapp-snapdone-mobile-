import { post } from "./api";
import { ANALYTICS } from "../constants/api";

/**
 * Invite event types (snake_case — matches backend events table).
 *
 * Payload contract with POST /api/v1/analytics/invite-event:
 *   { event_type: string, properties: Record<string, unknown> }
 *
 * Backend calls: trackEvent(db, userId, event_type, properties)
 */
export type InviteEventType =
  | "invite_tapped"
  | "invite_sent"
  | "invite_joined"
  | "invite_opened";

export interface InviteEventProperties {
  source_screen?: string;
  household_id?: string;
  method?: "email" | "sms" | "share" | "copy_code";
  recipient?: string;
  invite_code?: string;
  invites_sent?: number;
}

/**
 * Fire an invite-related analytics event (fire-and-forget).
 * Matches the backend's trackEvent(db, userId, eventType, properties) format.
 */
export async function trackInviteEvent(
  eventType: InviteEventType,
  properties: InviteEventProperties = {},
): Promise<void> {
  try {
    await post(ANALYTICS.INVITE_EVENT, { event_type: eventType, properties });
  } catch {
    // Analytics failures should never block the UX
  }
}
