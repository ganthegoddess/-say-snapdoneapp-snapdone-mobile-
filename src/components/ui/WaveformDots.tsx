/**
 * WaveformDots — Animated audio level indicator
 *
 * Used by both the Ask PIP microphone bar and the multimodal capture
 * recording UI. 5 dots that animate height at (simulated) voice amplitude.
 *
 * Design: cyan-600, 3px wide, staggered animation delays.
 * Matches the PIP design system — subtle, not flashy.
 */

import React, { useEffect, useRef, useMemo } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";

interface WaveformDotsProps {
  /** Whether recording is active (dots animate) or idle (dots still) */
  active?: boolean;
  /** Number of dots (default: 5). Use key={count} on parent for dynamic changes. */
  count?: number;
  /** Dot color (default: cyan-600) */
  color?: string;
  /** Max dot height in pixels (default: 24) */
  maxHeight?: number;
  /** Min dot height in pixels (default: 6) */
  minHeight?: number;
}

export function WaveformDots({
  active = false,
  count = 5,
  color = "#0891B2",
  maxHeight = 24,
  minHeight = 6,
}: WaveformDotsProps) {
  const animValues = useMemo(
    () => Array.from({ length: count }, () => new Animated.Value(minHeight)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count]
  );

  useEffect(() => {
    if (!active) {
      // Reset all dots to minimum height
      animValues.forEach((v) => {
        v.stopAnimation();
        v.setValue(minHeight);
      });
      return;
    }

    // Animate each dot with staggered looping
    const animations = animValues.map((anim, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(anim, {
            toValue: minHeight + Math.random() * (maxHeight - minHeight),
            duration: 250 + Math.random() * 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: minHeight,
            duration: 250 + Math.random() * 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
      loop.start();
      return loop;
    });

    return () => {
      animations.forEach((a) => a.stop());
    };
  }, [active]);

  return (
    <View style={styles.container} accessibilityLabel={active ? "Recording audio" : "Audio idle"}>
      {animValues.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: color,
              height: anim,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: 24,
  },
  dot: {
    width: 3,
    borderRadius: 1.5,
  },
});
