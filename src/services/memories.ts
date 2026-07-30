import { post, patch } from "./api";
import { MEMORIES, ACTIONS } from "../constants/api";
import type { MemoryPayload } from "../types";

/** Context passed to the recall engine */
export interface RecallContext {
  place_name?: string;
  upcoming_events?: string[];
  active_household_members?: string[];
  search_query?: string;
}

/** A memory surfaced by PIP's recall engine (full payload) */
export interface RecalledMemory extends MemoryPayload {
  /** Legacy: why PIP surfaced this — the contextual reason */
  recall_reason: string;
}

/** Response from POST /api/v1/memories/recall */
export interface RecallResponse {
  recalled: RecalledMemory[];
}

/** Memory state values */
export type MemoryState = "active" | "dormant" | "archived";

/**
 * Ask PIP's recall engine to surface dormant memories
 * based on the current context (place, calendar, household, search).
 *
 * POST /api/v1/memories/recall
 */
export async function recallMemories(context: RecallContext): Promise<RecallResponse> {
  return post<RecallResponse>(MEMORIES.RECALL, context);
}

/**
 * Update the memory state of an action.
 *
 * PATCH /api/v1/actions/:id/memory-state
 */
export async function updateMemoryState(
  actionId: string,
  state: MemoryState
): Promise<{ id: string; memory_state: string }> {
  return patch(ACTIONS.MEMORY_STATE(actionId), { memory_state: state });
}
