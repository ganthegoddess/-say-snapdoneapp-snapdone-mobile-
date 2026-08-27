import { useEffect, useRef, useState } from "react";
import { View, Image, StyleSheet, AccessibilityInfo } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  cancelAnimation,
  Easing,
  runOnJS,
} from "react-native-reanimated";

/**
 * Pip — the canonical, alive PIP (App Motion Language Spec v1.0 §0/§1).
 *
 * Composites the canonical `pip-300px.png` VERBATIM (owner lock B — never
 * redrawn). "Aliveness" is whole-orb transform motion on the composited image:
 *   - idle loop: gentle float (7s, ±3px), breathe (3.5s scale), random soft
 *     glow-blink every 6–14s.
 *   - state variants: idle / thinking / searching / remembered / catching via
 *     subtle scale + glow intensity.
 *   - playSignatureCatch(): the 9-phase "I've got it." catch translated to
 *     whole-orb transforms (no eye animation — deferred post-beta per §0).
 * Guardrail: transform/opacity only (native driver); respects
 * AccessibilityInfo.isReduceMotionEnabled (loops killed, still present).
 */
export type PipState = "idle" | "thinking" | "searching" | "remembered" | "catching";

interface PipProps {
  state?: PipState;
  size?: number;
  glowColor?: string;
  showCaption?: boolean;
  caption?: string;
  onCatchComplete?: () => void;
}

const ORB_SRC = require("../../assets/images/pip/pip-300px.png");

export function Pip({
  state = "idle",
  size = 120,
  glowColor = "#FCC870",
  showCaption = false,
  caption = "I've got it.",
  onCatchComplete,
}: PipProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  // ── Shared values (native driver) ──
  const floatY = useSharedValue(0);
  const breathe = useSharedValue(1);
  const glowOp = useSharedValue(0.55);
  const catchScale = useSharedValue(1);
  const catchTilt = useSharedValue(0);
  const entrance = useSharedValue(0);

  const onCatchCompleteRef = useRef(onCatchComplete);
  onCatchCompleteRef.current = onCatchComplete;

  // Respect reduce-motion: kill all loops.
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Entrance fade/rise on mount (single one-shot, allowed under reduce-motion).
  useEffect(() => {
    entrance.set(0);
    entrance.set(withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Idle loop — float (7s ±3px) + breathe (3.5s) + glow-blink (random 6–14s).
  useEffect(() => {
    if (reduceMotion || state !== "idle") {
      cancelAnimation(floatY);
      cancelAnimation(breathe);
      cancelAnimation(glowOp);
      floatY.set(0);
      breathe.set(1);
      glowOp.set(0.55);
      return;
    }
    floatY.set(
      withRepeat(
        withSequence(
          withTiming(-3, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
          withTiming(3, { duration: 7000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 3500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    breathe.set(
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 1750, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.98, { duration: 1750, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    glowOp.set(
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.5, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    // Random gentle glow-blink (6–14s) — one-shot via a JS timer that nudges glow.
    const blinkTimer = setInterval(() => {
      if (reduceMotion) return;
      glowOp.set(
        withSequence(
          withTiming(0.25, { duration: 200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.55, { duration: 400, easing: Easing.inOut(Easing.ease) })
        )
      );
    }, 6000 + Math.random() * 8000);
    return () => {
      cancelAnimation(floatY);
      cancelAnimation(breathe);
      cancelAnimation(glowOp);
      clearInterval(blinkTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, state]);

  // State-driven glow intensity.
  useEffect(() => {
    if (reduceMotion) return;
    const target = state === "remembered" ? 0.85 : state === "catching" ? 0.9 : state === "thinking" || state === "searching" ? 0.45 : 0.55;
    glowOp.set(withTiming(target, { duration: 800, easing: Easing.inOut(Easing.ease) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, reduceMotion]);

  // ── Signature catch — 9-phase whole-orb choreography (spec §1.3/§3) ──
  useEffect(() => {
    if (reduceMotion || state !== "catching") {
      cancelAnimation(catchScale);
      cancelAnimation(catchTilt);
      catchScale.set(1);
      catchTilt.set(0);
      return;
    }
    // Phase timings mirror site: notice/settle ~2.6s total.
    const t = (v: number, d: number, e = Easing.inOut(Easing.ease)) =>
      withTiming(v, { duration: d, easing: e });
    catchScale.set(
      withSequence(
        t(0.85, 250), // 1 particle emerges
        t(0.9, 250), // 2 notices + tilt
        t(0.92, 350), // 3 drifts
        t(1.0, 250), // 4 dissolves
        t(1.12, 300, Easing.out(Easing.cubic)), // 5 brightens
        withSpring(1, { damping: 14, stiffness: 220 }), // 6 settles + smile
        t(1.06, 200),
        t(1.0, 350) // 8/9 settled hold
      )
    );
    catchTilt.set(
      withSequence(
        t(0, 250),
        t(-4, 250), // notice tilt (degrees)
        t(-2, 350),
        t(0, 250),
        t(0, 300),
        t(0, 2600)
      )
    );
    const done = setTimeout(() => {
      runOnJS(onCatchCompleteRef.current?.() ?? (() => {}))();
    }, 2600);
    return () => {
      cancelAnimation(catchScale);
      cancelAnimation(catchTilt);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, reduceMotion]);

  // ── Animated styles ──
  const orbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { scale: breathe.value * catchScale.value },
      { rotate: `${catchTilt.value}deg` },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOp.value,
  }));
  const enterStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * 12 }],
  }));

  const wrapSize = size + (size * 0.22); // glow ring extends slightly
  return (
    <View style={[styles.root, { width: wrapSize, height: wrapSize }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow, { backgroundColor: glowColor }, glowStyle]} />
      <Animated.View style={[styles.orb, { width: size, height: size }, orbStyle, enterStyle]}>
        <Image source={ORB_SRC} style={{ width: size, height: size }} resizeMode="contain" />
      </Animated.View>
      {showCaption && (
        <View style={styles.captionWrap} pointerEvents="none">
          <Animated.Text style={[styles.caption, enterStyle]}>{caption}</Animated.Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    borderRadius: 999,
    transform: [{ scale: 0.82 }],
  },
  orb: {
    alignItems: "center",
    justifyContent: "center",
  },
  captionWrap: {
    position: "absolute",
    bottom: -22,
    alignSelf: "center",
    alignItems: "center",
  },
  caption: {
    fontSize: 15,
    fontWeight: "700",
    color: "#D97706",
  },
});
