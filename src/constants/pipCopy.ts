// ─────────────────────────────────────────────────────────────
// SnapDone Mobile — PIP copy (single source of truth, ONE voice)
// DESIGN-SYSTEM §6 · "I've got it." is THE confirmation everywhere.
// {name} and {n} are ALWAYS dynamic — filled from the logged-in
// user's account and real counters. Never hardcode a person's name.
// No "Saved Successfully / Memory Added / Upload Complete."
// ─────────────────────────────────────────────────────────────

export const pip = {
  emptyHome: {
    title: "Hi {name}! I'm PIP.",
    body:
      "Snap a photo, a voice note, or a thought — I'll keep it safe and bring it back when you need it.",
    cta: "I've got somewhere to start",
  },
  loading: {
    thinking: "Just a second…",
    searching: "I'm looking through your memories…",
    processing: "Turning that into a memory…",
  },
  // ONE voice — every save/snapshot/confirmation (never "Saved Successfully").
  gotIt: "I've got it.",
  firstCapture: { title: "Nice — I've got it.", body: "I'll bring this back when you need it." },
  milestone: { title: "You've trusted me with {n} memories. I'll remember them all.", body: "I've got it." },
  snapback: {
    title: "Hey {name} — you asked me to remember this.",
    body: "Here it is, right when you need it.",
    callout: "I got this for you.",
  },
  householdEmpty: {
    title: "It's roomy in here.",
    body: "Invite your family and I'll remember for all of you.",
    cta: "Invite family member",
  },
  vaultEmpty: {
    title: "Nothing here yet.",
    body: "Anything you snap will show up with me — right here, when you need it.",
    cta: "Snap your first memory",
  },
  error: {
    friendly: "Hmm — I can't reach myself right now.",
    body: "Your memories are safe with me. Tap Retry when you're back.",
    action: "Try Again",
  },
  success: { title: "Done. I've got it." },
  archived: "Kept safe, out of the way.",
  householdJoined: "Welcome. Now I'll remember for all of you.",
  captureSheet: {
    title: "What can I carry for you today?",
    confirm: "I've got it.",
    followUp: "I'll bring this back when you need it.",
  },
}

// ── Home capture actions — THREE ONLY (DESIGN-SYSTEM §7.4 / §6.2) ──
// Each is a premium filled tinted pill: soft vertical gradient (lighter tint top →
// deeper tint bottom), no outline, heavy tint icon + INK label centred as ONE unit.
// tints = TEAL (snap) / AMBER (tell) / EMERALD (type) — matches v6 mockup_kit.
export const HOME_CAPTURE_ACTIONS = [
  { key: "snap", label: "Snap something", icon: "camera", route: "/capture", hint: "Photo / receipt / flyer", tint: "#0891B2" },
  { key: "tell", label: "Tell me", icon: "mic", route: "voice", hint: "A voice note — just speak", tint: "#F59E0B" },
  { key: "type", label: "Type it", icon: "note", route: "note", hint: "A thought, a list, anything", tint: "#10B981" },
] as const;

// ── Home "evolves with the relationship" greeting ladder (DESIGN-SYSTEM §7.1) ──
// Data-driven from memory count + time of day + outstanding items. Dynamic {name}.
export function greetingLine(
  name: string | undefined,
  opts: {
    memoryCount: number;
    outstanding: number;
    overdue: number;
    time?: Date;
  }
): { greeting: string; reassurance: string; showPrompt: boolean } {
  const first = name?.trim().split(/\s+/)[0] || "";
  const namePart = first ? first : "";
  const h = (opts.time || new Date()).getHours();
  const prefix = h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const at = namePart ? `${prefix}, ${namePart}` : prefix;

  // Overdue → the "let's knock them out together" beat.
  if (opts.overdue > 0) {
    return {
      greeting: at,
      reassurance: opts.overdue === 1
        ? "We've got one thing to catch up on. Let's knock it out together."
        : `We've got a few things to catch up on. Let's knock them out together.`,
      showPrompt: true,
    };
  }
  // Upcoming / busy day.
  if (opts.outstanding > 0) {
    return {
      greeting: at,
      reassurance: opts.outstanding === 1
        ? "You've got one thing coming up — don't worry, I'll remind you."
        : `You've got ${opts.outstanding} things coming up — don't worry, I'll remind you.`,
      showPrompt: true,
    };
  }
  // Established / emotional checkpoint (several memories).
  if (opts.memoryCount >= 3) {
    return {
      greeting: at,
      reassurance: "I've got everything you've trusted me with. Share with me — I've got it.",
      showPrompt: true,
    };
  }
  // Just started (1–2 memories).
  if (opts.memoryCount >= 1) {
    return {
      greeting: at,
      reassurance: `Thanks for trusting me with your memories. Share with me — I've got it.`,
      showPrompt: true,
    };
  }
  // Day 0 — empty / onboarding.
  return {
    greeting: namePart ? `Hi, ${namePart}. I'm PIP.` : "Hi, I'm PIP.",
    reassurance: "Tell me anything you're carrying and I'll remember it for you.",
    showPrompt: true,
  };
}

/** Template fill helper: replaces {name}/{n} tokens with dynamic values. */
export function fill(template: string, vars: { name?: string; n?: number } = {}): string {
  return template
    .replace("{name}", vars.name?.trim() || "")
    .replace("{n}", String(vars.n ?? ""));
}
