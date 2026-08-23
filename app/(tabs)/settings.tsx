import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Linking } from "react-native";
import { router } from "expo-router";
import { colors } from "../../src/constants/colors";
import { useAuthStore } from "../../src/stores/authStore";
import { BrandGradient } from "../../src/components/ui/BrandGradient";
import { Icon } from "../../src/components/ui/icons";
import { Avatar } from "../../src/components/ui/Avatar";
import { useLocationStore } from "../../src/stores/locationStore";
import { useSubscription } from "../../src/hooks/useSubscription";
import { useActions } from "../../src/hooks/useActions";
import { FREE_TIER } from "../../src/constants/api";

/** Human label + a single-line value for a plan key. Each tier stands on its own. */
function planLabel(tier: string | null): { title: string; sub: string } {
  switch (tier) {
    case "premium_monthly":
    case "premium_annual":
      return { title: "Premium Plan", sub: "Unlimited memory · Smart SnapBack" };
    case "household_monthly":
    case "household_annual":
      return { title: "Household Plan", sub: "Up to 3 people · shared everything" };
    case "household_plus_monthly":
    case "household_plus_annual":
      return { title: "Household Plus", sub: "Up to 6 people · grandparents" };
    default:
      return { title: "Free Plan", sub: "30 memories a month · basic SnapBack" };
  }
}

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const locationRemindersEnabled = useLocationStore((s) => s.locationRemindersEnabled);
  const setLocationRemindersEnabled = useLocationStore((s) => s.setLocationRemindersEnabled);
  const { data: sub } = useSubscription();
  const { data: actions } = useActions();
  const tier = sub?.plan_type ?? null;
  const tierInfo = planLabel(tier);
  const usageCount = actions?.length ?? 0;

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  const openTerms = () => Linking.openURL("https://snapdoneapp.com/terms");
  const openPrivacy = () => Linking.openURL("https://snapdoneapp.com/privacy");

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* Account — answers "Who am I logged in as?" */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Avatar name={user?.displayName || "?"} size={44} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.displayName || "—"}</Text>
              <Text style={styles.profileEmail}>{user?.email || "—"}</Text>
            </View>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <View style={styles.iconChip}><Icon name="mail" size={16} color={colors.brand.primary} /></View>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{user?.email || "—"}</Text>
          </View>
        </View>
      </View>

      {/* PIP — framed around PIP; AI stays invisible */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PIP</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowBorder]}>
            <View style={styles.iconChip}><Icon name="sparkle" size={16} color={colors.warm.amber} /></View>
            <View style={styles.rowTextStack}>
              <Text style={styles.rowLabel}>PIP Recognition accuracy</Text>
              <Text style={styles.rowSub}>PIP gets better at reading your handwriting and voice the more you use it.</Text>
            </View>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <View style={styles.iconChip}><Icon name="mic" size={16} color={colors.brand.primary} /></View>
            <Text style={styles.rowLabel}>Voice & Transcriptions</Text>
            <Text style={styles.rowLabelComingSoon}>Coming Soon</Text>
          </View>
          <View style={[styles.row]}>
            <View style={styles.iconChip}><Icon name="notifications" size={16} color={colors.brand.primary} /></View>
            <Text style={styles.rowLabel}>Location-based reminders</Text>
            <Switch
              value={locationRemindersEnabled}
              onValueChange={setLocationRemindersEnabled}
              trackColor={{ false: colors.border, true: colors.brand.primary + "60" }}
              thumbColor={locationRemindersEnabled ? colors.brand.primary : colors.text.muted}
            />
          </View>
        </View>
      </View>

      {/* Household */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Household</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.row]}
            onPress={() => router.push("/(tabs)/household")}
          >
            <View style={styles.iconChip}><Icon name="household" size={16} color={colors.brand.primary} /></View>
            <Text style={styles.rowLabel}>Manage Household</Text>
            <Icon name="chevron" size={18} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Subscription — reads the real tier + usage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <TouchableOpacity onPress={() => router.push("/paywall")}>
          <BrandGradient style={styles.upgradeCard} rounded={14}>
            <View style={styles.upgradeIconChip}><Icon name="sparkle" size={18} color="#FFFFFF" /></View>
            <View style={styles.upgradeInfo}>
              <Text style={styles.upgradeTitle}>{tierInfo.title}</Text>
              <Text style={styles.upgradeText}>{tierInfo.sub}</Text>
              <Text style={styles.usageText}>
                {tier ? "Unlimited memories" : `${usageCount} / ${FREE_TIER.MAX_CAPTURES_PER_MONTH} memories this month`}
              </Text>
            </View>
            <Icon name="chevron" size={18} color="rgba(255,255,255,0.85)" />
          </BrandGradient>
        </TouchableOpacity>
      </View>

      {/* About — Terms & Privacy navigate */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>0.1.0</Text>
          </View>
          <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={openTerms}>
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <Icon name="chevron" size={18} color={colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row]} onPress={openPrivacy}>
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <Icon name="chevron" size={18} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign out */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 24, paddingTop: 56 },
  title: { fontSize: 28, fontWeight: "800", color: colors.deep, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13, fontWeight: "600", color: colors.text.muted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginLeft: 4,
  },
  card: { backgroundColor: colors.white, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTextStack: { flex: 1 },
  rowSub: { fontSize: 12, color: colors.text.muted, marginTop: 2, lineHeight: 17 },
  // Profile header
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: "700", color: colors.deep },
  profileEmail: { fontSize: 13, color: colors.text.muted, marginTop: 2 },
  rowLabel: { fontSize: 15, color: colors.text.primary, flex: 1 },
  rowValue: { fontSize: 15, color: colors.text.muted },
  iconChip: {
    width: 30, height: 30, borderRadius: 15, marginRight: 12,
    backgroundColor: colors.brand.light, alignItems: "center", justifyContent: "center",
  },
  rowLabelComingSoon: { fontSize: 13, color: colors.text.muted, fontWeight: "600" },
  // Upgrade card
  upgradeCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 18, marginBottom: 8,
  },
  upgradeIconChip: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center",
  },
  upgradeInfo: { flex: 1 },
  upgradeTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  upgradeText: { fontSize: 13, color: "rgba(255,255,255,0.92)", marginTop: 2 },
  usageText: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 4 },
  // Sign out
  signOutButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  signOutText: { fontSize: 16, fontWeight: "700", color: colors.error },
});
