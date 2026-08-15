import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { router } from "expo-router";
import { colors } from "../../src/constants/colors";
import { useLocationStore } from "../../src/stores/locationStore";
import { useAuthStore } from "../../src/stores/authStore";

interface SettingsItem {
  icon: string;
  label: string;
  value: string;
  route?: string;
  /** If toggleKey is set, renders a Switch instead of value */
  toggleKey?: string;
}

const SETTINGS_SECTIONS: { title: string; items: SettingsItem[] }[] = [
  {
    title: "Profile",
    items: [
      { icon: "👤", label: "Name", value: "—" },
      { icon: "📧", label: "Email", value: "—" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { icon: "🔔", label: "Notifications", value: "On" },
      { icon: "📍", label: "Location-based reminders", value: "", toggleKey: "location" },
      { icon: "📅", label: "Calendar Sync", value: "Off" },
    ],
  },
  {
    title: "Household",
    items: [
      { icon: "🏠", label: "Manage Household", value: "Not set up", route: "/(tabs)/household" },
    ],
  },
  {
    title: "PIP & Capture",
    items: [
      { icon: "💡", label: "Recognition confidence", value: "High (90%)" },
      { icon: "📸", label: "Preferred action types", value: "All" },
    ],
  },
];

export default function SettingsScreen() {
  const locationRemindersEnabled = useLocationStore((s) => s.locationRemindersEnabled);
  const setLocationRemindersEnabled = useLocationStore((s) => s.setLocationRemindersEnabled);
  const signOut = useAuthStore((s) => s.signOut);

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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {SETTINGS_SECTIONS.map((section, idx) => (
        <View key={idx} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.card}>
            {section.items.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.row, i > 0 && styles.rowBorder]}
                onPress={() => item.route && router.push(item.route as any)}
                disabled={!!item.toggleKey}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowIcon}>{item.icon}</Text>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                </View>
                {item.toggleKey === "location" ? (
                  <Switch
                    value={locationRemindersEnabled}
                    onValueChange={setLocationRemindersEnabled}
                    trackColor={{ false: colors.border, true: colors.brand.primary + "60" }}
                    thumbColor={locationRemindersEnabled ? colors.brand.primary : colors.text.muted}
                  />
                ) : (
                  <Text style={styles.rowValue}>{item.value}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Subscription section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <TouchableOpacity
          style={styles.upgradeCard}
          onPress={() => router.push("/paywall")}
        >
          <Text style={styles.upgradeIcon}>⭐</Text>
          <View style={styles.upgradeInfo}>
            <Text style={styles.upgradeTitle}>Free Plan</Text>
            <Text style={styles.upgradeText}>10 captures/month, no household sharing</Text>
          </View>
          <Text style={styles.upgradeChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>0.1.0</Text>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <Text style={styles.rowChevron}>›</Text>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <Text style={styles.rowChevron}>›</Text>
          </View>
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
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowIcon: { fontSize: 18 },
  rowLabel: { fontSize: 16, color: colors.text.primary },
  rowValue: { fontSize: 15, color: colors.text.muted },
  rowChevron: { fontSize: 20, color: colors.text.muted },

  // Upgrade card
  upgradeCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.brand.light, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.brand.primary,
  },
  upgradeIcon: { fontSize: 24 },
  upgradeInfo: { flex: 1 },
  upgradeTitle: { fontSize: 17, fontWeight: "700", color: colors.brand.dark },
  upgradeText: { fontSize: 13, color: colors.brand.dark, marginTop: 2 },
  upgradeChevron: { fontSize: 22, color: colors.brand.primary, fontWeight: "600" },

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