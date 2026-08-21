// SnapDone brand color palette
// Source of truth: the website's Brand Design System
// (/home/team/shared/site/src/styles/app.css). The app MUST match the website.
//
// Signature gradient: teal -> green (the "snap" gradient) used on primary
// buttons, the capture FAB, active tab, header accents — exactly like the site.

export const colors = {
  brand: {
    primary: "#0891B2", // teal / cyan-600 — the SnapDone brand color
    dark: "#0E7490", // cyan-700
    light: "#ECFEFF", // cyan-50
  },
  accent: {
    complete: "#10B981", // emerald-500 (green)
    warm: "#F59E0B", // amber-500 — the warm/celebration accent
  },
  warm: {
    amber: "#F59E0B",
    amberLight: "#FCC870",
    amberSoft: "#FFECD0",
    amberTint: "#FFE0B0",
    cream: "#FFF8F0",
  },
  deep: "#0F172A", // slate-900
  surface: "#F8FAFC", // slate-50 — soft warm surface, not stark white
  surfaceWarm: "#FBF7F0", // warm cream surface for lived-in screens
  text: {
    primary: "#1E293B", // slate-800
    muted: "#64748B", // slate-500
  },
  border: "#E2E8F0", // slate-200
  white: "#FFFFFF",
  error: "#EF4444", // red-500
  success: "#10B981", // emerald-500
  // Signature "snap" gradient — teal -> green (matches the website)
  gradient: {
    // The color pair.
    from: "#0891B2",
    to: "#10B981",
    // For LinearGradient components: [from, to]
    colors: ["#0891B2", "#10B981"] as [string, string],
  },
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
  "2xl": 28, // soft, friendly rounded cards (site uses rounded-2xl)
  full: 9999,
} as const;

export const shadows = {
  // Soft shadow — mirrors the site's card language
  soft: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  warm: {
    shadowColor: "#F59E0B",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
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
