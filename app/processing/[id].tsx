import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { colors } from "../../src/constants/colors";
import { Button } from "../../src/components/ui/Button";
import { PipWisp } from "../../src/components/PipWisp";
import { pip } from "../../src/constants/pipCopy";
import { pollUntilDone } from "../../src/services/capture";
import { useCaptureStore } from "../../src/stores/captureStore";

export default function ProcessingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Real capture ids are UUIDs from the backend. Placeholder ids ("demo",
  // "share") come from old prototype/share-extension paths — never poll them
  // and never fall back to a fake action.
  const captureId =
    typeof id === "string" && id !== "demo" && id !== "share" ? id : null;

  const [statusMessage, setStatusMessage] = useState(pip.loading.processing);
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
    // Rotate status messages while waiting — PIP thinks, never a bare spinner.
    const statuses = [
      pip.loading.processing,
      "Reading what's there...",
      "I know what this is...",
      "I'm turning that into a memory...",
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let totalTime = 0;
    statuses.forEach((s) => {
      const t = setTimeout(() => setStatusMessage(s), totalTime);
      timers.push(t);
      totalTime += 2200;
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <View style={styles.container}>
      {/* PIP thinks — reanimated wisp in "thinking" state, never a bare spinner (§4/§6.2) */}
      <View style={styles.pipWrap}>
        <PipWisp state="thinking" position="center-screen" size={120} background="light" />
      </View>

      <Text style={styles.title}>{statusMessage}</Text>
      <Text style={styles.subtitle}>{pip.loading.processing}</Text>

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
  pipWrap: { height: 120, width: 120, marginBottom: 16, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 15, color: colors.muted, textAlign: "center", marginBottom: 32, lineHeight: 22 },
  errorCard: { backgroundColor: "#FEF2F2", borderRadius: 12, padding: 16, alignItems: "center", gap: 12, marginTop: 16, width: "100%" },
  errorText: { color: colors.error, fontSize: 14, textAlign: "center" },
  errorActions: { flexDirection: "row", gap: 12 },
});
