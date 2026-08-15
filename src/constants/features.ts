// Beta Freeze feature flags — owner-ratified (2026-08-13).
//
// Before public beta the following surfaces are DISABLED per the Beta Freeze
// Policy: UI hidden, code kept. Flip a flag to true ONLY when the founder
// explicitly enables the phase.
//
//   ASK_PIP       — app/ask-pip.tsx → POST /api/v1/memories/ask (Phase 3)
//   MEMORY_STATE  — action memory-state chips → PATCH /api/v1/actions/:id/memory-state
export const FEATURES = {
  ASK_PIP: false,
  MEMORY_STATE: false,
} as const;
