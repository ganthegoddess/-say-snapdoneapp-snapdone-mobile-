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
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload a photo/image capture — with an optional attached voice note
   * (multimodal "photo+voice" capture).
   *
   * The photo goes to POST /capture; the voice note goes to POST /capture/voice
   * (multipart `audio` field, Whisper-transcribed server-side). The voice
   * upload is best-effort and runs in parallel — a voice failure must never
   * block the photo path. Polling is owned by the processing screen, which
   * navigates to the real action on completion.
   */
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
      const voicePromise = voiceNote?.uri
        ? captureService
            .uploadVoiceCapture(voiceNote.uri, voiceNote.durationSeconds)
            .catch((err) => {
              console.warn("Voice note upload failed:", err);
              return null;
            })
        : Promise.resolve(null);

      const [result] = await Promise.all([
        captureService.uploadCapture(uri, "image", (progress) => {
          setUploadProgress(progress);
        }),
        voicePromise,
      ]);

      if (result.capture_id) {
        // Track capture event
        trackEvent("memory_captured", { capture_type: voiceNote ? "photo+voice" : "photo" });
        // Processing screen polls for the result and navigates on completion.
        router.replace(`/processing/${result.capture_id}`);
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
      }
    } catch (err: any) {
      setError(err.message || "Submission failed");
      setIsUploading(false);
    }
  }, []);

  /** Reset capture state */
  const reset = useCallback(() => {
    resetDraft();
    setError(null);
  }, []);

  return {
    draft,
    error,
    isUploading,
    uploadPhoto,
    submitText,
    reset,
  };
}
