/**
 * PIP Memory Wisp — Main component
 *
 * A tiny floating wisp of light — as if a firefly, a candle flame,
 * and a tiny star had a baby. Made from warm energy rather than
 * physical material. Never solid, never heavy, always weightless.
 *
 * PIP is NOT an avatar, chatbot, or mascot. PIP is the physical
 * manifestation of memory itself — attention, remembrance, and
 * quiet protection.
 *
 * Authoritative spec: /home/team/shared/PIP-design-system.md
 * Business plan constraints: revision 67 — restraint over gimmicks.
 *
 * PIP COMPOSITING (DESIGN-SYSTEM §1.2, bn15): The character is the CANONICAL
 * pip-300px.png composited VERBATIM — it is NEVER redrawn from primitives.
 * The environment (aura glow, particles, sparkle) animates AROUND the asset.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Text, Image, AccessibilityInfo } from "react-native";
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  Path,
  G,
} from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  type SharedValue,
} from "react-native-reanimated";

import {
  usePipAnimationValues,
  animateToState,
  playSignatureAnimation,
  usePipStyles,
  cancelIdleLoop,
  setReduceMotion,
  type PipState,
  type PipPosition,
  POSITION_MAP,
} from "./animations";
import { PipParticlesLayer } from "./PipParticles";

// ──────────────────────────────────────────────
//  Canonical PIP asset (DESIGN-SYSTEM §1.2 — composited, NEVER redrawn)
// ──────────────────────────────────────────────
// The character is the locked canonical PNG extracted from the website.
// We composite it verbatim at the container size; only the environment
// (aura glow, particles, sparkle) is drawn around it.
const CANONICAL_PIP = require("../../assets/images/pip/pip-300px.png") as number;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ──────────────────────────────────────────────
//  PIP Color Palette (white-background spec — designer rev 2026-07-29)
// ──────────────────────────────────────────────

// DESIGN-SYSTEM §1.4 — palette aligned to the WEBSITE (PipWeb) EXACTLY.
// Primary glow #FCC870 · inner core #E89820 (bright #F0A838) · outer aura
// #BFA0F0 · eye fill #FFE0B0 · pupil #B87828 · particles warm #E8C898 +
// cool #D0B8FF. Replaces the old washed-out ivory. One PIP, one palette.
const PIP_COLORS = {
  primaryGlow: "#FCC870",       // website primary glow (was washed #FFF5D8)
  innerCore:  "#E89820",        // website inner core (was #FFD98A)
  innerCoreBright: "#F0A838",   // website bright core pull
  outerGlow:  "#BFA0F0",        // website outer lavender aura (was #B79CFF)
  particles:  "#E8C898",        // website warm particle
  particlesCool: "#D0B8FF",     // website cool lavender particle
  eyeFill:    "#FFE0B0",        // website eye fill
  pupil:      "#B87828",        // website eye pupil
  rim:        "rgba(160, 120, 60, 0.18)",  // Definition line — non-negotiable
  cardGlow:   "#FDB963",        // Card reflection color
} as const;

// ──────────────────────────────────────────────
//  Per-state particle counts (designer spec section 4.3)
// ──────────────────────────────────────────────
// NOTE (fidelity fix): the aura/glow/particle radii are NOT absolute "orb pt"
// anymore — they scale with the `size` prop (the canonical PNG is composited
// into the full container). The canonical pip-300px.png carries its solid
// character in the central ~40% of the canvas, so the ambient halo and
// particles are sized relative to `size` below.
const PARTICLE_COUNTS: Record<PipState, number> = {
  idle:      3,
  listening: 8,
  thinking:  10,
  searching: 13,
  remembered:18,
  success:   8,
};

// ──────────────────────────────────────────────
//  Relationship-aware copy (business plan rev 67)
// ──────────────────────────────────────────────

export type RelationshipStage = "new" | "trusted" | "familiar";

const CAPTION_BY_STAGE: Record<RelationshipStage, string> = {
  new:       "I've got it.",
  trusted:   "I've been keeping an eye on that.",
  familiar:  "I thought you might need this today.",
};

// ──────────────────────────────────────────────
//  Particle generator
// ──────────────────────────────────────────────

interface ParticleDef {
  id: number;
  angle: number;
  distance: number;
  radius: number;
  opacity: number;
  color: string;
}

function makeParticles(count: number, orbRadius: number): ParticleDef[] {
  const colors = [
    PIP_COLORS.particles,      // warm beige
    PIP_COLORS.particlesCool,  // soft lavender
    PIP_COLORS.primaryGlow,
    PIP_COLORS.innerCore,
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (360 / count) * i + Math.random() * 30,
    distance: orbRadius * 1.3 + Math.random() * orbRadius * 1.0,
    radius: 1.0 + Math.random() * 1.6,
    opacity: 0.35 + Math.random() * 0.5,
    color: colors[i % colors.length],
  }));
}

// ──────────────────────────────────────────────
//  Props
// ──────────────────────────────────────────────

export interface PipWispProps {
  /** Current animation state */
  state?: PipState;
  /** Where PIP should be positioned on screen */
  position?: PipPosition;
  /** Container size in dp (touch target, default: 38) */
  size?: number;
  /** Show the caption under PIP (uses relationship stage for text) */
  showCaption?: boolean;
  /** Relationship stage for copy — "new" | "trusted" | "familiar" (default: "new") */
  relationshipStage?: RelationshipStage;
  /** Callback after signature "I've got it" animation completes */
  onCaught?: () => void;
  /** Show PIP (default: true) */
  visible?: boolean;
  /** Z-index (default: 100) */
  zIndex?: number;
  /** Background context: "dark" | "light" — affects rim rendering */
  background?: "dark" | "light";
  /**
   * Render PIP in-flow (position: relative) instead of absolutely-positioned
   * overlay offsets. Used for the Home hero so it lays out centered inside its
   * parent without the absolute top/left + fixed marginLeft offsets that were
   * misplacing the ~300pt hero off-axis. (default: false = absolute overlay)
   */
  inline?: boolean;
}

