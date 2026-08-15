import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { colors } from "../../src/constants/colors";
import { Button } from "../../src/components/ui/Button";
import { pollUntilDone } from "../../src/services/capture";
import { useCaptureStore } from "../../src/stores/captureStore";

export default function ProcessingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Real capture ids are UUIDs from the backend. Placeholder ids ("demo",
  // "share") come from old prototype/share-extension paths — never poll them
  // and never fall back to a fake action.
  const captureId =
    typeof id === "string" && id !== "demo" && id !== "share" ? id : null;

  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [statusMessage, setStatusMessage] = useState("Taking a look...");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const setDraft = useCaptureStore((state) => state.setDraft);
  const resetDraft = useCaptureStore((state) => state.resetDraft);

  // Single owner of capture-result polling: uploads land here via
  // /processing/:captureId (photo/text/voice) and notification taps deep-link
  // here too. On completion we persist any auto-assigned household member and
  // navigate to the REAL action — no demo fallbacks.
  useEffect(() => {
    if (!captureId) return;
    let cancelled = false;
    setError(null);

    pollUntilDone(captureId)
      .then((result) => {
        if (cancelled) return;
        if (result.status === "completed" && result.action) {
          // Persist auto-assigned household member if present
          if (result.action.assignee_id) {
            setDraft({
              assigneeId: result.action.assignee_id,
              assigneeDisplayName: result.action.assignee_display_name,
            });
          }
          router.replace(`/action/${result.action.id}`);
        } else if (result.status === "failed") {
          setError(result.error_message || "Processing failed");
        } else {
          // Should not happen — pollUntilDone resolves only on completed/failed.
          setError("Processing didn't finish. Please try again.");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Processing failed";
        setError(message || "Processing timed out");
      });

    return () => {
      cancelled = true;
    };
  }, [captureId, retryKey, setDraft]);

  useEffect(() => {
    // Animated shimmer
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();

    // Rotate status messages while waiting
    const statuses = [
      { msg: "Taking a look...", time: 2000 },
      { msg: "Reading what's there...", time: 2000 },
      { msg: "I know what this is...", time: 2000 },
      { msg: "Just a moment...", time: 1500 },
    ];

    let totalTime = 0;
    statuses.forEach((s) => {
      setTimeout(() => setStatusMessage(s.msg), totalTime);
      totalTime += s.time;
    });

    // Elapsed time counter
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
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
        <Text style={styles.spinnerIcon}>💡</Text>
        <View style={styles.spinnerRing} />
      </View>

      <Text style={styles.title}>{statusMessage}</Text>
      <Text style={styles.subtitle}>PIP is taking care of this</Text>

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

      {!captureId && !error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>This capture isn't available.</Text>
          <Button title="Back" onPress={() => router.back()} variant="primary" size="sm" />
        </View>
      )}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.errorActions}>
            <Button
              title="Retry"
              onPress={() => {
                resetDraft();
                setRetryKey((k) => k + 1);
              }}
              variant="primary"
              size="sm"
            />
            <Button title="Back" onPress={() => router.back()} variant="ghost" size="sm" />
          </View>
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
  errorActions: { flexDirection: "row", gap: 12 },
});
