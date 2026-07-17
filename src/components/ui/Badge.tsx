import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors } from "../../constants/colors";

type BadgeVariant = "primary" | "success" | "warning" | "error" | "neutral";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: colors.brand.light, text: colors.brand.dark },
  success: { bg: "#D1FAE5", text: "#065F46" },
  warning: { bg: "#FEF3C7", text: "#92400E" },
  error: { bg: "#FEE2E2", text: "#991B1B" },
  neutral: { bg: "#F1F5F9", text: "#475569" },
};

export function Badge({ label, variant = "primary", size = "md" }: BadgeProps) {
  const v = VARIANT_STYLES[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <Text style={[styles.text, { color: v.text }, size === "sm" && styles.textSm]}>
        {label}
      </Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    pending: "warning",
    confirmed: "success",
    dismissed: "neutral",
    completed: "success",
    active: "primary",
  };
  return <Badge label={status} variant={map[status] || "neutral"} size="sm" />;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  text: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  textSm: { fontSize: 10 },
});