import { create } from "zustand";

export interface UIState {
  /** Whether the user has completed onboarding */
  onboardingComplete: boolean;
  /** Last active tab index */
  activeTab: number;
  /** Whether the app is processing a capture */
  isProcessing: boolean;
  /** Error message to display in a toast */
  toastMessage: string | null;
  /** Toast type */
  toastType: "success" | "error" | "info" | null;

  // Actions
  setOnboardingComplete: (complete: boolean) => void;
  setActiveTab: (tab: number) => void;
  setIsProcessing: (processing: boolean) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  clearToast: () => void;
  reset: () => void;
}

const initialState = {
  onboardingComplete: false,
  activeTab: 0,
  isProcessing: false,
  toastMessage: null,
  toastType: null as "success" | "error" | "info" | null,
};

export const useUIStore = create<UIState>((set) => ({
  ...initialState,

  setOnboardingComplete: (onboardingComplete: boolean) => set({ onboardingComplete }),
  setActiveTab: (activeTab: number) => set({ activeTab }),
  setIsProcessing: (isProcessing: boolean) => set({ isProcessing }),
  showToast: (toastMessage: string, toastType: "success" | "error" | "info") =>
    set({ toastMessage, toastType }),
  clearToast: () => set({ toastMessage: null, toastType: null }),
  reset: () => set(initialState),
}));