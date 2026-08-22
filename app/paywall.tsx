import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { router } from "expo-router";
import { colors, borderRadius, shadow } from "../src/constants/colors";
import { BrandGradient } from "../src/components/ui/BrandGradient";
import { useCreateCheckout } from "../src/hooks/useSubscription";
import { trackEvent } from "../src/lib/posthog";
import type { PlanType } from "../src/services/subscription";

interface Tier {
  key: PlanType;
  name: string;
  price: string;
  period: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const TIERS: Tier[] = [
  {
    key: "premium_monthly",
    name: "Premium",
    price: "$9.99",
    period: "per month",
    badge: "Most Popular",
    highlighted: true,
    features: [
      "✓ Unlimited memories",
      "✓ Smart SnapBack",
      "✓ Contextual recall",
      "✗ Household sharing",
    ],
  },
  {
    key: "premium_annual",
    name: "Premium Annual",
    price: "$99",
    period: "per year ($8.25/mo)",
    features: [
      "✓ Unlimited memories",
      "✓ Smart SnapBack",
      "✓ Contextual recall",
      "✗ Household sharing",
    ],
  },
  {
    key: "household_monthly",
    name: "Household",
    price: "$19.99",
    period: "per month (up to 3 people)",
    features: [
      "✓ Everything in Premium",
      "✓ Up to 3 people",
      "✓ Shared everything",
      "✓ Family SnapBacks",
    ],
  },
  {
    key: "household_annual",
    name: "Household Annual",
    price: "$199",
    period: "per year (up to 3 people)",
    features: [
      "✓ Everything in Premium",
      "✓ Up to 3 people",
      "✓ Shared everything",
      "✓ Family SnapBacks",
    ],
  },
  {
    key: "household_plus_monthly",
    name: "Household Plus",
    price: "$29.99",
    period: "per month (up to 6 people)",
    features: [
      "✓ Everything in Household",
      "✓ Up to 6 people",
      "✓ Grandparents included",
      "✓ Shared everything",
    ],
  },
  {
    key: "household_plus_annual",
    name: "Household Plus Annual",
    price: "$299",
    period: "per year (up to 6 people)",
    features: [
      "✓ Everything in Household",
      "✓ Up to 6 people",
      "✓ Grandparents included",
      "✓ Shared everything",
    ],
  },
];

export default function PaywallScreen() {
  const checkout = useCreateCheckout();

  const handleSubscribe = async (planType: PlanType) => {
    try {
      const result = await checkout.mutateAsync(planType);
      trackEvent("subscription_started", {
        to_tier: planType.startsWith("household_plus") ? "household_plus" : planType.startsWith("household") ? "household" : "premium",
        plan_type: planType,
      });
      if (result.checkout_url) {
        await Linking.openURL(result.checkout_url);
      }
    } catch {
      // Error handled by mutation state
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>⭐</Text>
        <Text style={styles.title}>Upgrade to SnapDone</Text>
        <Text style={styles.subtitle}>Unlimited memories, household sharing, and more</Text>
      </View>

      {checkout.isError && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>Failed to start checkout. Please try again.</Text>
        </View>
      )}

      {/* Feature comparison */}
      <View style={styles.comparison}>
        {/* Free tier */}
        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Free</Text>
          <Text style={styles.tierPrice}>$0</Text>
          <Text style={styles.tierPeriod}>forever</Text>
          <View style={styles.featureList}>
            <Text style={styles.feature}>✓ 30 memories / month</Text>
            <Text style={styles.feature}>✓ Basic SnapBack</Text>
            <Text style={styles.feature}>✗ Smart SnapBack</Text>
            <Text style={styles.feature}>✗ Household sharing</Text>
          </View>
        </View>

        {TIERS.map((tier) => (
          <View key={tier.key} style={[styles.tierCard, tier.highlighted && styles.tierCardHighlighted]}>
            {tier.badge && (
              <BrandGradient style={styles.badge} rounded={9999}>
                <Text style={styles.badgeText}>{tier.badge}</Text>
              </BrandGradient>
            )}
            <Text style={styles.tierName}>{tier.name}</Text>
            <Text style={styles.tierPrice}>{tier.price}</Text>
            <Text style={styles.tierPeriod}>{tier.period}</Text>
            <View style={styles.featureList}>
              {tier.features.map((f) => (
                <Text key={f} style={styles.feature}>{f}</Text>
              ))}
            </View>
            <TouchableOpacity
              style={[checkout.isPending && styles.subscribeButtonDisabled]}
              onPress={() => handleSubscribe(tier.key)}
              disabled={checkout.isPending}
            >
              <BrandGradient style={styles.subscribeButton} rounded={borderRadius.md}>
                {checkout.isPending ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.subscribeText}>Subscribe</Text>
                )}
              </BrandGradient>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.skipButton} onPress={() => router.back()}>
        <Text style={styles.skipText}>Continue with Free plan</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { alignItems: "center", paddingTop: 60, paddingBottom: 24, paddingHorizontal: 24 },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", color: colors.deep, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.text.muted, textAlign: "center" },
  comparison: { paddingHorizontal: 16, gap: 16 },
  tierCard: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: 20, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  tierCardHighlighted: { borderColor: colors.brand.primary, borderWidth: 2 },
  badge: { alignSelf: "center", paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  tierName: { fontSize: 20, fontWeight: "700", color: colors.deep, textAlign: "center" },
  tierPrice: { fontSize: 36, fontWeight: "800", color: colors.deep, textAlign: "center", marginTop: 8 },
  tierPeriod: { fontSize: 14, color: colors.text.muted, textAlign: "center", marginBottom: 16 },
  featureList: { gap: 8, marginBottom: 16 },
  feature: { fontSize: 15, color: colors.text.primary },
  subscribeButton: { paddingVertical: 14, alignItems: "center" },
  subscribeButtonDisabled: { opacity: 0.6 },
  subscribeText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  skipButton: { paddingVertical: 20, alignItems: "center", marginBottom: 20 },
  skipText: { fontSize: 15, color: colors.text.muted, fontWeight: "600" },
  errorBar: { backgroundColor: colors.error + "1A", marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 8 },
  errorText: { color: colors.error, fontSize: 14, textAlign: "center" },
});
