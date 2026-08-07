import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as memoriesService from "../services/memories";
import type { RecallContext, RecalledMemory, MemoryState } from "../services/memories";
import { useLocationStore } from "../stores/locationStore";

/**
 * Hook for PIP's memory recall engine.
 *
 * Called on foreground to ask PIP: "what dormant memories are relevant right now?"
 */
export function useRecallMemories() {
  const [recalled, setRecalled] = useState<RecalledMemory[]>([]);
  const [isRecalling, setIsRecalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locationEnabled = useLocationStore((s) => s.locationRemindersEnabled);

  const recall = useCallback(
    async (context: RecallContext): Promise<RecalledMemory[]> => {
      if (!locationEnabled && !context.search_query) return [];

      setIsRecalling(true);
      setError(null);

      try {
        const result = await memoriesService.recallMemories(context);
        setRecalled(result.recalled);
        return result.recalled;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Recall failed";
        setError(message);
        console.warn("Memory recall failed:", message);
        return [];
      } finally {
        setIsRecalling(false);
      }
    },
    [locationEnabled]
  );

  return { recall, recalled, isRecalling, error };
}

/**
 * Hook for updating an action's memory state.
 */
export function useUpdateMemoryState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      actionId,
      state,
    }: {
      actionId: string;
      state: MemoryState;
    }) => memoriesService.updateMemoryState(actionId, state),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });
}
