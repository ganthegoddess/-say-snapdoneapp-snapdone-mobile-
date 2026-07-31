/**
 * Ask PIP — Conversational Recall UI
 *
 * Single-turn question → answer interface. Not a chatbot.
 * Users ask PIP natural-language questions about their memories
 * and get results back as Memory Payload cards.
 *
 * Phase 6: Conversational Recall (post-beta, v1.1)
 */

import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { colors, typography, borderRadius, spacing } from "../src/constants/colors";
import { PipWisp } from "../src/components/PipWisp";
import { SnapBackCard } from "../src/components/memories/SnapBackCard";
import { askPip } from "../src/services/memories";
import { trackEvent } from "../src/lib/posthog";
import type { AskPipResponse } from "../src/types";

type ScreenPhase = "idle" | "searching" | "results" | "empty";

export default function AskPipScreen() {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<ScreenPhase>("idle");
  const [response, setResponse] = useState<AskPipResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleAsk = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setPhase("searching");
    setError(null);
    setResponse(null);

    const startTime = Date.now();

    try {
      const result = await askPip(trimmed);
      const responseTimeMs = Date.now() - startTime;

      trackEvent("recall_search", {
        query_length: trimmed.length,
        results_count: result.results.length,
        response_time_ms: responseTimeMs,
        confidence: result.confidence,
      });

      if (result.results.length === 0) {
        trackEvent("recall_result_empty", { query_length: trimmed.length });
        setPhase("empty");
        setResponse(result);
      } else {
        if (result.confidence === "high") {
          trackEvent("recall_result_confidence_high", { results_count: result.results.length });
        } else if (result.confidence === "low") {
          trackEvent("recall_result_confidence_low", { results_count: result.results.length });
        }
        trackEvent("recall_result_found", { results_count: result.results.length });
        setResponse(result);
        setPhase("results");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Try asking again.");
      setPhase("idle");
    }
  };

  const handleVoice = () => {
    // Voice input will be wired in a follow-up task
    // For now, focus the text input as a fallback
    inputRef.current?.focus();
  };

  const pipState = phase === "searching" ? "searching" : phase === "empty" ? "thinking" : "idle";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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
        {/* PIP + prompt area */}
        <View style={styles.pipArea}>
          <PipWisp state={pipState} size={48} position="center-screen" background="light" />
          {phase === "idle" && (
            <Text style={styles.promptText}>
              Ask me anything about your memories.{"\n"}I'll find what you're looking for.
            </Text>
          )}
          {phase === "searching" && (
            <Text style={styles.searchingText}>Let me think...</Text>
          )}
          {phase === "empty" && response && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyMessage}>{response.pip_message}</Text>
              <Text style={styles.emptyHint}>
                Try different words, or check if it was a picture, voice note, or something someone sent.
              </Text>
            </View>
          )}
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Results */}
        {phase === "results" && response && (
          <View style={styles.resultsSection}>
            {/* PIP summary */}
            <View style={styles.resultsSummary}>
              <Text style={styles.resultsCount}>
                {response.total_matches} {response.total_matches === 1 ? "memory" : "memories"} found
              </Text>
            </View>

            {/* Result cards */}
            {response.results.map((memory, i) => (
              <View key={memory.action.id} style={styles.resultCard}>
                <SnapBackCard memory={memory} recallReason={response.pip_message} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder="Ask PIP anything..."
            placeholderTextColor={colors.text.muted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleAsk}
            returnKeyType="search"
            editable={phase !== "searching"}
            autoFocus
          />
          <TouchableOpacity
            style={styles.voiceBtn}
            onPress={handleVoice}
            disabled={phase === "searching"}
          >
            <Text style={styles.voiceIcon}>🎤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.askBtn, !query.trim() && styles.askBtnDisabled]}
            onPress={handleAsk}
            disabled={!query.trim() || phase === "searching"}
          >
            {phase === "searching" ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.askBtnText}>Ask</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 54 : 24,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 22, color: colors.deep },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.deep },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  pipArea: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 },
  promptText: {
    marginTop: 16,
    fontSize: 15,
    color: colors.text.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  searchingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.muted,
    fontStyle: "italic",
  },

  emptyState: { marginTop: 16, alignItems: "center", paddingHorizontal: 16 },
  emptyMessage: {
    fontSize: 16,
    color: colors.deep,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "600",
  },
  emptyHint: {
    marginTop: 12,
    fontSize: 14,
    color: colors.text.muted,
    textAlign: "center",
    lineHeight: 20,
  },

  errorBanner: {
    marginHorizontal: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  errorText: { color: colors.error, fontSize: 14, textAlign: "center" },

  resultsSection: { paddingHorizontal: 16 },
  resultsSummary: { marginBottom: 12 },
  resultsCount: { fontSize: 14, color: colors.text.muted, fontWeight: "600" },
  resultCard: { marginBottom: 12 },

  inputBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 30 : 14,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.deep,
  },
  voiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceIcon: { fontSize: 20 },
  askBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 64,
    alignItems: "center",
  },
  askBtnDisabled: { opacity: 0.4 },
  askBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
