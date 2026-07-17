import { create } from "zustand";
import type { CaptureSource, CaptureStatus } from "../types";

export interface DraftCapture {
  id?: string;
  source: CaptureSource | null;
  uri: string | null;
  thumbnailUri?: string;
  inputType: "image" | "audio" | "pdf" | "text" | null;
  status: CaptureStatus;
  errorMessage?: string;
}

export interface CaptureState {
  /** Current draft capture being created */
  draft: DraftCapture;
  /** Whether a capture upload is in progress */
  isUploading: boolean;
  /** Upload progress (0-1) */
  uploadProgress: number;

  // Actions
  setDraft: (draft: Partial<DraftCapture>) => void;
  resetDraft: () => void;
  setIsUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
}

const initialDraft: DraftCapture = {
  source: null,
  uri: null,
  inputType: null,
  status: "pending",
};

export const useCaptureStore = create<CaptureState>((set) => ({
  draft: initialDraft,
  isUploading: false,
  uploadProgress: 0,

  setDraft: (partial: Partial<DraftCapture>) =>
    set((state) => ({ draft: { ...state.draft, ...partial } })),

  resetDraft: () => set({ draft: initialDraft, isUploading: false, uploadProgress: 0 }),

  setIsUploading: (isUploading: boolean) => set({ isUploading }),

  setUploadProgress: (uploadProgress: number) => set({ uploadProgress }),
}));