import { trackEvent } from "../lib/posthog";

export function trackInviteEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  trackEvent(event, properties);
}
