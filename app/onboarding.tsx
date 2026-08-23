import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { colors } from "../src/constants/colors";
import { PipWisp } from "../src/components/PipWisp";
import { BrandGradient } from "../src/components/ui/BrandGradient";
import { Icon } from "../src/components/ui/icons";
import { useAuthStore } from "../src/stores/authStore";
import { pip, fill, HOME_CAPTURE_ACTIONS } from "../src/constants/pipCopy";

/** v6 premium capture-pill fill (matches Home + mockup_kit.tinted_pill). */
function tintFill(base: string): [string, string] {
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  const lift = (c: number) => Math.round(c + (255 - c) * 0.34);
  return [
    `rgba(${lift(r)},${lift(g)},${lift(b)},0.40)`,
    `rgba(${r},${g},${b},0.50)`,
  ];
}


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
        <PipWisp state="idle" position="center-screen" size={132} background="light" />
      </View>

      <Text style={styles.greeting}>
        {fill(user?.displayName ? "Hi, {name}. I'm PIP." : "Hi, I'm PIP.", {
          name: user?.displayName,
        })}
      </Text>
      <Text style={styles.subtitle}>
        Give me anything — a photo, a note,
        {"\n"}a voice. I'll remember it for you.
      </Text>
      <Text style={styles.gotIt}>{pip.captureSheet.confirm}</Text>

      {/* Three capture ways — same as Home (Snap / Tell / Type) — premium tinted pills */}
      <View style={styles.captureStack}>
        {HOME_CAPTURE_ACTIONS.map((a) => (
          <View key={a.key} style={styles.captureAction}>
            <LinearGradient
              colors={tintFill(a.tint)}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.capturePill}
            >
              <Icon name={a.icon} size={30} color={a.tint} />
              <View style={styles.captureText}>
                <Text style={styles.captureLabel}>{a.label}</Text>
                <Text style={styles.captureHint}>{a.hint}</Text>
              </View>
            </LinearGradient>
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
  pipArea: { marginBottom: 20, height: 132, alignItems: "center" },
  greeting: { fontSize: 32, fontWeight: "800", color: colors.ink, textAlign: "center", marginBottom: 12 },
  subtitle: { fontSize: 17, color: colors.muted, textAlign: "center", lineHeight: 26, paddingHorizontal: 8 },
  gotIt: { fontSize: 22, color: colors.accent.amberDeep, fontWeight: "800", marginTop: 12, textAlign: "center" },
  captureStack: { width: "100%", marginTop: 32, gap: 14 },
  captureAction: {
    borderRadius: 28,
    shadowColor: "#0F2A33",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 5,
  },
  capturePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  captureText: { flex: 1 },
  captureLabel: { fontSize: 17, fontWeight: "800", color: colors.ink },
  captureHint: { fontSize: 13, color: colors.text.muted, marginTop: 2 },
  doneWrap: { width: "100%", marginTop: 36 },
  done: { height: 56, alignItems: "center", justifyContent: "center" },
  doneText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  skip: { marginTop: 18, padding: 8 },
  skipText: { fontSize: 15, color: colors.text.muted, fontWeight: "600" },
});
