import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { colors } from "../../constants/colors";
import { useCaptureStore } from "../../stores/captureStore";
import { uploadCapture } from "../../services/capture";

interface SharePayload {
  type: "image" | "video" | "text" | "url" | "file";
  uri?: string;
  text?: string;
  subject?: string;
}

/**
 * ShareExtensionHandler listens for incoming share intents
 * from the iOS/Android share sheet and routes them to the capture flow.
 *
 * Mount this at the root layout level.
 */
export function ShareExtensionHandler() {
  const [incoming, setIncoming] = useState<SharePayload | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const setDraft = useCaptureStore((state) => state.setDraft);
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // In a production build with expo-share-intent, this would listen
    // for native share events. For now, we simulate the handler interface.
    //
    // The actual integration uses expo-share-intent:
    // import { useShareIntent } from 'expo-share-intent';
    // const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
    //
    // When hasShareIntent is true, process the shareIntent payload.

    // Listen for deep links that might come from share extension
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      if (url?.startsWith("snapdone://capture")) {
        setIncoming({ type: "image", uri: url });
        processShare({ type: "image", uri: url });
      }
    };

    // Subscribe to deep links (for development/testing)
    // In production, expo-share-intent fires a different event
    const subscription = { remove: () => {} }; // placeholder

    return () => subscription.remove();
  }, []);

  const processShare = async (payload: SharePayload) => {
    // Deduplicate
    const key = payload.uri || payload.text || "";
    if (processedRef.current.has(key)) return;
    processedRef.current.add(key);

    setIncoming(payload);
    setStatus("processing");

    try {
      if (payload.uri) {
        // Determine input type from URI
        const inputType = payload.uri.match(/\.(pdf)$/i) ? "pdf" : "image";
        setDraft({ source: "screenshot", uri: payload.uri, inputType, status: "processing" });

        // Upload to backend
        await uploadCapture(payload.uri, inputType);

        // Navigate to processing screen
        router.replace("/processing/share");
      } else if (payload.text) {
        setDraft({ source: "screenshot", inputType: "text", status: "processing" });
        router.replace("/processing/share");
      }

      setStatus("done");
      setTimeout(() => {
        setIncoming(null);
        setStatus("idle");
      }, 2000);
    } catch {
      setStatus("error");
      setTimeout(() => {
        setIncoming(null);
        setStatus("idle");
      }, 3000);
    }
  };

  if (status === "idle" || !incoming) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {status === "processing" && (
          <>
            <ActivityIndicator size="large" color={colors.brand.primary} />
            <Text style={styles.text}>Processing shared content...</Text>
          </>
        )}
        {status === "done" && (
          <>
            <Text style={styles.icon}>✅</Text>
            <Text style={styles.text}>Processing started!</Text>
          </>
        )}
        {status === "error" && (
          <>
            <Text style={styles.icon}>❌</Text>
            <Text style={styles.text}>Failed to process share</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 16,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: { fontSize: 32 },
  text: { fontSize: 16, fontWeight: "600", color: colors.deep, textAlign: "center" },
});