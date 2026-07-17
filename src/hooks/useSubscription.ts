import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as subscriptionService from "../services/subscription";

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      try {
        return await subscriptionService.fetchSubscriptionStatus();
      } catch {
        return { plan_type: null as null, status: "none" as const };
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (planType: "monthly" | "annual" | "household") =>
      subscriptionService.createCheckoutSession(planType),
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => subscriptionService.cancelSubscription(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscription"] }),
  });
}