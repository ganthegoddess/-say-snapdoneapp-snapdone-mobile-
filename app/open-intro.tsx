import { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  AccessibilityInfo,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { PipWisp } from "../src/components/PipWisp";

/**
 * PIP-first open experience (bn23) — the app OPENS to PIP alone.
 *
 * This is an identity moment, not a feature: the first thing a user meets is
 * the companion, not an interface. PIP floats, breathes and blinks on a calm
 * near-white screen with NO capture pills, NO copy, NO tab bar. Only after the
 * user taps PIP does he float upward and the Home UI fades in beneath him.
 *
 * Spec: /home/team/shared/APP-OPEN-INTRO.md
 *
 * Reuses the existing `PipWisp` component verbatim — canonical pip-300px.png
 * composited (never redrawn), the owner-approved idle loop (float ±4pt ~3s,
 * drift ±3pt ~7s, breathing glow) and the owner-approved eyelid blink. That is
 * the single, already-shipped PIP rendering path; this screen does not fork it.
 */

const PIP_SIZE = 300;

export default function OpenIntroScreen() {
  const { height } = useWindowDimensions();

  // 0 = open (PIP centered) → 1 = revealed (PIP floated up, Home beneath)
  const reveal = useSharedValue(0);

  // Reduced-motion + double-tap guards
  const reduceMotion = useRef(false);
  const isRevealing = useRef(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (mounted) reduceMotion.current = on;
    });
    return () => {
      mounted = false;
    };
  }, []);

  // How far PIP rises: from the vertical center to the top region where the
  // Home hero PIP sits. Centered top = (height - size) / 2; target ≈ just below
  // the status bar (72dp). Clamped so small screens still get a visible rise.
  const rise = Math.max(140, (height - PIP_SIZE) / 2 - 72);

  const pipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -rise * reveal.value }],
  }));

  const handleTap = () => {
    // Single tap only — taps during the transition are ignored.
    if (isRevealing.current) return;
    isRevealing.current = true;

    // Reduced motion: no float/rise — a single quiet hand-off to Home.
    if (reduceMotion.current) {
      router.replace("/(tabs)");
      return;
    }

    // Spec §2: PIP floats up 720 → 390 over ~350ms, Easing.out(Easing.cubic).
    // Home then mounts and its existing Reveal (greeting + staggered pills)
    // provides the "UI fades in beneath" cascade.
    reveal.value = withTiming(
      1,
      { duration: 350, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) router.replace("/(tabs)");
      }
    );
  };

  return (
    <View style={styles.container}>
      {/* Calm near-white wash (#FCFFFD → #FFFFFF) — mirrors the site hero. */}
      <LinearGradient
        colors={["#FCFFFD", "#FFFFFF"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Faint teal radial wash at the top — never a loud color block. */}
      <LinearGradient
        colors={["rgba(8,145,178,0.08)", "rgba(8,145,178,0)"]}
        style={styles.topWash}
        pointerEvents="none"
      />

      {/* The only affordance is PIP himself — floating and blinking. */}
      <View style={styles.pipCentered} pointerEvents="box-none">
        <Animated.View style={pipAnimatedStyle}>
          <Pressable
            onPress={handleTap}
            hitSlop={20}
            accessibilityRole="button"
            accessibilityLabel="Open SnapDone"
          >
            <PipWisp state="idle" size={PIP_SIZE} background="light" inline />
          </Pressable>
        </Animated.View>
      </View>

      {/* Phase-2 reserved slot (~120dp) — an optional contextual greeting line
          lands here beneath PIP later. Intentionally empty in V1. */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  topWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  pipCentered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
