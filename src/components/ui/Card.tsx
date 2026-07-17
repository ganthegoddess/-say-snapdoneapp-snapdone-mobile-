import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../constants/colors";

interface CardProps {
  title?: string;
  subtitle?: string;
  variant?: "default" | "highlighted" | "done";
  children?: React.ReactNode;
}

export function Card({ title, subtitle, variant = "default", children }: CardProps) {
  return (
    <View style={[styles.card, variant === "highlighted" && styles.highlighted, variant === "done" && styles.done]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  highlighted: { borderColor: colors.brand.primary, borderWidth: 2, borderLeftWidth: 4 },
  done: { opacity: 0.5, borderColor: colors.accent.complete, borderLeftWidth: 4, borderLeftColor: colors.accent.complete },
  title: { fontSize: 17, fontWeight: "700", color: colors.deep, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.text.muted, lineHeight: 20 },
});