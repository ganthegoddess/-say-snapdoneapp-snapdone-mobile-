import { LinearGradient } from "expo-linear-gradient";
import type { StyleProp, ViewStyle } from "react-native";
import { colors } from "../../constants/colors";

interface BrandGradientProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  colors?: readonly [string, string];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  rounded?: number;
}
/**
 * The signature teal→green "snap" gradient (matching the website's
 * linear-gradient(135deg, #0891B2 0%, #10B981 100%)). Primary buttons, the
 * capture FAB, and the active-tab indicator all use this — it is what makes
 * the app feel like the website.
 */
export function BrandGradient({
  style,
  children,
  colors: c = colors.gradient.colors,
  start = { x: 0.0, y: 0.0 },
  end = { x: 1.0, y: 1.0 },
  rounded,
}: BrandGradientProps) {
  const merged = [
    { overflow: "hidden" as const },
    ...(Array.isArray(style) ? style : [style]),
    rounded != null && { borderRadius: rounded },
  ];
  return (
    <LinearGradient colors={c} start={start} end={end} style={merged}>
      {children}
    </LinearGradient>
  );
}
