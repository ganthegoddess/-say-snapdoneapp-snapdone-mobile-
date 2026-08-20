/**
 * LimitReachedScreen — friendly free-tier 30-capture limit surface.
 *
 * Shown when the capture API returns HTTP 402 / code "upgrade_required"
 * (the free tier's monthly 30-memory cap). This is SnapDone's conversion
 * moment, so it is warm and on-brand with PIP's voice — never an error tone.
 *
 * Behavior:
 *  - "Upgrade to Premium" → routes to the existing /paywall screen (Stripe
 *    live checkout is wired there).
 *  - "Not now" → dismisses gracefully (backs out of the dead capture flow).
 */

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { router } from "expo-router";
import { colors } from "../../constants/colors";
import { PipWisp } from "../PipWisp";
import { trackEvent } from "../../lib/posthog";

interface LimitReachedScreenProps {
  /** Optional explicit dismiss handler. Defaults to router.back(). */
  onDismiss?: () => void;
  /** Show the "Not now" dismiss action (default: true). */
  showBack?: boolean;
}

export default function LimitReachedScreen({
  onDismiss,
  showBack = true,
}: LimitReachedScreenProps) {
  const handleUpgrade = () => {
    trackEvent("limit_reached_upgrade_tapped", {});
    router.push("/paywall");
  };

  const handleDismiss = () => {
    trackEvent("limit_reached_dismissed", {});
    if (onDismiss) {
      onDismiss();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* PIP — calm, trusted */}
        <View style={styles.pipWrap}>
          <PipWisp state="idle" position="center-screen" size={72} background="light" />
        </View>

        <Text style={styles.headline}>You've filled your first 30.</Text>
        <Text style={styles.body}>
          That's 30 little moments SnapDone is holding on to for you — so you don't have to
          carry them all in your head.
          {"\n\n"}
          Premium keeps the whole year within reach: unlimited memories, smart SnapBack
          at just the right moment, and the everyday things you care about, all in one place.
        </Text>

        <View style={styles.bullets}>
          <Text style={styles.bullet}>✓ Unlimited memories — no monthly cap</Text>
          <Text style={styles.bullet}>✓ Smart SnapBack at the right moment</Text>
          <Text style={styles.bullet}>✓ Shared memories with your household</Text>
        </View>

        <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade}>
          <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
        </TouchableOpacity>

        {showBack && (
          <TouchableOpacity onPress={handleDismiss} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Not now</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  pipWrap: {
    marginBottom: 16,
  },
  headline: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.deep,
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    color: colors.text.muted,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  bullets: {
    gap: 8,
    marginBottom: 32,
    alignSelf: "stretch",
    paddingHorizontal: 8,
  },
  bullet: {
    fontSize: 15,
    color: colors.text.primary,
  },
  upgradeBtn: {
    backgroundColor: colors.brand.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignSelf: "stretch",
    alignItems: "center",
  },
  upgradeBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  dismissBtn: {
    paddingVertical: 18,
    alignItems: "center",
  },
  dismissText: {
    fontSize: 15,
    color: colors.text.muted,
    fontWeight: "600",
  },
});
