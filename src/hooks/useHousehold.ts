import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as householdService from "../services/household";

const DEMO_HOUSEHOLD = {
  id: "demo",
  name: "My Household",
  invite_code: "ABCD-1234",
  members: [
    { user_id: "me", display_name: "You", email: "you@example.com", role: "admin" as const, joined_at: new Date().toISOString() },
  ],
  created_at: new Date().toISOString(),
};

export function useHouseholds() {
  return useQuery({
    queryKey: ["households"],
    queryFn: async () => {
      try {
        const response = await householdService.fetchHouseholds();
        return response.households;
      } catch {
        return [{ id: "demo", name: "My Household", role: "admin" as const, member_count: 1, invite_code: "ABCD-1234" }];
      }
    },
  });
}

export function useHouseholdDetail(id: string) {
  return useQuery({
    queryKey: ["household", id],
    queryFn: async () => {
      try {
        return await householdService.fetchHouseholdDetail(id);
      } catch {
        return DEMO_HOUSEHOLD;
      }
    },
    enabled: !!id,
  });
}

export function useCreateHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => householdService.createHousehold(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["households"] }),
  });
}

export function useJoinHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => householdService.joinHousehold(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["households"] }),
  });
}