import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as actionsService from "../services/actions";
import type { ActionItem } from "../services/actions";

export function useActions(filters?: { status?: string; action_type?: string }) {
  return useQuery({
    queryKey: ["actions", filters],
    queryFn: () => actionsService.fetchActions(filters).then(r => r.actions),
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function useAction(id: string) {
  return useQuery({
    queryKey: ["action", id],
    queryFn: () => actionsService.fetchAction(id),
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