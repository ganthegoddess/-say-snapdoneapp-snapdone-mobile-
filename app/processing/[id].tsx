import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { colors } from "../../src/constants/colors";
import { Button } from "../../src/components/ui/Button";
import { useCapture } from "../../src/hooks/useCapture";

export default function ProcessingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [statusMessage, setStatusMessage] = useState("Reading your capture...");
  const [elapsed, setElapsed] = useState(0);
  const { error, reset } = useCapture();

  useEffect(() => {
    // Animated shimmer
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();

    // Rotate status messages
    const statuses = [
      { msg: "Reading your capture...", time: 2000 },
      { msg: "Extracting text and details...", time: 2000 },
      { msg: "Detecting action type...", time: 2000 },
      { msg: "Almost done...", time: 1500 },
    ];

    let totalTime = 0;
    statuses.forEach((s) => {
      setTimeout(() => setStatusMessage(s.msg), totalTime);
      totalTime += s.time;
    });

    // Back up timer — if we don't navigate within 8s, navigate to demo
    const navigateTimer = setTimeout(() => {
      router.replace("/action/demo");
    }, 8000);

    // Elapsed time counter
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      clearTimeout(navigateTimer);
      clearInterval(interval);
    };
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1], outputRange: [-200, 400],
  });

  const formatTime = (s: number) => {
    if (s < 10) return `0:0${s}`;
    return `0:${s}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.spinnerContainer}>
        <Text style={styles.spinnerIcon}>🤖</Text>
        <View style={styles.spinnerRing} />
      </View>

      <Text style={styles.title}>{statusMessage}</Text>
      <Text style={styles.subtitle}>AI is analyzing your input</Text>

      {/* Processing skeleton */}
      <View style={styles.skeleton}>
        <View style={styles.skelHeader}>
          <View style={styles.skelBadge} />
          <View style={styles.skelDot} />
        </View>
        <View style={styles.skelLine} />
        <View style={[styles.skelLine, { width: "60%" }]} />
        <View style={styles.skelMetaRow}>
          <View style={styles.skelMeta} />
          <View style={[styles.skelMeta, { width: 60 }]} />
        </View>
        <View style={styles.skelBtnRow}>
          <View style={styles.skelBtn} />
          <View style={styles.skelBtn} />
        </View>
        <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }] }]} />
      </View>

      <Text style={styles.timer}>{formatTime(elapsed)}</Text>

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={() => { reset(); router.back(); }} variant="primary" size="sm" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 24 },
  spinnerContainer: { alignItems: "center", justifyContent: "center", marginBottom: 20, width: 80, height: 80 },
  spinnerIcon: { fontSize: 40, position: "absolute" },
  spinnerRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.brand.light, borderTopColor: colors.brand.primary },
  title: { fontSize: 22, fontWeight: "700", color: colors.deep, marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 15, color: colors.text.muted, textAlign: "center", marginBottom: 32, lineHeight: 22 },
  skeleton: { width: "100%", backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, overflow: "hidden", position: "relative" },
  skelHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  skelBadge: { width: 80, height: 16, backgroundColor: "#E2E8F0", borderRadius: 8 },
  skelDot: { width: 16, height: 16, backgroundColor: "#E2E8F0", borderRadius: 8 },
  skelLine: { height: 14, backgroundColor: "#E2E8F0", borderRadius: 7, marginBottom: 10, width: "80%" },
  skelMetaRow: { flexDirection: "row", gap: 12, marginBottom: 16, marginTop: 4 },
  skelMeta: { height: 12, width: 100, backgroundColor: "#E2E8F0", borderRadius: 6 },
  skelBtnRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  skelBtn: { flex: 1, height: 36, backgroundColor: "#E2E8F0", borderRadius: 8 },
  shimmer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.4)", width: 200 },
  timer: { fontSize: 14, color: colors.text.muted, marginTop: 16, fontVariant: ["tabular-nums"] },
  errorCard: { backgroundColor: "#FEF2F2", borderRadius: 12, padding: 16, alignItems: "center", gap: 12, marginTop: 16, width: "100%" },
  errorText: { color: colors.error, fontSize: 14, textAlign: "center" },
});