import { useState, useCallback } from "react";
import { useCaptureStore } from "../stores/captureStore";
import * as captureService from "../services/capture";
import { router } from "expo-router";
import { trackEvent } from "../lib/posthog";

export function useCapture() {
  const draft = useCaptureStore((state) => state.draft);
  const setDraft = useCaptureStore((state) => state.setDraft);
  const resetDraft = useCaptureStore((state) => state.resetDraft);
  const isUploading = useCaptureStore((state) => state.isUploading);
  const setIsUploading = useCaptureStore((state) => state.setIsUploading);
  const setUploadProgress = useCaptureStore((state) => state.setUploadProgress);
  const [processingResult, setProcessingResult] = useState<captureService.CaptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Upload a photo/image capture — optionally with voice note data for multimodal */
  const uploadPhoto = useCallback(async (
    uri: string,
    voiceNote?: { uri: string; durationSeconds: number; transcription?: string },
  ) => {
    setIsUploading(true);
    setError(null);
    const inputType = voiceNote ? "photo+voice" : "image";
    setDraft({
      source: "camera",
      uri,
      inputType,
      status: "processing",
      voiceNoteUri: voiceNote?.uri,
      voiceNoteDurationSeconds: voiceNote?.durationSeconds,
      voiceNoteTranscription: voiceNote?.transcription,
    });

    try {
      const result = await captureService.uploadCapture(uri, "image", (progress) => {
        setUploadProgress(progress);
      });

      if (result.capture_id) {
        // Track capture event
        trackEvent("memory_captured", { capture_type: voiceNote ? "photo+voice" : "photo" });
        // Start polling for result
        router.replace(`/processing/${result.capture_id}`);
        startPolling(result.capture_id);
      } else {
        setError("Upload failed — no capture ID returned");
        setIsUploading(false);
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setIsUploading(false);
      setDraft({ status: "failed" });
    }
  }, []);

  /** Poll for processing result */
  const startPolling = useCallback(async (captureId: string) => {
    try {
      const result = await captureService.pollUntilDone(captureId, (update) => {
        setProcessingResult(update);
      });
      setProcessingResult(result);
      setIsUploading(false);

      if (result.status === "completed" && result.action) {
        // Persist auto-assigned household member if present
        if (result.action.assignee_id) {
          setDraft({
            assigneeId: result.action.assignee_id,
            assigneeDisplayName: result.action.assignee_display_name,
          });
        }
        router.replace(`/action/${result.action.id}`);
      } else if (result.status === "failed") {
        setError(result.error_message || "Processing failed");
        setDraft({ status: "failed", errorMessage: result.error_message });
      }
    } catch (err: any) {
      setError(err.message || "Processing timed out");
      setIsUploading(false);
      setDraft({ status: "failed" });
    }
  }, []);

  /** Submit text for processing */
  const submitText = useCallback(async (text: string) => {
    setIsUploading(true);
    setError(null);
    setDraft({ source: "screenshot", inputType: "text", status: "processing" });

    try {
      const result = await captureService.submitText(text);
      if (result.capture_id) {
        trackEvent("memory_captured", { capture_type: "text" });
        router.replace(`/processing/${result.capture_id}`);
        startPolling(result.capture_id);
      }
    } catch (err: any) {
      setError(err.message || "Submission failed");
      setIsUploading(false);
    }
  }, []);

  /** Reset capture state */
  const reset = useCallback(() => {
    resetDraft();
    setProcessingResult(null);
    setError(null);
  }, []);

  return {
    draft,
    processingResult,
    error,
    isUploading,
    uploadPhoto,
    submitText,
    reset,
  };
}