import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  AccessibilityInfo,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { PipWisp } from "../src/components/PipWisp";
import { Icon } from "../src/components/ui/icons";
import { colors } from "../src/constants/colors";
import { FEATURES } from "../src/constants/features";
import { greetingLine, HOME_CAPTURE_ACTIONS } from "../src/constants/pipCopy";
import { useAuthStore } from "../src/stores/authStore";

/**
 * PIP-first open experience (bn23) — the app OPENS to PIP alone.
 *
 * This is an identity moment, not a feature: the first thing a user meets is
 * the companion, not an interface. PIP floats, breathes and blinks on a calm
 * near-white screen with NO capture pills, NO copy, NO tab bar. Only after the
 * user taps PIP does he float upward and the Home UI fades in beneath him.
 *
 * Spec: /home/team/shared/APP-OPEN-INTRO.md (owner Aug 28)
 *
 * Reuses the existing `PipWisp` component verbatim — canonical pip-300px.png
 * composited (never redrawn), the owner-approved idle loop (float ±4pt ~3s,
 * drift ±3pt ~7s, breathing glow) and the owner-approved eyelid blink. That is
 * the single, already-shipped PIP rendering path; this screen does not fork it.
 *
 * Feature-flagged via FEATURES.OPEN_INTRO — false restores the legacy
 * authenticated cold start straight to Home.
 */
const PIP_SIZE = 300;
/** Settled PIP top edge (dp) — matches the Home hero PIP position (~72dp). */
const SETTLED_PIP_TOP = 72;

/** FILLED premium capture-pill fill (owner B direction): full-opacity brand tint gradient. */
function tintFill(base: string): [string, string] {
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  const deep = (c: number) => Math.round(c * 0.82);
  return [base, `rgb(${deep(r)},${deep(g)},${deep(b)})`];
}

export default function OpenIntroScreen() {
  const user = useAuthStore((s) => s.user);
  const { height } = useWindowDimensions();

  // ── Reveal shared values (all native driver) ────────────────────────────
  // rise  0→1 : PIP floats up 720 → 390 over ~350ms (spec §2).
  // settle 0→1 : gentle 1.03 → 1 settle over ~350ms (350–700ms).
  // panel 0→1 : greeting + pills fade in + rise 12→0 (120–500ms).
  const rise = useSharedValue(0);
  const settle = useSharedValue(0);
  const panel = useSharedValue(0);

  // Reduced-motion + double-tap + mounted guards
  const reduceMotion = useRef(false);
  const isRevealing = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (alive) reduceMotion.current = on;
    });
    return () => {
      alive = false;
      mounted.current = false;
    };
  }, []);

  // How far PIP rises: from the vertical center to the settled top region.
  // Clamped so small screens still get a visible rise.
  const riseDistance = Math.max(140, (height - PIP_SIZE) / 2 - SETTLED_PIP_TOP);

  const pipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -riseDistance * rise.value },
      // settle: 1.03 → 1 (spec §2, 350–700ms)
      { scale: 1 + 0.03 * (1 - settle.value) },
    ],
  }));

  const panelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: panel.value,
    transform: [{ translateY: 12 * (1 - panel.value) }],
  }));

  // Hand off to Home — a plain JS callback driven from the reveal's completion
  // (via runOnJS) so navigation never races the unmount. Guarded by `mounted`
  // and `isRevealing` so a cancelled/unmounted reveal can't navigate twice.
  const goHome = () => {
    if (!mounted.current || !isRevealing.current) return;
    router.replace("/(tabs)");
  };

  const handleTap = () => {
    // Single tap only — taps during the transition are ignored.
    if (isRevealing.current) return;
    isRevealing.current = true;

    // Reduced motion: no float/rise — a single quiet hand-off to Home.
    if (reduceMotion.current) {
      router.replace("/(tabs)");
      return;
    }

    // Spec §2 timing: PIP rises (0–350ms, cubic), settle (350–700ms), and the
    // greeting + pills fade in beneath (120–500ms, ease), staggered.
    rise.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    panel.value = withDelay(120, withTiming(1, { duration: 380, easing: Easing.out(Easing.ease) }));

    // Hand off to Home when the settle completes (~700ms total). Driven by the
    // animation's own completion callback on the UI thread (not a JS timer), so
    // navigation can't fire while the reveal is still animating — the race that
    // crashed bn22 when the JS timer beat the settle animation and the screen
    // unmounted mid-animation.
    settle.value = withDelay(
      350,
      withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) }, (finished) => {
        "worklet";
        if (finished) {
          runOnJS(goHome)();
        }
      }),
    );
  };

  // Settled greeting copy — the §3 canonical opener ("Share with me — I've got
  // it.") via the single copy source. Greetings remain Phase-2 for the open
  // state itself; this is the reveal content that lands beneath PIP.
  const g = greetingLine(user?.displayName, { memoryCount: 3, outstanding: 0, overdue: 0 });

  // Legacy behavior when the intro is switched off (Beta Freeze / kill switch).
  // Placed after every hook above, so the hook order stays constant.
  if (!FEATURES.OPEN_INTRO) {
    return <Redirect href="/(tabs)" />;
  }

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

      {/* Reveal content beneath PIP — greeting + 3 filled-gradient pills.
          Fades in as PIP floats up (spec §2). Non-interactive here; Home owns
          the interactive pills after the hand-off. */}
      <Animated.View
        style={[styles.revealPanel, panelAnimatedStyle]}
        pointerEvents="none"
      >
        <Text style={styles.greeting}>{g.greeting}</Text>
        <Text style={styles.headline}>{g.reassurance}</Text>
        <View style={styles.captureStack}>
          {HOME_CAPTURE_ACTIONS.map((a) => (
            <View key={a.key} style={styles.captureAction}>
              <LinearGradient
                colors={tintFill(a.tint)}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.capturePill}
              >
                <Icon name={a.icon} size={30} color="#FFFFFF" />
                <Text style={styles.captureLabel}>{a.label}</Text>
              </LinearGradient>
            </View>
          ))}
        </View>
      </Animated.View>
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
  revealPanel: {
    position: "absolute",
    left: 24,
    right: 24,
    top: SETTLED_PIP_TOP + PIP_SIZE + 24,
    alignItems: "center",
  },
  greeting: {
    fontSize: 30,
    color: colors.ink,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 36,
  },
  headline: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.muted,
    marginTop: 8,
    lineHeight: 24,
    textAlign: "center",
  },
  captureStack: { marginTop: 28, gap: 14, alignSelf: "stretch" },
  captureAction: {
    borderRadius: 28,
    shadowColor: "#0F2A33",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 5,
  },
  capturePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    borderRadius: 28,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  captureLabel: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.2 },
});