// ──────────────────────────────────────────────
//  Component
// ──────────────────────────────────────────────

export const PipWisp: React.FC<PipWispProps> = ({
  state = "idle",
  position = "top-right",
  size = 38,
  showCaption = false,
  relationshipStage = "new",
  onCaught,
  visible = true,
  zIndex = 100,
  inline = false,
}) => {
  const v = usePipAnimationValues();
  const { orbContainerStyle } = usePipStyles(v);
  const pos = POSITION_MAP[position];

  // Per-state dimensions — scale with `size` (the canonical PNG fills the
  // container). The solid character occupies the central ~40% of the canvas:
  //   charRadius ≈ size * 0.22  (visual radius of the character)
  //   haloR      ≈ size * 0.50  (ambient halo behind the character)
  const charRadius = size * 0.22;
  const haloR = size * 0.5;
  const particles = useMemo(
    () => makeParticles(PARTICLE_COUNTS[state], charRadius),
    [state, charRadius],
  );

  // ── Eye expression shared values (designer spec section 2.2) ──
  const leftEyeSquint = useSharedValue(1);
  const rightEyeSquint = useSharedValue(1);
  const eyeScanX = useSharedValue(0);

  // ── Particle frame: ambient drift (idle) + orbit (thinking) ──
  // The frame advances only for states whose particles animate. Previously only
  // "thinking" advanced it, so a PIP mounting into "idle" kept frame at 0 and
  // the 3 glow dots never moved.
  const [particleFrame, setParticleFrame] = useState(0);

  useEffect(() => {
    // One full 0→1 frame cycle per state (ms). Idle = gentle ambient drift;
    // thinking keeps the designer's 45s orbit.
    const CYCLE_MS: Partial<Record<PipState, number>> = {
      idle: 12000,
      thinking: 45000,
    };
    const cycleMs = CYCLE_MS[state];
    if (!cycleMs) {
      setParticleFrame(0);
      return;
    }
    const TICK_MS = 200;
    const interval = setInterval(() => {
      setParticleFrame((prev) => (prev + TICK_MS / cycleMs) % 1);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [state]);

  // Stable callback ref (prevents useEffect churn)
  const onCaughtRef = useRef(onCaught);
  onCaughtRef.current = onCaught;

  // ── State transition + auto-trigger signature animation ──
  // prevState starts null so the FIRST run always fires (mounts directly into
  // "idle" would otherwise be skipped by the `from !== state` guard, leaving
  // the idle loop never started and the homescreen PIP frozen).
  const prevState = useRef<PipState | null>(null);
  useEffect(() => {
    const from = prevState.current;
    if (from !== state) {
      animateToState(v, state);
      animateEyes(state, leftEyeSquint, rightEyeSquint, eyeScanX);

      // Auto-trigger signature animation when capture transitions to remembered
      const wasCapturing = from === "listening" || from === "thinking";
      if (wasCapturing && state === "remembered") {
        playSignatureAnimation(v, onCaughtRef.current);
      }

      prevState.current = state;
    }
    return () => cancelIdleLoop(v);
  }, [state, v]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelIdleLoop(v);
  }, [v]);

  // Respect device reduce-motion: suppress all loops/one-shots so PIP stays a
  // calm static presence (App Motion Spec §6). The flag is read by the
  // animation engine (startIdleLoop / animateToState / playSignatureAnimation).
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (!mounted) return;
      setReduceMotion(on);
    });
    return () => {
      mounted = false;
      setReduceMotion(false);
    };
  }, []);

  // ── Gradient IDs (unique per instance) ──
  const glows = useMemo(() => ({
    aura: `a-${Math.random().toString(36).slice(2, 8)}`,
  }), []);

  const captionText = CAPTION_BY_STAGE[relationshipStage];

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          zIndex,
          position: inline ? "relative" : "absolute",
          ...(inline ? {} : pos),
        },
        orbContainerStyle,
      ]}
    >
      {/* Caption (designer spec section 7.2 + business plan rev 67) */}
      {showCaption && (
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>{captionText}</Text>
        </View>
      )}

      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Outer aura gradient (lavender, designer spec section 8.3) */}
          <RadialGradient id={glows.aura} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={PIP_COLORS.outerGlow} stopOpacity={0.25} />
            <Stop offset="50%" stopColor={PIP_COLORS.outerGlow} stopOpacity={0.1} />
            <Stop offset="100%" stopColor={PIP_COLORS.outerGlow} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Layer 1: Ambient halo — ONE soft radial layer BEHIND the canonical
            asset (subtle glow only, no double-glow). The PNG already bakes in
            its own warm glow + lavender aura; this is the gentle "alive" breathe
            field that animates behind it. */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={haloR}
          fill={`url(#${glows.aura})`}
          animatedProps={useAnimatedProps(() => ({
            // glowIntensity sets the ambient base; pulseValue adds the slow
            // "breathing" oscillation so the aura visibly lives (designer spec
            // §2.4 — breathing glow). Both stay positive for every state config.
            opacity: (v.glowIntensity.value + v.pulseValue.value) * 0.55,
            r: haloR * v.orbScale.value,
          }))}
        />
      </Svg>

      {/* Canonical PIP character — composited VERBATIM (DESIGN-SYSTEM §1.2).
          The locked pip-300px.png is NOT redrawn; it is the character itself.
          The aura glow above sits behind it, particles/sparkle in front. */}
      <Image
        source={CANONICAL_PIP}
        style={[styles.pipCharacter, { width: size, height: size }]}
        resizeMode="contain"
        fadeDuration={0}
      />

      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        {/* Particles — orbit AROUND the composited character */}
        <AnimatedG
          animatedProps={useAnimatedProps(() => ({
            opacity: v.particleOpacity.value,
          }))}
        >
          <PipParticlesLayer
            width={size}
            particles={particles}
            rotationDeg={0}
            state={state}
            frame={particleFrame}
          />
        </AnimatedG>

        {/* Sparkle for remembered/success */}
        <AnimatedG
          animatedProps={useAnimatedProps(() => ({
            opacity: v.sparkleOpacity.value,
          }))}
        >
          {[0, 72, 144, 216, 288].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const len = charRadius * 0.5;
            const ex = size / 2 + Math.cos(rad) * (charRadius * 1.5);
            const ey = size / 2 + Math.sin(rad) * (charRadius * 1.5);
            return (
              <AnimatedPath
                key={angle}
                d={`M ${ex - Math.cos(rad + 0.35) * len} ${ey - Math.sin(rad + 0.35) * len} L ${ex + Math.cos(rad) * len * 1.4} ${ey + Math.sin(rad) * len * 1.4} L ${ex + Math.cos(rad - 0.35) * len} ${ey + Math.sin(rad - 0.35) * len}`}
                stroke={PIP_COLORS.primaryGlow}
                strokeWidth={0.8}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}
        </AnimatedG>
      </Svg>
    </Animated.View>
  );
};

