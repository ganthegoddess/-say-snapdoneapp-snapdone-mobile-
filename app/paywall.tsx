import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { router } from "expo-router";
import { useCreateCheckout } from "../src/hooks/useSubscription";

export default function PaywallScreen() {
  const checkout = useCreateCheckout();

  const handleSubscribe = async (planType: "monthly" | "annual" | "household") => {
    try {
      const result = await checkout.mutateAsync(planType);
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
        <Text style={styles.subtitle}>Unlimited captures, household sharing, and more</Text>
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
            <Text style={styles.feature}>✓ 10 captures / month</Text>
            <Text style={styles.feature}>✓ 5 active actions</Text>
            <Text style={styles.feature}>✗ Household sharing</Text>
            <Text style={styles.feature}>✗ Calendar sync</Text>
          </View>
        </View>

        {/* Monthly tier */}
        <View style={[styles.tierCard, styles.tierCardHighlighted]}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Most Popular</Text>
          </View>
          <Text style={styles.tierName}>Monthly</Text>
          <Text style={styles.tierPrice}>$7.99</Text>
          <Text style={styles.tierPeriod}>per month</Text>
          <View style={styles.featureList}>
            <Text style={styles.feature}>✓ Unlimited captures</Text>
            <Text style={styles.feature}>✓ Unlimited actions</Text>
            <Text style={styles.feature}>✓ Calendar sync</Text>
            <Text style={styles.feature}>✗ Household sharing</Text>
          </View>
          <TouchableOpacity
            style={[styles.subscribeButton, checkout.isPending && styles.subscribeButtonDisabled]}
            onPress={() => handleSubscribe("monthly")}
            disabled={checkout.isPending}
          >
            {checkout.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.subscribeText}>Subscribe</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Annual tier */}
        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Annual</Text>
          <Text style={styles.tierPrice}>$44.99</Text>
          <Text style={styles.tierPeriod}>per year ($3.75/mo)</Text>
          <View style={styles.featureList}>
            <Text style={styles.feature}>✓ Unlimited captures</Text>
            <Text style={styles.feature}>✓ Unlimited actions</Text>
            <Text style={styles.feature}>✓ Calendar sync</Text>
            <Text style={styles.feature}>✗ Household sharing</Text>
          </View>
          <TouchableOpacity
            style={[styles.subscribeButton, checkout.isPending && styles.subscribeButtonDisabled]}
            onPress={() => handleSubscribe("annual")}
            disabled={checkout.isPending}
          >
            {checkout.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.subscribeText}>Subscribe</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Household tier */}
        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Household</Text>
          <Text style={styles.tierPrice}>$49.99</Text>
          <Text style={styles.tierPeriod}>per year (up to 4 members)</Text>
          <View style={styles.featureList}>
            <Text style={styles.feature}>✓ Everything in Annual</Text>
            <Text style={styles.feature}>✓ Up to 4 members</Text>
            <Text style={styles.feature}>✓ Shared lists & chores</Text>
            <Text style={styles.feature}>✓ Shared calendar</Text>
          </View>
          <TouchableOpacity
            style={[styles.subscribeButton, checkout.isPending && styles.subscribeButtonDisabled]}
            onPress={() => handleSubscribe("household")}
            disabled={checkout.isPending}
          >
            {checkout.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.subscribeText}>Subscribe</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.skipButton} onPress={() => router.back()}>
        <Text style={styles.skipText}>Continue with Free plan</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { alignItems: "center", paddingTop: 60, paddingBottom: 24, paddingHorizontal: 24 },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", color: "#0F172A", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#64748B", textAlign: "center" },
  comparison: { paddingHorizontal: 16, gap: 16 },
  tierCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E2E8F0" },
  tierCardHighlighted: { borderColor: "#0891B2", borderWidth: 2 },
  badge: { backgroundColor: "#0891B2", alignSelf: "center", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  badgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  tierName: { fontSize: 20, fontWeight: "700", color: "#0F172A", textAlign: "center" },
  tierPrice: { fontSize: 36, fontWeight: "800", color: "#0F172A", textAlign: "center", marginTop: 8 },
  tierPeriod: { fontSize: 14, color: "#64748B", textAlign: "center", marginBottom: 16 },
  featureList: { gap: 8, marginBottom: 16 },
  feature: { fontSize: 15, color: "#1E293B" },
  subscribeButton: { backgroundColor: "#0891B2", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  subscribeButtonDisabled: { opacity: 0.6 },
  subscribeText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  skipButton: { paddingVertical: 20, alignItems: "center", marginBottom: 20 },
  skipText: { fontSize: 15, color: "#64748B", fontWeight: "600" },
  errorBar: { backgroundColor: "#FEE2E2", marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 8 },
  errorText: { color: "#B91C1C", fontSize: 14, textAlign: "center" },
});