import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from "react-native";
import { colors } from "../../constants/colors";

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

export function Button({ title, onPress, variant = "primary", size = "md", disabled = false, loading = false, fullWidth = false, icon }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.base, styles[`v_${variant}`], styles[`s_${size}`], fullWidth && styles.full, isDisabled && styles.dis]}
      onPress={onPress} disabled={isDisabled} activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "danger" ? "#FFF" : colors.brand.primary} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={[styles.text, styles[`t_${variant}`], styles[`ts_${size}`]]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", borderRadius: 10, flexDirection: "row" },
  full: { width: "100%" },
  dis: { opacity: 0.4 },
  v_primary: { backgroundColor: colors.brand.primary, shadowColor: colors.brand.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  v_secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.brand.primary },
  v_ghost: { backgroundColor: "transparent" },
  v_danger: { backgroundColor: colors.error },
  s_lg: { height: 56, paddingHorizontal: 24 },
  s_md: { height: 48, paddingHorizontal: 20 },
  s_sm: { height: 40, paddingHorizontal: 16 },
  text: { fontWeight: "700" as const },
  t_primary: { color: colors.white },
  t_secondary: { color: colors.brand.primary },
  t_ghost: { color: colors.text.primary },
  t_danger: { color: colors.white },
  ts_lg: { fontSize: 17 },
  ts_md: { fontSize: 15 },
  ts_sm: { fontSize: 13 },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
  icon: { fontSize: 20 },
});