// ─────────────────────────────────────────────────────────────
// SnapDone Mobile — THEME (single source of truth for the app)
// OPTION A REBUILD (Aug 21). Maps the website's official brand
// system (site/src/styles/app.css) onto the mobile app.
// Canonical source: /home/team/shared/opt-a-design/mobile-theme.ts
//
// RULES: NO stray hexes in screens. Import from this file only.
// Primary surfaces use the signature teal→green gradient.
// Warm amber = PIP / celebration / SnapBack emphasis (never cold gray).
// ─────────────────────────────────────────────────────────────

export const colors = {
  // ── Brand (teal/cyan) — the "snap" identity ──
  brand: {
    primary: "#0891B2", // cyan-600  — primary action, active tab, links
    dark:    "#0E7490", // cyan-700  — pressed/gradient stop
    light:   "#ECFEFF", // cyan-50   — brand-tinted chips, selected bg, headers
  },
  // ── Accents ──
  accent: {
    complete: "#10B981", // emerald-500 — "done", completed memory, positive
    warm:     "#F59E0B", // amber-500  — PIP moments, milestones, SnapBack highlights
    amberDeep:"#D97706", // AMBER_DEEP — the ONE colourized PIP voice "I've got it." (§6.4)
  },
  // ── Warm / cream tones (website warmth) ──
  warm: {
    amber:  "#F59E0B", // amber-500  (alias of accent.warm)
    soft:   "#FCC870", // soft amber — secondary warm fill, badges
    cream:  "#FFECD0", // warm cream — warm backgrounds, milestone cards
    cream2: "#FFE0B0", // deep cream — SnapBack callout bg, celebrating
    pipGlow:"#FFF5D8", // warm ivory — PIP glow field (mirrors PipWisp)
  },
  // ── Neutrals (v6 text-colour policy §6.4: TWO colours + ONE PIP voice) ──
  ink:      "#0F2A33", // INK  — headings / titles (owner v6)
  deep:     "#0F2A33", // alias of INK (kept for existing heading styles)
  surface:  "#F8FAFC", // slate-50   — primary warm-white screen background
  white:    "#FFFFFF",
  text: {
    primary: "#0F2A33", // body reads INK (owner v6 §6.4)
    muted:   "#5B6B72", // MUTED — body / secondary copy (owner v6)
    onGradient: "#FFFFFF",
  },
  // MUTED alias — body / secondary copy (owner v6)
  muted:    "#5B6B72",
  // NOTE: `border` is offered BOTH as a flat string (legacy alias used across
  // existing screens) and as an object with light/brand tokens. The flat
  // string equals border.light. Keeps the whole app on one file (single source).
  border: "#E2E8F0", // slate-200 — legacy flat alias (== border.light)
  error: "#EF4444", // red-500  — destructive / friendly errors
  success: "#10B981", // emerald-500
  // ── Signature gradient (what makes the site feel "SnapDone") ──
  gradient: {
    colors: ["#0891B2", "#10B981"] as [string, string], // 135deg teal → green
    from: "#0891B2",
    to: "#10B981",
  },
} as const;

// Border object tokens (designer spec)
export const border = {
  light: "#E2E8F0", // slate-200 — card borders
  brand: "#0891B2", // tinted border (focus ring)
} as const;

// Shadow recipe — soft, friendly, "lived-in" (not heavy/techy)
export const shadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  fab: {
    shadowColor: "#0891B2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

// Legacy plural alias for soft card shadows (used by new rebuilt screens).
export const shadows = {
  soft: shadow.card,
  fab: shadow.fab,
} as const;

// Radius language (rounded-2xl sits at 16, cards friendly-rounded)
export const borderRadius = {
  sm: 8,
  md: 12,   // default button / input
  lg: 16,   // rounded-2xl — cards
  xl: 24,   // modals, big surfaces
  full: 9999, // FAB, pills
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, "2xl": 48,
} as const;

export const typography = {
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
  weights: { regular: "400", medium: "500", semibold: "600", bold: "700", extrabold: "800" } as const,
  sizes: {
    caption: 12, bodySmall: 14, body: 16, h3: 20, h2: 24, h1: 28, display: 32,
  } as const,
} as const;

// ── Semantic surface choices (where each background lands) ──
// Keep screens warm; reserve pure white for cards layered on surface.
export const surfaces = {
  screen: "#F8FAFC",      // default app background (warm-white)
  screenWarm: "#FFECD0",  // celebratory / milestone screen tint
  card: "#FFFFFF",        // content cards
  header: "#ECFEFF",      // Home hero / gradient-hint headers
  elevated: "#FFFFFF",    // FAB, modals
} as const;

export default { colors, shadow, shadowBorder: border, borderRadius, spacing, typography, surfaces };
