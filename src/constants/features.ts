// Beta Freeze feature flags — owner-ratified (2026-08-13).
//
// Before public beta the following surfaces are DISABLED per the Beta Freeze
// Policy: UI hidden, code kept. Flip a flag to true ONLY when the founder
// explicitly enables the phase.
//
//   ASK_PIP       — app/ask-pip.tsx → POST /api/v1/memories/ask (Phase 3)
//   MEMORY_STATE  — action memory-state chips → PATCH /api/v1/actions/:id/memory-state
//   OPEN_INTRO    — PIP-first open experience (bn23, owner Aug 28): the app
//                   opens to PIP alone; a single tap reveals Home. false =
//                   legacy behavior (authenticated cold start → straight Home).
//   OPEN_INTRO_EVERY_OPEN — false (default) = cold-start only (APP-OPEN-INTRO
//                   spec §5); true = replay on every app foreground. Reserved
//                   switch — the foreground replay wiring is not yet landed.
export const FEATURES = {
  ASK_PIP: false,
  MEMORY_STATE: false,
  OPEN_INTRO: true,
  OPEN_INTRO_EVERY_OPEN: false,
} as const;
