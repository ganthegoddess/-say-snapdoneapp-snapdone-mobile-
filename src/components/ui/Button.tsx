import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from "react-native";
import { colors } from "../../constants/colors";
import { BrandGradient } from "./BrandGradient";
/**
 * ONE uniform button treatment (owner B direction, Aug 26):
 * EVERY button — every variant, every screen — is a FILLED premium brand
 * gradient (teal→green) with WHITE label text. No outlined buttons, no
 * transparent/ghost buttons, no dark-text buttons, no faded pills.
 * The only differentiation is destructive intent: `danger` uses a filled
 * red gradient (still white text). `secondary`/`ghost` are accepted for
 * call-site compatibility and render identically to `primary`.
 */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "lg" | "md" | "sm";
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: string;
}
const DANGER_GRADIENT = ["#F87171", "#DC2626"] as [string, string]; // red-400 → red-600
export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const isDanger = variant === "danger";
  return (
    <TouchableOpacity
      style={[styles.base, styles[`s_${size}`], fullWidth && styles.full, isDisabled && styles.dis]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      <BrandGradient
        style={styles.fill}
        colors={isDanger ? DANGER_GRADIENT : colors.gradient.colors}
        rounded={10}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <View style={styles.content}>
            {icon && <Text style={styles.icon}>{icon}</Text>}
            <Text style={[styles.text, styles[`ts_${size}`]]}>{title}</Text>
          </View>
        )}
      </BrandGradient>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    shadowColor: colors.brand.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  fill: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  full: { width: "100%" },
  dis: { opacity: 0.4 },
  s_lg: { height: 56 },
  s_md: { height: 48 },
  s_sm: { height: 40 },
  text: { fontWeight: "700" as const, color: "#FFFFFF" },
  ts_lg: { fontSize: 17 },
  ts_md: { fontSize: 15 },
  ts_sm: { fontSize: 13 },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
  icon: { fontSize: 20, color: "#FFFFFF" },
});