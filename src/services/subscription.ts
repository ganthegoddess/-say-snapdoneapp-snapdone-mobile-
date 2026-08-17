import { get, post } from "./api";
import { SUBSCRIPTIONS } from "../constants/api";

/**
 * Canonical Stripe plan keys — mirrors the backend create-checkout prices map
 * (site/src/api-handler.ts), which is the single source of truth. The mobile
 * app sends exactly these; any other value silently falls back to
 * premium_monthly on the backend, so never invent keys here.
 */
export type PlanType =
  | "premium_monthly"
  | "premium_annual"
  | "household_monthly"
  | "household_annual"
  | "household_plus_monthly"
  | "household_plus_annual";

export interface SubscriptionStatus {
  plan_type: PlanType | null;
  status: "active" | "canceled" | "past_due" | "trialing" | "none";
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

export interface CheckoutResponse {
  checkout_url: string;
}

export interface PortalResponse {
  portal_url: string;
}

/** Get current subscription status */
export async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  return get<SubscriptionStatus>(SUBSCRIPTIONS.STATUS);
}

/** Create a Stripe Checkout session for the given canonical plan key */
export async function createCheckoutSession(
  planType: PlanType
): Promise<CheckoutResponse> {
  return post<CheckoutResponse>(SUBSCRIPTIONS.CREATE_CHECKOUT, {
    plan_type: planType,
    success_url: "snapdone://payment/success",
    cancel_url: "snapdone://payment/cancel",
  });
}

/** Get Stripe Customer Portal URL */
export async function getPortalUrl(): Promise<PortalResponse> {
  return post<PortalResponse>(SUBSCRIPTIONS.PORTAL, {
    return_url: "snapdone://settings/subscription",
  });
}

/** Cancel subscription at period end */
export async function cancelSubscription(): Promise<{
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string;
}> {
  return post(SUBSCRIPTIONS.CANCEL);
}