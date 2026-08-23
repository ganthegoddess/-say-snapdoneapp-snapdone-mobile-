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
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
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
  type PipState,
  type PipPosition,
  POSITION_MAP,
} from "./animations";
import { PipParticlesLayer } from "./PipParticles";

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
//  Per-state orb sizes (designer spec section 4.3 — 15% smaller)
// ──────────────────────────────────────────────

const ORB_SIZES: Record<PipState, number> = {
  idle:      24,
  listening: 27,
  thinking:  26,
  searching: 26,
  remembered:29,
  success:   27,
};

const AURA_EXTENTS: Record<PipState, number> = {
  idle:      31,
  listening: 37,
  thinking:  36,
  searching: 34,
  remembered:41,
  success:   41,
};

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
}) => {
  const v = usePipAnimationValues();
  const { orbContainerStyle } = usePipStyles(v);
  const pos = POSITION_MAP[position];

  // Per-state dimensions
  const orbSize = ORB_SIZES[state];
  const auraSize = AURA_EXTENTS[state];
  const orbR = orbSize / 2;
  const auraR = auraSize / 2;
  const outerGlowR = auraR * 1.3;
  const particles = useMemo(
    () => makeParticles(PARTICLE_COUNTS[state], orbR),
    [state, orbR],
  );

  // ── Eye expression shared values (designer spec section 2.2) ──
  const leftEyeSquint = useSharedValue(1);
  const rightEyeSquint = useSharedValue(1);
  const eyeScanX = useSharedValue(0);

  // ── Particle frame for thinking-state orbit (45s per revolution) ──
  const [particleFrame, setParticleFrame] = useState(0);

  useEffect(() => {
    if (state !== "thinking") {
      setParticleFrame(0);
      return;
    }
    const ORBIT_MS = 45000;
    const TICK_MS = 200;
    const interval = setInterval(() => {
      setParticleFrame((prev) => (prev + TICK_MS / ORBIT_MS) % 1);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [state]);

  // Stable callback ref (prevents useEffect churn)
  const onCaughtRef = useRef(onCaught);
  onCaughtRef.current = onCaught;

  // ── State transition + auto-trigger signature animation ──
  const prevState = useRef<PipState>("idle");
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
    return () => cancelIdleLoop();
  }, [state, v]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelIdleLoop();
  }, []);

  // ── Gradient IDs (unique per instance) ──
  const glows = useMemo(() => ({
    aura: `a-${Math.random().toString(36).slice(2, 8)}`,
    core: `c-${Math.random().toString(36).slice(2, 8)}`,
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
          position: "absolute",
          ...pos,
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

      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* Outer aura gradient (lavender, designer spec section 8.3) */}
          <RadialGradient id={glows.aura} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={PIP_COLORS.outerGlow} stopOpacity={0.25} />
            <Stop offset="50%" stopColor={PIP_COLORS.outerGlow} stopOpacity={0.1} />
            <Stop offset="100%" stopColor={PIP_COLORS.outerGlow} stopOpacity={0} />
          </RadialGradient>
          {/* Core gradient (warm ivory → soft gold) */}
          <RadialGradient id={glows.core} cx="50%" cy="40%" r="50%">
            <Stop offset="0%" stopColor={PIP_COLORS.primaryGlow} stopOpacity={1} />
            <Stop offset="45%" stopColor={PIP_COLORS.innerCore} stopOpacity={0.9} />
            <Stop offset="100%" stopColor={PIP_COLORS.innerCore} stopOpacity={0.25} />
          </RadialGradient>
        </Defs>

        {/* Layer 1: Outer aura */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={outerGlowR}
          fill={`url(#${glows.aura})`}
          animatedProps={useAnimatedProps(() => ({
            opacity: v.glowIntensity.value * 0.6,
            r: outerGlowR * v.orbScale.value,
          }))}
        />

        {/* Layer 2: Primary glow */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={auraR}
          fill={PIP_COLORS.primaryGlow}
          animatedProps={useAnimatedProps(() => ({
            opacity: v.glowIntensity.value * 0.35,
            r: auraR * v.orbScale.value,
          }))}
        />

        {/* Layer 3: Inner core */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={orbR}
          fill={`url(#${glows.core})`}
          animatedProps={useAnimatedProps(() => ({
            opacity: v.orbOpacity.value,
            r: orbR * v.orbScale.value,
          }))}
        />

        {/* Rim definition line — non-negotiable for visibility on white */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={orbR + 1}
          fill="none"
          stroke={PIP_COLORS.rim}
          strokeWidth={0.8}
          animatedProps={useAnimatedProps(() => ({
            opacity: v.orbOpacity.value,
            r: (orbR + 1) * v.orbScale.value,
          }))}
        />

        {/* Eyes — all animated props in useAnimatedProps (incl. cx for scan) */}
        <AnimatedG
          animatedProps={useAnimatedProps(() => ({
            opacity: v.blink.value,
          }))}
        >
          {/* Left eye — cx driven by eyeScanX shared value inside worklet */}
          <AnimatedCircle
            cy={size / 2 - orbR * 0.12}
            fill={PIP_COLORS.eyeFill}
            animatedProps={useAnimatedProps(() => ({
              cx: size / 2 - orbR * 0.38 - eyeScanX.value,
              r: orbR * 0.2,
              opacity: 0.95,
              ry: orbR * 0.2 * leftEyeSquint.value,
            }))}
          />
          {/* Right eye */}
          <AnimatedCircle
            cy={size / 2 - orbR * 0.12}
            fill={PIP_COLORS.eyeFill}
            animatedProps={useAnimatedProps(() => ({
              cx: size / 2 + orbR * 0.38 - eyeScanX.value,
              r: orbR * 0.2,
              opacity: 0.95,
              ry: orbR * 0.2 * rightEyeSquint.value,
            }))}
          />
        </AnimatedG>

        {/* Pupils — website #B87828, added so PIP has the canonical alive gaze */}
        <AnimatedG
          animatedProps={useAnimatedProps(() => ({
            opacity: v.blink.value,
          }))}
        >
          <Circle
            cx={size / 2 - orbR * 0.38}
            cy={size / 2 - orbR * 0.12}
            r={orbR * 0.08}
            fill={PIP_COLORS.pupil}
          />
          <Circle
            cx={size / 2 + orbR * 0.38}
            cy={size / 2 - orbR * 0.12}
            r={orbR * 0.08}
            fill={PIP_COLORS.pupil}
          />
        </AnimatedG>

        {/* Mouth removed — eyes alone are stronger and more iconic (creative review) */}

        {/* Tail */}
        <AnimatedPath
          d={`
            M ${size / 2 - orbR * 0.35} ${size / 2 + orbR * 0.65}
            Q ${size / 2} ${size / 2 + orbR * 0.7 + orbR * 1.3} ${size / 2 + orbR * 0.4} ${size / 2 + orbR * 0.7 + orbR * 0.5}
            Q ${size / 2 + orbR * 0.1} ${size / 2 + orbR * 0.7 + orbR * 0.15} ${size / 2} ${size / 2 + orbR * 0.65}
            Q ${size / 2 - orbR * 0.1} ${size / 2 + orbR * 0.7 + orbR * 0.15} ${size / 2 - orbR * 0.4} ${size / 2 + orbR * 0.7 + orbR * 0.5}
            Q ${size / 2} ${size / 2 + orbR * 0.7 + orbR * 1.3} ${size / 2 + orbR * 0.35} ${size / 2 + orbR * 0.65}
            Z
          `}
          fill={PIP_COLORS.primaryGlow}
          animatedProps={useAnimatedProps(() => ({
            opacity: v.tailOpacity.value * 0.45,
          }))}
        />

        {/* Particles */}
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
            const len = orbR * 0.5;
            const ex = size / 2 + Math.cos(rad) * (orbR + 5);
            const ey = size / 2 + Math.sin(rad) * (orbR + 5);
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
    color: "#64748B",
    textAlign: "center",
  },
});
