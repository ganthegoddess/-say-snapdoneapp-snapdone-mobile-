/**
 * PIP Memory Wisp — Animation engine
 *
 * Drives all PIP state transitions using Reanimated shared values
 * running on the UI thread. Follows the authoritative spec at:
 * /home/team/shared/PIP-design-system.md
 *
 * Key principles:
 * - All animations on UI thread (useNativeDriver: true equivalent via Reanimated)
 * - Fluid underwater physics — no bouncy or snappy movements
 * - Per-state timing from designer spec
 * - Signature "I've got it" animation as a dedicated sequence
 */

import type { DimensionValue } from "react-native";
import {
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  cancelAnimation,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import { useMemo } from "react";

// ──────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────

export type PipState =
  | "idle"
  | "listening"
  | "thinking"
  | "searching"
  | "remembered"
  | "success";

export type PipPosition =
  | "top-right"
  | "center-top"
  | "beside-card"
  | "center-screen"
  | "left-banner"
  | "center-content";

// ──────────────────────────────────────────────
//  Designer spec: per-state timing table
// ──────────────────────────────────────────────

interface StateConfig {
  orbScale: number;        // relative to idle orb size
  opacity: number;         // main opacity
  glowIntensity: number;   // aura intensity 0-1
  floatAmplitude: number;  // vertical float amplitude (dp)
  floatPeriod: number;     // vertical float period (ms)
  pulsePeriod: number;     // glow pulse period (ms)
  pulseAmplitude: number;  // glow pulse magnitude
  particleOpacity: number;
  tailOpacity: number;
  sparkleOpacity: number;
  transitionInMs: number;
  transitionOutMs: number;
}

const STATE_CONFIGS: Record<PipState, StateConfig> = {
  idle: {
    orbScale: 1.0,
    opacity: 0.85,           // was 0.70 — too faint on white backgrounds
    glowIntensity: 0.35,
    floatAmplitude: 4,
    floatPeriod: 3000,
    pulsePeriod: 4500,
    pulseAmplitude: 0.08,
    particleOpacity: 0.6,
    tailOpacity: 0.15,
    sparkleOpacity: 0,
    transitionInMs: 600,
    transitionOutMs: 600,
  },
  listening: {
    orbScale: 27 / 24,       // 27pt / 24pt = ~1.13
    opacity: 0.9,
    glowIntensity: 0.55,
    floatAmplitude: 2,
    floatPeriod: 3500,
    pulsePeriod: 2800,
    pulseAmplitude: 0.1,
    particleOpacity: 0.85,
    tailOpacity: 0.35,
    sparkleOpacity: 0,
    transitionInMs: 350,
    transitionOutMs: 600,
  },
  thinking: {
    orbScale: 26 / 24,       // 26pt / 24pt = ~1.08
    opacity: 0.8,
    glowIntensity: 0.4,
    floatAmplitude: 3,
    floatPeriod: 6000,       // was 3500 — slowed: contemplative, not computational
    pulsePeriod: 4000,       // was 2000 — slowed per owner feedback
    pulseAmplitude: 0.15,
    particleOpacity: 0.9,
    tailOpacity: 0.3,
    sparkleOpacity: 0,
    transitionInMs: 400,     // was 300 — slightly slower transition
    transitionOutMs: 500,    // was 400
  },
  searching: {
    orbScale: 26 / 24,
    opacity: 0.8,
    glowIntensity: 0.38,
    floatAmplitude: 3,
    floatPeriod: 3500,
    pulsePeriod: 2200,
    pulseAmplitude: 0.1,
    particleOpacity: 0.85,
    tailOpacity: 0.3,
    sparkleOpacity: 0,
    transitionInMs: 300,
    transitionOutMs: 400,
  },
  remembered: {
    orbScale: 29 / 24,       // 29pt / 24pt = ~1.21
    opacity: 1.0,
    glowIntensity: 0.7,
    floatAmplitude: 2,
    floatPeriod: 4000,
    pulsePeriod: 3000,
    pulseAmplitude: 0.12,
    particleOpacity: 0.6,
    tailOpacity: 0.2,
    sparkleOpacity: 0.7,
    transitionInMs: 300,
    transitionOutMs: 800,
  },
  success: {
    orbScale: 27 / 24,       // 27pt → 24pt return
    opacity: 1.0,
    glowIntensity: 0.7,
    floatAmplitude: 3,
    floatPeriod: 3500,
    pulsePeriod: 2500,
    pulseAmplitude: 0.1,
    particleOpacity: 0.5,
    tailOpacity: 0.15,
    sparkleOpacity: 0.9,
    transitionInMs: 250,
    transitionOutMs: 900,
  },
};

// ──────────────────────────────────────────────
//  Position constants (designer spec section 5)
// ──────────────────────────────────────────────

export const POSITION_MAP: Record<
  PipPosition,
  { top?: DimensionValue; right?: DimensionValue; left?: DimensionValue; marginTop?: number; marginLeft?: number }
> = {
  "top-right":      { top: 16, right: 16 },
  "center-top":     { top: 40, left: "50%", marginLeft: -22 },
  "beside-card":    { top: "50%", right: -30, marginTop: -22 },
  "center-screen":  { top: 120, left: "50%", marginLeft: -22 },
  "left-banner":    { top: "50%", left: 12, marginTop: -22 },
  "center-content": { top: "50%", left: "50%", marginTop: -22, marginLeft: -22 },
};

// ──────────────────────────────────────────────
//  Hook: usePipAnimationValues
// ──────────────────────────────────────────────

export interface PipAnimationValues {
  // Core
  orbScale: SharedValue<number>;
  orbOpacity: SharedValue<number>;
  glowIntensity: SharedValue<number>;
  // Float (vertical oscillation)
  floatOffset: SharedValue<number>;
  // Glow pulse
  pulseValue: SharedValue<number>;
  // Particles
  particleOpacity: SharedValue<number>;
  // Tail
  tailOpacity: SharedValue<number>;
  // Sparkle
  sparkleOpacity: SharedValue<number>;
  // Blink
  blink: SharedValue<number>;
  // Position
  posX: SharedValue<number>;
  posY: SharedValue<number>;
  // Particle behavior mode
  particleMode: SharedValue<string>;
  // = Seeded values for consistent float phase =
  floatPhase: number;
  pulsePhase: number;
}

export function usePipAnimationValues(): PipAnimationValues {
  const floatPhase = useMemo(() => Math.random() * Math.PI * 2, []);
  const pulsePhase = useMemo(() => Math.random() * Math.PI * 2, []);

  return {
    orbScale:        useSharedValue(1.0),
    orbOpacity:      useSharedValue(0.7),
    glowIntensity:   useSharedValue(0.35),
    floatOffset:     useSharedValue(0),
    pulseValue:      useSharedValue(0),
    particleOpacity: useSharedValue(0.6),
    tailOpacity:     useSharedValue(0.15),
    sparkleOpacity:  useSharedValue(0),
    blink:           useSharedValue(1),
    posX:            useSharedValue(0),
    posY:            useSharedValue(0),
    particleMode:    useSharedValue("idle"),
    floatPhase,
    pulsePhase,
  };
}

// ──────────────────────────────────────────────
//  Idle loop: float + pulse + blink
// ──────────────────────────────────────────────

let idleLoopRunning = false;

// Reduced-motion guard (device accessibility setting). When on, every loop and
// one-shot is suppressed so PIP stays a static, calm presence (App Motion Spec §6).
let reduceMotionActive = false;
export function setReduceMotion(on: boolean) {
  reduceMotionActive = on;
}

function startIdleLoop(v: PipAnimationValues, config: StateConfig) {
  if (reduceMotionActive) return;
  if (idleLoopRunning) return;
  idleLoopRunning = true;

  // Vertical float (designer spec: ±4pt, ~3s cycle, sine-based)
  v.floatOffset.value = withRepeat(
    withSequence(
      withTiming(config.floatAmplitude, {
        duration: config.floatPeriod / 2,
        easing: Easing.inOut(Easing.sin),
      }),
      withTiming(-config.floatAmplitude, {
        duration: config.floatPeriod / 2,
        easing: Easing.inOut(Easing.sin),
      }),
    ),
    -1, // infinite
    true, // reverse
  );

  // Subtle horizontal drift — organic, ~7s cycle, ±2-3px
  // Different period than Y so motion never loops identically
  v.posX.value = withRepeat(
    withSequence(
      withTiming(3, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
      withTiming(-3, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
    ),
    -1,
    true,
  );

  // Glow pulse
  v.pulseValue.value = withRepeat(
    withSequence(
      withTiming(config.pulseAmplitude, {
        duration: config.pulsePeriod / 2,
        easing: Easing.inOut(Easing.sin),
      }),
      withTiming(-config.pulseAmplitude, {
        duration: config.pulsePeriod / 2,
        easing: Easing.inOut(Easing.sin),
      }),
    ),
    -1,
    true,
  );

  // Blink timer — random 5-10s intervals (designer spec: not fixed)
  startBlinkLoop(v);
}

function startBlinkLoop(v: PipAnimationValues) {
  const scheduleBlink = () => {
    if (reduceMotionActive) return;
    const delay = 5000 + Math.random() * 5000; // 5-10s
    setTimeout(() => {
      if (reduceMotionActive) return;
      // Blink: close 150ms, open 150ms (designer spec 2.2)
      v.blink.value = withSequence(
        withTiming(0.05, { duration: 150, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 150, easing: Easing.inOut(Easing.sin) }),
      );
      scheduleBlink();
    }, delay);
  };
  scheduleBlink();
}

export function cancelIdleLoop() {
  idleLoopRunning = false;
}

// ──────────────────────────────────────────────
//  State transition: animate all shared values
// ──────────────────────────────────────────────

export function animateToState(v: PipAnimationValues, state: PipState) {
  const config = STATE_CONFIGS[state];

  // Reduced motion: set final values statically — no loops, no transitions.
  if (reduceMotionActive) {
    v.orbScale.value = config.orbScale;
    v.orbOpacity.value = config.opacity;
    v.glowIntensity.value = config.glowIntensity;
    v.particleOpacity.value = config.particleOpacity;
    v.tailOpacity.value = config.tailOpacity;
    v.sparkleOpacity.value = 0;
    v.floatOffset.value = 0;
    v.posX.value = 0;
    return;
  }

  const ease = Easing.inOut(Easing.sin);

  // Core values
  v.orbScale.value = withTiming(config.orbScale, {
    duration: config.transitionInMs,
    easing: ease,
  });
  v.orbOpacity.value = withTiming(config.opacity, {
    duration: config.transitionInMs,
    easing: ease,
  });
  v.glowIntensity.value = withTiming(config.glowIntensity, {
    duration: config.transitionInMs,
    easing: ease,
  });

  // Particles
  v.particleOpacity.value = withTiming(config.particleOpacity, {
    duration: config.transitionInMs + 100,
    easing: ease,
  });
  v.particleMode.value = state;

  // Tail
  v.tailOpacity.value = withTiming(config.tailOpacity, {
    duration: config.transitionInMs,
    easing: ease,
  });

  // Sparkle (brief for remembered/success per spec)
  if (state === "remembered" || state === "success") {
    v.sparkleOpacity.value = withSequence(
      withTiming(config.sparkleOpacity, { duration: 200, easing: Easing.out(Easing.sin) }),
      withTiming(0, { duration: state === "success" ? 800 : 500, easing: Easing.in(Easing.sin) }),
    );
  } else {
    v.sparkleOpacity.value = withTiming(0, { duration: 250, easing: ease });
  }

  // Idle loop restart
  cancelIdleLoop();
  startIdleLoop(v, config);

  // For "remembered" — return to idle after designer spec duration (~2s hold + transition)
  if (state === "remembered") {
    setTimeout(() => {
      if (v.orbOpacity.value > 0.8) {
        animateToState(v, "idle");
      }
    }, 2800); // 2s hold + 800ms transition
  }

  // For "success" — return to idle after designer spec duration (~2s)
  if (state === "success") {
    setTimeout(() => {
      if (v.orbOpacity.value > 0.8) {
        animateToState(v, "idle");
      }
    }, 2000);
  }
}

// ──────────────────────────────────────────────
//  Signature "I've got it" animation
//  Designer spec section 7 — frame-by-frame storyboard
// ──────────────────────────────────────────────

/**
 * Plays the signature animation — 9-phase storyboard:
 * 1. Particle emerges (0-300ms)
 * 2. PIP notices + tilts (300-600ms)
 * 3. Particle drifts toward PIP (600-900ms)
 * 4. Particle dissolves into PIP (900-1500ms)
 * 5. PIP brightens (1500-2000ms)
 * 6. Smile + settle back (2000-2600ms)
 * Total: ~2.6 seconds (was 1.5s)
 */
export function playSignatureAnimation(
  v: PipAnimationValues,
  onComplete?: () => void,
) {
  // Reduced motion: no catch choreography — just settle and notify.
  if (reduceMotionActive) {
    animateToState(v, "idle");
    onComplete?.();
    return;
  }

  const config = STATE_CONFIGS.remembered;

  // Phase 1-3: Orb gently scales up as particle approaches
  v.orbOpacity.value = withSequence(
    withTiming(0.9,  { duration: 500, easing: Easing.out(Easing.sin) }),
    withTiming(1.0,  { duration: 400, easing: Easing.in(Easing.sin) }),
  );

  v.orbScale.value = withSequence(
    withTiming(26 / 24, { duration: 600, easing: Easing.out(Easing.sin) }),
    withTiming(config.orbScale, { duration: 300, easing: Easing.out(Easing.sin) }),
  );

  // Phase 4-5: Glow builds and releases
  v.glowIntensity.value = withSequence(
    withTiming(0.45, { duration: 800, easing: Easing.out(Easing.sin) }),
    withTiming(0.7,  { duration: 300, easing: Easing.out(Easing.sin) }),
    withTiming(0.35, { duration: 900, easing: Easing.in(Easing.sin) }),
  );

  // Phase 6: Sparkle + particles settle
  v.sparkleOpacity.value = withSequence(
    withTiming(0,   { duration: 1500, easing: Easing.linear }),
    withTiming(0.8, { duration: 300, easing: Easing.out(Easing.sin) }),
    withTiming(0,   { duration: 800, easing: Easing.in(Easing.sin) }),
  );

  v.particleOpacity.value = withSequence(
    withTiming(1.0,  { duration: 600, easing: Easing.out(Easing.sin) }),
    withTiming(0.95, { duration: 600, easing: Easing.linear }),
    withTiming(0.6,  { duration: 800, easing: Easing.in(Easing.sin) }),
  );

  v.tailOpacity.value = withSequence(
    withTiming(0.45, { duration: 400, easing: Easing.out(Easing.sin) }),
    withTiming(0.2,  { duration: 1200, easing: Easing.in(Easing.sin) }),
  );

  // Phase 7: Return to idle after full sequence (~2.6s)
  setTimeout(() => {
    animateToState(v, "idle");
    onComplete?.();
  }, 2600);
}

// ──────────────────────────────────────────────
//  usePipStyles: converts shared values to styles
// ──────────────────────────────────────────────

export function usePipStyles(v: PipAnimationValues) {
  return {
    orbContainerStyle: {
      transform: [
        { translateY: v.floatOffset },
        { translateX: v.posX },
      ],
      // Combine scale, opacity into a wrapper opacity-driven approach
    },
    orbGlowStyle: {
      opacity: v.glowIntensity,
      transform: [{ scale: v.orbScale }],
    } as const,
    tailStyle: {
      opacity: v.tailOpacity,
    } as const,
    particlesStyle: {
      opacity: v.particleOpacity,
    } as const,
    sparkleStyle: {
      opacity: v.sparkleOpacity,
    } as const,
  };
}
