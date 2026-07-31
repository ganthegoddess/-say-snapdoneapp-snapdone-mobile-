/**
 * PostHog analytics client — Product Intelligence Layer
 *
 * Every event answers a specific business question.
 * No autocapture. No blanket tracking. Every event is deliberate.
 *
 * Event Dictionary: /home/team/shared/site/src/lib/analytics-events.ts
 */

import PostHog from "posthog-react-native";

export const posthog = new PostHog(
  "phc_B5WkdsKr9orEkwZWAozqFc2UG6e9iYLyHama9ycf7Qpt",
  {
    host: "https://us.i.posthog.com",
    autocapture: false,
  }
);

/** Track a named SnapDone event with optional properties. Non-blocking. */
export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  try {
    posthog.capture(eventName, properties ?? {});
  } catch {
    // Never let analytics failures block the user experience
  }
}

/** Identify the current user (call after login/signup) */
export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  try {
    posthog.identify(userId, traits ?? {});
  } catch {
    // silent
  }
}

/** Reset on logout */
export function resetPostHog(): void {
  try {
    posthog.reset();
  } catch {
    // silent
  }
}
