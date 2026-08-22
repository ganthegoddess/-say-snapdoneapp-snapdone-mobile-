import { View, StyleSheet } from "react-native";
import { PipWisp } from "../PipWisp";
import { colors } from "../../constants/colors";

interface PipBadgeProps {
  size?: number;
  /** true = static idle wisp a calm anchor (empty/celebration cards). */
  static?: boolean;
}

/**
 * PipBadge — a small, non-animating wisp mark used as the visual anchor of
 * empty/celebration cards (PIP doc §1). Reuses the canonical `PipWisp` in a
 * calm `idle` state on a cream/brand-light panel — no motion on every glance.
 */
export function PipBadge({ size = 96 }: PipBadgeProps) {
  return (
    <View style={[styles.wrap, { width: size + 24, height: size + 24, borderRadius: (size + 24) / 2 }]}>
      <PipWisp state="idle" position="center-screen" size={size} background="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.warm.pipGlow,
    borderWidth: 1,
    borderColor: colors.warm.soft,
    shadowColor: colors.warm.amber,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 4,
  },
});