// ──────────────────────────────────────────────
//  Eye expression animations (designer spec 2.2)
//  Uses withSequence/withDelay — no setTimeout
// ──────────────────────────────────────────────

function animateEyes(
  state: PipState,
  left: SharedValue<number>,
  right: SharedValue<number>,
  scanX: SharedValue<number>,
) {
  // Cancel any running eye animations
  left.value = withTiming(1, { duration: 200 });
  right.value = withTiming(1, { duration: 200 });
  scanX.value = withTiming(0, { duration: 200 });

  switch (state) {
    case "idle":
      break;
    case "listening":
      left.value = withTiming(1.1, { duration: 250 });
      right.value = withTiming(1.1, { duration: 250 });
      break;
    case "thinking":
      right.value = withTiming(0.5, { duration: 250 });
      scanX.value = withTiming(-1.5, { duration: 300 });
      break;
    case "searching":
      // Slow side-to-side scan via Reanimated sequence (no setTimeout)
      scanX.value = withSequence(
        withTiming(-3, { duration: 500, easing: Easing.inOut(Easing.sin) }),
        withTiming(3,  { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,  { duration: 500, easing: Easing.inOut(Easing.sin) }),
      );
      break;
    case "remembered":
      left.value = withTiming(1.15, { duration: 300 });
      right.value = withTiming(1.15, { duration: 300 });
      break;
    case "success":
      left.value = withTiming(1.2, { duration: 200 });
      right.value = withTiming(1.2, { duration: 200 });
      // Return to normal after 1.2s
      left.value = withDelay(1200, withTiming(1, { duration: 600 }));
      right.value = withDelay(1200, withTiming(1, { duration: 600 }));
      break;
  }
}

// ──────────────────────────────────────────────
//  Ambient glow component (designer spec 8.1)
// ──────────────────────────────────────────────

/**
 * PipGlow — a subtle warm reflection cast by PIP on nearby UI cards.
 * Place this as an overlay on cards that PIP sits beside.
 * Designer spec: radial gradient centered on PIP, #FFF5D8 at 3% opacity.
 */
export const PipGlow: React.FC<{
  intensity?: number;
  radius?: number;
}> = ({ intensity = 0.5, radius = 100 }) => {
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: 12,
          shadowColor: PIP_COLORS.cardGlow,
          shadowOffset: { width: -radius * 0.05, height: -radius * 0.1 },
          shadowOpacity: intensity * 0.08,
          shadowRadius: radius,
          elevation: 0,
        },
      ]}
      pointerEvents="none"
    />
  );
};

// ──────────────────────────────────────────────
//  Styles
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  // The composited canonical character — fills the container, centered.
  pipCharacter: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  captionContainer: {
    position: "absolute",
    bottom: -20,
    alignSelf: "center",
    alignItems: "center",
    width: 120,
  },
  caption: {
    fontSize: 14,
    fontFamily: "Inter",
    color: "#5B6B72",
    textAlign: "center",
  },
});
