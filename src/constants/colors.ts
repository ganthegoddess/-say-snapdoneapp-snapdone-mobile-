// SnapDone brand color palette
// Matches Tailwind config and brand identity guide

export const colors = {
  brand: {
    primary: "#0891B2", // cyan-600
    dark: "#0E7490", // cyan-700
    light: "#ECFEFF", // cyan-50
  },
  accent: {
    complete: "#10B981", // emerald-500
    warm: "#F59E0B", // amber-500
  },
  deep: "#0F172A", // slate-900
  surface: "#F8FAFC", // slate-50
  text: {
    primary: "#1E293B", // slate-800
    muted: "#64748B", // slate-500
  },
  border: "#E2E8F0", // slate-200
  white: "#FFFFFF",
  error: "#EF4444", // red-500
  success: "#10B981", // emerald-500
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    extrabold: "800" as const,
  },
  sizes: {
    caption: 12,
    bodySmall: 14,
    body: 16,
    h3: 20,
    h2: 24,
    h1: 28,
    display: 32,
  },
} as const;