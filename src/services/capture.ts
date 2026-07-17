import { uploadFile, post, get } from "./api";
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

  formData.append("file", {
    uri: fileUri,
    name: filename,
    type: mimeType,
  } as any);
  formData.append("input_type", inputType);

  return uploadFile<CaptureResult>(CAPTURE.UPLOAD, formData, onProgress);
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