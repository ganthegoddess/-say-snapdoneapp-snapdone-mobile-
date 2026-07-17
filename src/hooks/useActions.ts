import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as actionsService from "../services/actions";
import type { ActionItem } from "../services/actions";

// Demo fallback data when API is unavailable
const DEMO_ACTIONS: ActionItem[] = [
  { id: "1", action_type: "event", title: "Dentist Appointment", description: "123 Main St, Suite 200", status: "pending_confirmation", priority: "medium", due_date: new Date(Date.now() + 3600000).toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "2", action_type: "grocery_list", title: "Grocery List — Trader Joe's", description: "12 items", status: "pending_confirmation", priority: "medium", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "3", action_type: "bill", title: "Electric Bill — Due Apr 15", status: "active", priority: "high", due_date: new Date(Date.now() + 86400000 * 3).toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "4", action_type: "reminder", title: "Call Mom for her birthday", status: "pending_confirmation", priority: "medium", due_date: new Date(Date.now() + 86400000).toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "5", action_type: "event", title: "Flight to Chicago", description: "UA 1234 · Gate B7", status: "active", priority: "high", due_date: new Date(Date.now() + 86400000 * 7).toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "6", action_type: "task", title: "Submit expense report", status: "completed", priority: "medium", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export function useActions(filters?: { status?: string; action_type?: string }) {
  return useQuery({
    queryKey: ["actions", filters],
    queryFn: async () => {
      try {
        const response = await actionsService.fetchActions(filters);
        return response.actions;
      } catch {
        // Fallback to demo data when API is unavailable
        let filtered = [...DEMO_ACTIONS];
        if (filters?.status) filtered = filtered.filter(a => a.status === filters.status);
        if (filters?.action_type) filtered = filtered.filter(a => a.action_type === filters.action_type);
        return filtered;
      }
    },
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function useAction(id: string) {
  return useQuery({
    queryKey: ["action", id],
    queryFn: async () => {
      try {
        return await actionsService.fetchAction(id);
      } catch {
        return DEMO_ACTIONS.find(a => a.id === id) || DEMO_ACTIONS[0];
      }
    },
    enabled: !!id,
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