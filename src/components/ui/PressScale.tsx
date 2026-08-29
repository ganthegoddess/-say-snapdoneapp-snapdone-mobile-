import React from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface PressScaleProps {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Layout/style of the tappable surface (applied to the Pressable). */
  style?: StyleProp<ViewStyle>;
  /** Pressed scale target (default 0.97, App Motion Spec §1.4). */
  scaleTo?: number;
  accessibilityRole?: "button" | "link" | "none";
  accessibilityLabel?: string;
  children?: React.ReactNode;
}

/**
 * PressScale — the ONE press micro-interaction for every filled B button/pill.
 * Matches the site `active:scale-[0.97]`: scale →0.97 spring (damping 18,
 * stiffness 260) and restore on release. transform only (native driver).
 * Style is applied to the Pressable so width/fullWidth/shadow behave normally.
 */
export function PressScale({
  onPress,
  onLongPress,
  disabled,
  style,
  scaleTo = 0.97,
  accessibilityRole = "button",
  accessibilityLabel,
  children,
}: PressScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={style}
      onPressIn={() => {
        scale.value = withSpring(scaleTo, { damping: 18, stiffness: 260 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 260 });
      }}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}

export default PressScale;
