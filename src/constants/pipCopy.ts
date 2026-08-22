// ─────────────────────────────────────────────────────────────
// SnapDone Mobile — PIP copy (single source of truth)
// IDENTITY REDESIGN (Aug 21) · designer spec §3
// {name} and {n} are ALWAYS dynamic — filled from the logged-in
// user's account and real counters. Never hardcode a person's name.
// ─────────────────────────────────────────────────────────────

export const pip = {
  emptyHome: {
    title: "Hi {name}! I'm PIP.",
    body:
      "Snap a photo, a voice note, or a thought — I'll keep it safe and bring it back when you need it.",
  },
  loading: {
    thinking: "Just a second…",
    searching: "I'm looking through your memories.",
  },
  firstCapture: { title: "Nice! I've got it.", body: "I'll remember this for you." },
  milestone: { title: "You've saved {n} memories.", body: "I'll remember them all." },
  snapback: {
    title: "Hey {name} — you asked me to remember this.",
    body: "Here it is, right when you need it.",
  },
  householdEmpty: {
    title: "It's roomy in here.",
    body: "Invite your family and I'll remember for all of you.",
  },
  error: {
    title: "Hmm — I can't reach myself.",
    body: "📶 Couldn't reach SnapDone. Your memories are safe — tap Retry.",
  },
  success: { title: "Done. I've got it." },
} as const;

/** Template fill helper: replaces {name}/{n} tokens with dynamic values. */
export function fill(template: string, vars: { name?: string; n?: number } = {}): string {
  return template
    .replace("{name}", vars.name?.trim() || "")
    .replace("{n}", String(vars.n ?? ""));
}
