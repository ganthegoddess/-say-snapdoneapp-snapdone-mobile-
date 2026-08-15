/**
 * Ask PIP — Semantic Recall UI (Phase 6)
 *
 * "Ask PIP is not a search bar with a cute icon. It's a conversation
 * with a trusted companion who remembers everything you've shared."
 *
 * Design spec: /home/team/shared/semantic-recall-design.md
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Redirect, router } from "expo-router";
import { colors } from "../src/constants/colors";
import { PipWisp } from "../src/components/PipWisp";
import { SnapBackCard } from "../src/components/memories/SnapBackCard";
import { WaveformDots } from "../src/components/ui/WaveformDots";
import { askPip } from "../src/services/memories";
import { trackEvent } from "../src/lib/posthog";
import { FEATURES } from "../src/constants/features";
import type { AskPipResponse } from "../src/types";
import type { PipState } from "../src/components/PipWisp";

type ScreenPhase = "idle" | "listening" | "searching" | "remembered" | "not_found" | "low_confidence";

const PLACEHOLDERS = [
  "Ask PIP anything...",
  "What did Mom say about Tuesday?",
  "Where did I park at the airport?",
];

const PIP_MESSAGES: Record<ScreenPhase, string | ((n?: number, topic?: string) => string)> = {
  idle: "What would you like to remember?",
  listening: "I'm listening.",
  searching: "",
  remembered: "",
  not_found: "I couldn't find a memory matching that.\n\nDo you remember if it was a picture, a voice note, or something someone sent?",
  low_confidence: "I found something that might be related. Is this what you meant?",
};

export default function AskPipScreen() {
  // Beta Freeze: Ask PIP (POST /memories/ask) is disabled pre-beta. Code is
  // kept for the gated phase; while the flag is false the route is unreachable
  // (button hidden on Home) and direct navigation is redirected away.
  if (!FEATURES.ASK_PIP) {
    return <Redirect href="/(tabs)" />;
  }

  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<ScreenPhase>("idle");
  const [response, setResponse] = useState<AskPipResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showMicBar, setShowMicBar] = useState(false);
  const [followUpExpanded, setFollowUpExpanded] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const micBarAnim = useRef(new Animated.Value(0)).current;
  const promptOpacity = useRef(new Animated.Value(1)).current;

  // Cycle placeholder every 4 seconds when idle
  useEffect(() => {
    if (phase !== "idle") return;
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [phase]);

  // Fade prompt out when user types
  useEffect(() => {
    Animated.timing(promptOpacity, {
      toValue: query.length > 0 ? 0 : 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [query.length > 0]);

  const handleAsk = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    await runQuery(trimmed);
  };

  const runQuery = async (text: string) => {
    setPhase("searching");
    setError(null);
    setResponse(null);
    const startTime = Date.now();

    try {
      const result = await askPip(text);
      const responseTimeMs = Date.now() - startTime;

      trackEvent("recall_search", {
        query_length: text.length,
        results_count: result.results.length,
        response_time_ms: responseTimeMs,
        confidence: result.confidence,
      });

      if (!result.found || result.results.length === 0) {
        trackEvent("recall_result_empty", { query_length: text.length });
        setPhase("not_found");
        setResponse(result);
      } else if (result.confidence < 0.70) {
        trackEvent("recall_result_confidence_low", { results_count: result.results.length });
        setPhase("low_confidence");
        setResponse(result);
      } else {
        if (result.confidence >= 0.85) {
          trackEvent("recall_result_confidence_high", { results_count: result.results.length });
        }
        trackEvent("recall_result_found", { results_count: result.results.length });
        setPhase("remembered");
        setResponse(result);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setPhase("idle");
    }
  };

  // Voice recording simulation (Web Speech API not available in RN — placeholder)
  const handleMicPress = useCallback(() => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setShowMicBar(false);
      setPhase("searching");
      // Simulate: after 1.5s, use whatever text is in input or a placeholder
      setTimeout(() => {
        if (query.trim()) {
          runQuery(query.trim());
        } else {
          setPhase("idle");
        }
      }, 800);
    } else {
      // Start recording
      setIsRecording(true);
      setShowMicBar(true);
      setPhase("listening");
      setQuery(""); // Clear text for pure voice flow
      trackEvent("voice_capture_started", {});

      Animated.spring(micBarAnim, {
        toValue: 1,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }).start();

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (isRecording) {
          setIsRecording(false);
          setShowMicBar(false);
          setPhase("searching");
          setTimeout(() => {
            runQuery("What did I need to remember?");
          }, 800);
        }
      }, 10000);
    }
  }, [isRecording, query]);

  const dismissMicBar = () => {
    setIsRecording(false);
    setShowMicBar(false);
    setPhase("idle");
    Animated.timing(micBarAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  };

  const handleFollowUp = () => {
    setFollowUpExpanded(true);
    inputRef.current?.focus();
  };

  const getPipState = (): PipState => {
    switch (phase) {
      case "listening": return "listening";
      case "searching": return "searching";
      case "remembered": return "remembered";
      default: return "idle";
    }
  };

  const getPipMessage = (): string => {
    if (phase === "remembered" && response) {
      const n = response.results.length;
      if (n === 1) return "I found it.";
      if (n <= 4) return `I found ${n} things related to your search.`;
      return "I found quite a few things. Here are the most relevant.";
    }
    if (phase === "not_found") return PIP_MESSAGES.not_found as string;
    if (phase === "low_confidence") return PIP_MESSAGES.low_confidence as string;
    return "";
  };

  const micBarTranslateY = micBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [200, 0],
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ask PIP</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* PIP */}
        <View style={styles.pipArea}>
          <PipWisp
            state={getPipState()}
            position="center-screen"
            background="light"
          />
          {/* Accessibility label */}
          <Text style={styles.srOnly} accessibilityLiveRegion="polite">
            {`PIP is ${phase === "searching" ? "searching your memories" : phase === "listening" ? "listening" : "idle"}`}
          </Text>

          {/* Prompt text (fades when typing) */}
          <Animated.Text style={[styles.promptText, { opacity: promptOpacity }]}>
            {PIP_MESSAGES.idle as string}
          </Animated.Text>

          {/* PIP message for results / not found */}
          {getPipMessage() ? (
            <Text style={styles.pipMessage}>{getPipMessage()}</Text>
          ) : null}

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>

        {/* Results */}
        {(phase === "remembered" || phase === "low_confidence") && response && (
          <View style={styles.resultsSection}>
            {response.results.map((memory, i) => (
              <View key={memory.action.id} style={styles.resultCard}>
                <SnapBackCard
                  memory={memory}
                  recallReason={response.pip_message}
                />
              </View>
            ))}

            {/* Follow-up prompt */}
            <View style={styles.followUpArea}>
              {!followUpExpanded ? (
                <TouchableOpacity onPress={handleFollowUp} style={styles.followUpBtn}>
                  <Text style={styles.followUpText}>Not what you're looking for?</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.followUpInputRow}>
                  <TextInput
                    style={styles.followUpInput}
                    placeholder="Try another search..."
                    placeholderTextColor={colors.text.muted}
                    onSubmitEditing={(e) => runQuery(e.nativeEvent.text)}
                    returnKeyType="search"
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Not found state */}
        {phase === "not_found" && (
          <View style={styles.notFoundSection}>
            <View style={styles.notFoundSuggestions}>
              <TouchableOpacity style={styles.suggestionCard} onPress={() => runQuery("photos I captured")}>
                <Text style={styles.suggestionIcon}>📸</Text>
                <Text style={styles.suggestionText}>Try a photo search</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestionCard} onPress={() => runQuery("voice notes")}>
                <Text style={styles.suggestionIcon}>🎤</Text>
                <Text style={styles.suggestionText}>Try describing it aloud</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestionCard} onPress={() => runQuery("recent memories")}>
                <Text style={styles.suggestionIcon}>📅</Text>
                <Text style={styles.suggestionText}>Try a different time frame</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={styles.inputBar}>
        {!showMicBar && (
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder={PLACEHOLDERS[placeholderIdx]}
              placeholderTextColor={colors.text.muted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleAsk}
              returnKeyType="search"
              editable={phase !== "searching"}
              autoFocus
              accessibilityLabel="Ask PIP a question about your memories"
            />
            <TouchableOpacity
              style={styles.micBtn}
              onPress={handleMicPress}
              accessibilityLabel="Search with voice"
            >
              <Text style={styles.micIcon}>🎤</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Microphone bar (slides from bottom) */}
      {showMicBar && (
        <Animated.View style={[styles.micBar, { transform: [{ translateY: micBarTranslateY }] }]}>
          <View style={styles.micBarContent}>
            <WaveformDots active={isRecording} />
            {phase === "listening" && (
              <Text style={styles.listeningText}>I'm listening.</Text>
            )}
            <TouchableOpacity onPress={dismissMicBar} style={styles.micCancelBtn}>
              <Text style={styles.micCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 54 : 24,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    height: Platform.OS === "ios" ? 98 : 68,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 22, color: colors.deep },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.deep },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  pipArea: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 24 },
  promptText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.text.muted,
    fontStyle: "italic",
    textAlign: "center",
  },
  pipMessage: {
    marginTop: 12,
    fontSize: 15,
    color: colors.deep,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 22,
  },
  errorBanner: {
    marginTop: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    width: "100%",
  },
  errorText: { color: colors.error, fontSize: 14, textAlign: "center" },

  resultsSection: { paddingHorizontal: 16 },
  resultCard: { marginBottom: 12 },

  followUpArea: { marginTop: 12, marginBottom: 8 },
  followUpBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  followUpText: {
    fontSize: 14,
    color: colors.text.muted,
    fontWeight: "500",
  },
  followUpInputRow: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  followUpInput: {
    paddingVertical: 10,
    fontSize: 15,
    color: colors.deep,
  },

  notFoundSection: { paddingHorizontal: 16, marginTop: 8 },
  notFoundSuggestions: { gap: 8 },
  suggestionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  suggestionIcon: { fontSize: 20 },
  suggestionText: { fontSize: 15, color: colors.deep, fontWeight: "500" },

  inputBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 14,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  textInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.deep,
    height: 48,
  },
  micBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand.primary + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  micIcon: { fontSize: 20 },

  // Microphone bar
  micBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  micBarContent: {
    alignItems: "center",
    gap: 16,
  },
  listeningText: {
    fontSize: 14,
    color: colors.text.muted,
    fontStyle: "italic",
  },
  micCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  micCancelText: {
    fontSize: 14,
    color: colors.text.muted,
  },
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    overflow: "hidden",
  },
});
