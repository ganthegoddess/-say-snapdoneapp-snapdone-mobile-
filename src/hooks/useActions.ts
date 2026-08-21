import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as actionsService from "../services/actions";
import type { ActionItem } from "../services/actions";

/**
 * Actions (memories) hooks.
 *
 * PER-USER PERSONALIZATION GUARANTEE (owner, Aug 21): there is NO demo/fallback
 * dummy data here anymore. Every memory is keyed to its owner in the backend —
 * a tester logging in with their own account sees THEIR memories only. When the
 * API fails, the query surfaces a real error (handled by friendly error states),
 * never injected made-up memories.
 */

export function useActions(filters?: { status?: string; action_type?: string; assignee_id?: string; household_id?: string }) {
  return useQuery({
    queryKey: ["actions", filters],
    queryFn: async () => {
      const response = await actionsService.fetchActions(filters);
      return response.actions;
    },
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function useAction(id: string) {
  return useQuery({
    queryKey: ["action", id],
    queryFn: async () => {
      return await actionsService.fetchAction(id);
    },
    enabled: !!id,
    retry: 1,
  });
}

export function useUpdateAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof actionsService.updateAction>[1] }) =>
      actionsService.updateAction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });
}

export function useCompleteAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => actionsService.completeAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });
}

export function useDeleteAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => actionsService.deleteAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });
}
