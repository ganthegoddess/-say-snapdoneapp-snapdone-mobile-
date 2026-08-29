import React, { useEffect } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

interface RevealProps {
  /** Entrance delay in ms (staggered reveals use i * 120ms, capped 500ms). */
  delayMs?: number;
  /** Vertical rise distance in dp (default 12, App Motion Spec §1.5). */
  distance?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Reveal — the ONE card/greeting entrance (App Motion Spec §1.5/§1.6):
 * translateY 12→0 + opacity 0→1 + scale .98→1, 400ms Easing.out(Easing.ease).
 * transform/opacity only (native driver). One-shot, never loops.
 */
export function Reveal({ delayMs = 0, distance = 12, style, children }: RevealProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * distance },
      { scale: 0.98 + 0.02 * progress.value },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

export default Reveal;
