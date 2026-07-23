import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as householdsService from "../services/households";
import type { Household } from "../services/households";

export function useHouseholds() {
  return useQuery({
    queryKey: ["households"],
    queryFn: () => householdsService.fetchHouseholds().then(r => r.households),
    staleTime: 1000 * 60 * 5,
  });
}

export function useHousehold(id: string | undefined) {
  return useQuery({
    queryKey: ["household", id],
    queryFn: () => householdsService.fetchHousehold(id!),
    enabled: !!id,
    staleTime: 1000 * 60,
  });
}

export function useCreateHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => householdsService.createHousehold(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["households"] });
    },
  });
}

export function useJoinHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) => householdsService.joinHousehold(inviteCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["households"] });
    },
  });
}

export function useLeaveHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => householdsService.leaveHousehold(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["households"] });
    },
  });
}

export function useHouseholdActions(householdId: string | undefined) {
  return useQuery({
    queryKey: ["household-actions", householdId],
    queryFn: () => householdsService.fetchHouseholdActions(householdId!).then(r => r.actions),
    enabled: !!householdId,
    staleTime: 1000 * 60,
  });
}

export function useAcknowledgeAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) => householdsService.acknowledgeAction(actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
      queryClient.invalidateQueries({ queryKey: ["household-actions"] });
    },
  });
}
