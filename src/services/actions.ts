import { get, del, patch } from "./api";
import { ACTIONS } from "../constants/api";

export interface ActionItem {
  id: string;
  action_type: "reminder" | "event" | "grocery_list" | "bill" | "task";
  title: string;
  description?: string;
  status: "active" | "completed" | "dismissed" | "pending_confirmation";
  priority: "low" | "medium" | "high";
  due_date?: string;
  location?: string;
  amount?: number;
  household_id?: string;
  assignee_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ActionListResponse {
  actions: ActionItem[];
  total: number;
  limit: number;
  offset: number;
}

interface ActionFilters {
  status?: string;
  action_type?: string;
  household_id?: string;
  limit?: number;
  offset?: number;
  sort?: string;
}

/**
 * Fetch the list of actions for the current user.
 */
export async function fetchActions(filters: ActionFilters = {}): Promise<ActionListResponse> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.action_type) params.set("action_type", filters.action_type);
  if (filters.household_id) params.set("household_id", filters.household_id);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));
  if (filters.sort) params.set("sort", filters.sort);

  const query = params.toString();
  const endpoint = query ? `${ACTIONS.LIST}?${query}` : ACTIONS.LIST;

  return get<ActionListResponse>(endpoint);
}

/**
 * Fetch a single action by ID.
 */
export async function fetchAction(id: string): Promise<ActionItem> {
  return get<ActionItem>(ACTIONS.DETAIL(id));
}

/**
 * Update an action.
 */
export async function updateAction(
  id: string,
  data: Partial<{
    status: string;
    title: string;
    description: string;
    due_date: string;
    priority: string;
    location: string;
  }>
): Promise<{ id: string; status: string; updated_at: string }> {
  return patch(ACTIONS.DETAIL(id), data);
}

/**
 * Mark an action as complete.
 */
export async function completeAction(id: string): Promise<{ id: string; status: string; completed_at: string }> {
  return patch(ACTIONS.COMPLETE(id), {});
}

/**
 * Delete/dismiss an action.
 */
export async function deleteAction(id: string): Promise<{ id: string; status: string }> {
  return del(ACTIONS.DETAIL(id));
}