import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, spacing, borderRadius } from "../../constants/colors";
import { Pip } from "./Pip";
import { BrandGradient } from "./BrandGradient";

interface PipEmptyStateProps {
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}

/**
 * PipEmptyState — PIP-led, alive empty state (App Motion Spec §2).
 *
 * RESERVED layout (no overlap): a fixed PIP zone (~132px), a 16px gap, then the
 * copy. PIP runs the idle loop + soft glow — it is the warm "I'm here" presence,
 * never positioned over text. The CTA nests a button for the next step.
 */
export function PipEmptyState({ title, body, ctaLabel, onCta }: PipEmptyStateProps) {
  return (
    <View style={styles.container}>
      {/* PIP zone — reserved, alive */}
      <View style={styles.pipZone}>
        <Pip state="idle" size={112} />
      </View>
      {/* 16px gap then copy */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {ctaLabel && onCta && (
        <PipCta label={ctaLabel} onPress={onCta} />
      )}
    </View>
  );
}

function PipCta({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.ctaWrap}>
      <BrandGradient style={styles.cta} rounded={borderRadius.full} colors={colors.gradient.colors}>
        <Text style={styles.ctaText}>{label}</Text>
      </BrandGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: spacing.lg,
  },
  // PIP owns its zone — text never overlaps (advised fix).
  pipZone: {
    width: 140,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.deep,
    marginBottom: 8,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    color: colors.text.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  ctaWrap: { marginTop: spacing.lg },
  cta: { paddingVertical: 14, paddingHorizontal: 28, alignItems: "center" },
  ctaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
