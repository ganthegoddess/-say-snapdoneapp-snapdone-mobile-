import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { colors } from "../src/constants/colors";
import { PipBadge } from "../src/components/ui/PipBadge";
import { BrandGradient } from "../src/components/ui/BrandGradient";
import { Icon } from "../src/components/ui/icons";
import { useAuthStore } from "../src/stores/authStore";
import { pip, fill, HOME_CAPTURE_ACTIONS } from "../src/constants/pipCopy";

export default function OnboardingScreen() {
  // A fresh sign-up already has a token — onboarding must exit into the app,
  // not back to the sign-up screen (was a dead-end loop).
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const exitRoute = token ? "/(tabs)" : "/(auth)/sign-up";

  const handleDone = () => router.replace(exitRoute);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Canonical PIP — the first thing a user meets (DESIGN-SYSTEM §7.5) */}
      <View style={styles.pipArea}>
        <PipBadge size={120} />
      </View>

      <Text style={styles.greeting}>
        {fill(user?.displayName ? "Hi, {name}. I'm PIP." : "Hi, I'm PIP.", {
          name: user?.displayName,
        })}
      </Text>
      <Text style={styles.subtitle}>
        Snap a photo, a voice note, or a thought — I'll remember it for you.
      </Text>
      <Text style={styles.gotIt}>{pip.captureSheet.confirm}</Text>

      {/* Three capture ways — same as Home (Snap / Tell / Type) */}
      <View style={styles.captureStack}>
        {HOME_CAPTURE_ACTIONS.map((a) => (
          <View key={a.key} style={styles.captureAction}>
            <View style={styles.captureIconWrap}>
              <Icon name={a.icon} size={24} color={colors.brand.primary} />
            </View>
            <View style={styles.captureText}>
              <Text style={styles.captureLabel}>{a.label}</Text>
              <Text style={styles.captureHint}>{a.hint}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Primary CTA — rich gradient, white label (cohesion rule §6.3) */}
      <TouchableOpacity onPress={handleDone} style={styles.doneWrap} activeOpacity={0.85}>
        <BrandGradient style={styles.done} rounded={28}>
          <Text style={styles.doneText}>Done.</Text>
        </BrandGradient>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleDone} style={styles.skip}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { alignItems: "center", paddingHorizontal: 28, paddingTop: 80, paddingBottom: 48 },
  pipArea: { marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: "800", color: colors.deep, textAlign: "center", marginBottom: 10 },
  subtitle: { fontSize: 16, color: colors.text.primary, textAlign: "center", lineHeight: 24, paddingHorizontal: 8 },
  gotIt: { fontSize: 15, color: colors.accent.warm, fontWeight: "700", marginTop: 10, textAlign: "center" },
  captureStack: { width: "100%", marginTop: 32, gap: 14 },
  captureAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.deep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  captureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.light,
    marginRight: 16,
  },
  captureText: { flex: 1 },
  captureLabel: { fontSize: 16, fontWeight: "700", color: colors.deep },
  captureHint: { fontSize: 13, color: colors.text.muted, marginTop: 2 },
  doneWrap: { width: "100%", marginTop: 36 },
  done: { height: 56, alignItems: "center", justifyContent: "center" },
  doneText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  skip: { marginTop: 18, padding: 8 },
  skipText: { fontSize: 15, color: colors.text.muted, fontWeight: "600" },
});
