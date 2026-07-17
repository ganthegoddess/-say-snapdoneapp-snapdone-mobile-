import { get, post } from "./api";
import { SUBSCRIPTIONS } from "../constants/api";

export interface SubscriptionStatus {
  plan_type: "monthly" | "annual" | "household" | null;
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

/** Create a Stripe Checkout session */
export async function createCheckoutSession(
  planType: "monthly" | "annual" | "household"
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