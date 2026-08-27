import { uploadFile, post, get } from "./api";
import { normalizeImageForUpload } from "../lib/imageNormalize";
import { CAPTURE, UPLOAD_LIMITS } from "../constants/api";

export interface CaptureResult {
  capture_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  estimated_processing_time_ms?: number;
  estimated_remaining_ms?: number;
  confidence_score?: number;
  action?: {
    id: string;
    action_type: string;
    title: string;
    description?: string;
    due_date?: string;
    location?: string;
    amount?: number;
    grocery_items?: { name: string; quantity?: string; category?: string }[];
    priority: string;
    status: string;
    assignee_id?: string;
    assignee_display_name?: string;
  };
  error_message?: string;
  created_at?: string;
}

/**
 * Upload a capture file (image, audio, PDF) to the backend.
 */
export async function uploadCapture(
  fileUri: string,
  inputType: "image" | "audio" | "pdf",
  onProgress?: (progress: number) => void
): Promise<CaptureResult> {
  const formData = new FormData();
  const filename = fileUri.split("/").pop() || `capture.${inputType === "image" ? "jpg" : inputType === "audio" ? "m4a" : "pdf"}`;
  const mimeType = inputType === "image" ? "image/jpeg" : inputType === "audio" ? "audio/m4a" : "application/pdf";
  // HEIC→JPEG insurance: iOS cameras default to HEIC; re-encode to a standard
  // JPEG so a HEIC source can never silently fail on the server (owner's bn17
  // blocker). Only applied for images; falls back to original on any error.
  let uploadUri = fileUri;
  if (inputType === "image") {
    uploadUri = await normalizeImageForUpload(fileUri);
  }
  formData.append("file", {
    uri: uploadUri,
    name: uploadUri.endsWith(".heic") ? `${filename.replace(/\.heic$/i, "")}.jpg` : filename,
    type: mimeType,
  } as any);
  formData.append("input_type", inputType);

  return uploadFile<CaptureResult>(CAPTURE.UPLOAD, formData, onProgress);
}

/**
 * Upload a voice note (multimodal photo+voice capture).
 *
 * The backend exposes a dedicated voice endpoint (POST /api/v1/capture/voice)
 * that accepts multipart/form-data with an `audio` file field, transcribes it
 * via Whisper, and runs it through the AI action pipeline. Returns its own
 * capture_id — poll with pollCaptureResult(id) to get the resulting action.
 */
export async function uploadVoiceCapture(
  fileUri: string,
  durationSeconds?: number
): Promise<CaptureResult> {
  const formData = new FormData();
  const filename = fileUri.split("/").pop() || "voice.m4a";
  // expo-audio HIGH_QUALITY preset records .m4a (AAC)
  const mimeType = "audio/m4a";

  formData.append("audio", {
    uri: fileUri,
    name: filename,
    type: mimeType,
  } as any);
  if (durationSeconds !== undefined) {
    formData.append("duration_seconds", String(durationSeconds));
  }

  return uploadFile<CaptureResult>(CAPTURE.VOICE, formData);
}

/**
 * Submit text directly for processing (no file upload).
 */
export async function submitText(text: string): Promise<CaptureResult> {
  return post<CaptureResult>(CAPTURE.TEXT, { text });
}

/**
 * Poll for capture result.
 */
export async function pollCaptureResult(captureId: string): Promise<CaptureResult> {
  return get<CaptureResult>(CAPTURE.RESULT(captureId));
}

/**
 * Poll with retry logic — calls the callback with status updates.
 * Returns when status is "completed" or "failed".
 */
export async function pollUntilDone(
  captureId: string,
  onUpdate?: (result: CaptureResult) => void,
  maxTimeMs: number = UPLOAD_LIMITS.MAX_POLL_TIME_MS
): Promise<CaptureResult> {
  const startTime = Date.now();
  const interval = UPLOAD_LIMITS.POLL_INTERVAL_MS;

  return new Promise<CaptureResult>((resolve, reject) => {
    const poll = async () => {
      try {
        const result = await pollCaptureResult(captureId);
        onUpdate?.(result);

        if (result.status === "completed" || result.status === "failed") {
          resolve(result);
          return;
        }

        if (Date.now() - startTime > maxTimeMs) {
          reject(new Error("Processing timed out"));
          return;
        }

        setTimeout(poll, interval);
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}