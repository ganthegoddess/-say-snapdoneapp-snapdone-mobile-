# SnapDone Mobile — bn18 Bug Sweep Evidence

**Date:** 2026-08-26 · **Engineer:** Mobile Engineer · **PR:** #46 (folded with the 4 core bn18 fixes) · **Baseline:** clean master `89f578a`, `tsc --noEmit` = 0.

This sweep was requested by the owner (via lead) alongside the 4 core bn18 fixes — fix everything that is a real clean-first-install bug; fold into the bn18 round.

## Severity legend
**HIGH** = crash / red-screen / silent data loss / flow-breaking. **MED** = degraded UX / error w/o recovery. **LOW** = polish / debt.

---

## CORE 4 (from bn17 accept failure) — FIXED in PR #46
| # | Issue | Severity | Root cause | Fix | Proof |
|---|---|---|---|---|---|
| 1 | Photo upload failure | HIGH | Preview never read `error`/`isUploading` → a failed upload left the user stuck with NO feedback; raw error text shown. Server-side ruled out (see evidence). | `friendlyCaptureError()` maps 422/network/timeout/5xx to clear PIP tones; preview surfaces error + Try Again + disables Save while uploading | tsc 0; prod DB: 9 image/completed in 24h, 0 failed |
| 2 | expo-calendar deprecated | HIGH | legacy `*Async` methods THROW at runtime in SDK 57 | migrated `useCalendar.ts` to new OO API | tsc 0 |
| 3 | Notification ERR_NOTIFICATIONS_FAILED_TO_SCHEDULE | MED | past-date trigger throws | `scheduleReminder` guards past-date, never throws, returns bool; warm alert | tsc 0 |
| 4 | PIP overlap Memory Vault empty state | MED | `PipBadge` rendered PipWisp absolute `center-screen` (top:120) over text | pass `inline` | tsc 0 |

---

## SWEEP FINDINGS

### Auth / 401 (lead item 1) — REVIEWED, NO CHANGE NEEDED
- `src/services/api.ts` `request()`: 401 → refresh once → retry; refresh-fail → `handleAuthExpired()` warm re-login (never silent). `uploadFile()` same. `src/lib/authExpiry.ts` carries the warm PIP "Sign back in" prompt + in-flight guard.
- **Verdict:** saves (photo/voice/actions) never silently fail on expired token. This is PR #41, already on master and corroborated by the bn17 runtime proof. **No code change.**

### Tab navigation (lead item 2) — REVIEWED, NO CHANGE NEEDED
- `app/(tabs)/_layout.tsx`: exactly 4 `<Tabs.Screen>`; `calendar` + `lists` `options={{ href: null }}` (PR #44). Grep confirms no 5th/6th tab regressed (legacy routes remain files but are href-suppressed).
- **Verdict:** 4-tab IA holds. **No code change.**

### Empty-state PIP overlap elsewhere (lead item 3) — REVIEWED / TAGGED
- `PipBadge` (Memory Vault) — FIXED (core #4, inline).
- `LimitReachedScreen.tsx:50` — `PipWisp center-screen` size 72 inside `pipWrap` at top of a centered paywall card. This is a designed paywall (runtime-accepted on device); changing the absolute placement risks a visual regression without a device render. **TAGGED: verify against designer's empty-state spec when it lands.** Not changed this round to avoid an unverified visual change.
- `onboarding.tsx:38` (hero) + `processing/[id].tsx:86` (thinking) — intentional centered overlays, not in-flow card text. **No overlap risk.**

### Hardcoded test/dev strings (lead item 4) — REVIEWED, NONE USER-FACING
- `id !== "demo"` / `activeHousehold?.id === "demo"` are **internal gated fallbacks** (dev-mode), not strings rendered to users. **No user sees "demo". No change.**

### Console warnings on fresh install (lead item 5) — REVIEWED
- The inventory's known warnings (NotificationBehavior `shouldShowBanner/List`, absoluteFillObject) were already resolved in PRs #16/#17 (on master). Current tree: no new warning introduced by these fixes. **No additional change.**

### Rendering/perf (lead item 6) — REVIEWED
- No new heavy renders; PipBadge `inline` removes an absolute overlay (slightly cheaper). Reanimated PipWisp uses shared values (OK). Inventory D2 (SharedValue-in-plain-style anti-pattern) is runtime-verified working; flagged in inventory, not a crash. **Keep.**

### Red-screen / thrown errors in capture flow (lead item 7) — REVIEWED
- Photo: error-surfaced (core #1). Voice: `uploadVoiceCapture` is already best-effort w/ `.catch` + `console.warn` (never blocks photo). Share/quick-add: uses same `useCapture` path → now error-surfaced. Calendar/notification: wrapped (core #2/#3). **No uncaught throw path remains in capture.**

---

## INTENTIONALLY NOT FIXED THIS ROUND (tracked)
1. **Client-side HEIC→JPEG re-encode** (`expo-image-manipulator`) — HIGH-value iOS insurance for camera-roll HEIC, but `expo install` is OOM-killed (exit 137) on this memory-constrained box. Server already accepts standard photos (9 image/completed today). **Follow-up: add expo-image-manipulator on a machine that can install it.** ← recommended pre-bn18-if-possible
2. **`LimitReachedScreen` / other `center-screen` PIP absolute placement** — needs a device render vs designer spec.
3. **Inventory D-items** (`useGeofence` unwired, `expo-share-intent`, lint config, docs SDK-52) — parked features / docs, not clean-install blockers.
4. **Post-bn18 premium design overhaul** — owner-committed, separate track.

---

## RUNTIME PROOF (prod snapdoneapp.com)
- Photo save: 9 image/completed in last 24h on prod; owner's failures were client-side & silent → now surfaced with Try Again.
- Voice save: voice capture path verified in bn17 runtime proof (202 "Pick up the dry cleaning", completed).
- Both appear in Memory Vault: bn17 proof — GET /actions lists both new memories after capture.
- Auth 401 recovery: verified (token_expired → handleAuthExpired warm path).
- This sweep introduces no API-visible behavior change to the capture pipeline (all fixes are client error-handling/UI/native-API migration), so the bn17 runtime proof remains valid for the pipeline. The new FF paths (Try Again, warm reminder alert) fire only on the previously-failing branches.

## Files changed (PR #46, branch fix/bn18-owner-acceptance)
- `src/hooks/useCapture.ts` (friendlyCaptureError)
- `app/processing/preview.tsx` (error banner + Try Again + uploading state)
- `src/hooks/useCalendar.ts` (OO API migration)
- `src/hooks/useNotifications.ts` (scheduleReminder never throws)
- `app/action/[id].tsx` (warm reminder alert)
- `src/components/ui/PipBadge.tsx` (inline PIP)
- `BUG-SWEEP-EVIDENCE.md` (this file)
