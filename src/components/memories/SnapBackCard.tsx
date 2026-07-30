/**
 * SnapBackCard — renders a Memory Payload as a card.
 *
 * Layout (top → bottom):
 *   PIP message bar (wisp + companion text)
 *   Original capture hero (image / voice / pdf / text / email)
 *   AI title + summary
 *   Context badge
 *   [Open Memory] button
 *
 * The original capture is the HERO. PIP sets the emotional tone.
 * AI title/summary provide supporting information.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Linking,
} from "react-native";
import { Audio } from "expo-av";
import { router } from "expo-router";
import { colors, typography, borderRadius, spacing } from "../../constants/colors";
import { PipWisp } from "../PipWisp";
import { Badge } from "../ui/Badge";
import type { MemoryPayload } from "../../types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_PADDING = spacing.md;
const IMAGE_MAX_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2 - spacing.md * 2;

// ── Input-type icon + label helpers ──

const INPUT_TYPE_CONFIG: Record<string, { icon: string; label: string; badgeVariant: "primary" | "success" | "warning" | "error" | "neutral" }> = {
  image: { icon: "🖼️", label: "Photo", badgeVariant: "primary" },
  voice: { icon: "🎙️", label: "Voice Note", badgeVariant: "warning" },
  pdf: { icon: "📄", label: "Document", badgeVariant: "error" },
  text: { icon: "📝", label: "Text", badgeVariant: "neutral" },
  email: { icon: "✉️", label: "Email", badgeVariant: "success" },
};

// ── Sub-components ──

function PipMessageBar({ message }: { message: string }) {
  return (
    <View style={styles.pipBar}>
      <View style={styles.pipAvatar}>
        <PipWisp size={28} state="idle" />
      </View>
      <Text style={styles.pipMessage} numberOfLines={2}>
        {message}
      </Text>
    </View>
  );
}

function ImageCapture({ url }: { url: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <View style={styles.fallbackCapture}>
        <Text style={styles.fallbackIcon}>🖼️</Text>
        <Text style={styles.fallbackText}>Photo unavailable</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={styles.imageCapture}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
}

function VoiceCapture({ url, durationSeconds }: { url: string; durationSeconds?: number }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(durationSeconds ? durationSeconds * 1000 : 0);

  const togglePlayback = useCallback(async () => {
    if (isPlaying && sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
      return;
    }

    try {
      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              setPosition(status.positionMillis);
              setTotalDuration(status.durationMillis || totalDuration);
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
              }
            }
          }
        );
        setSound(newSound);
        setIsPlaying(true);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch {
      // Audio playback failed silently
    }
  }, [isPlaying, sound, url, totalDuration]);

  const progress = totalDuration > 0 ? position / totalDuration : 0;
  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.voiceCapture}>
      <TouchableOpacity onPress={togglePlayback} style={styles.voicePlayBtn}>
        <Text style={styles.voicePlayIcon}>{isPlaying ? "⏸️" : "▶️"}</Text>
      </TouchableOpacity>
      <View style={styles.voiceInfo}>
        {/* Waveform bars (decorative) */}
        <View style={styles.voiceBars}>
          {[1, 2, 3, 4, 5, 3, 4, 2, 3, 1, 2, 3].map((h, i) => (
            <View
              key={i}
              style={[
                styles.voiceBar,
                {
                  height: 6 + h * 3,
                  opacity: progress > i / 12 ? 0.8 : 0.3,
                },
              ]}
            />
          ))}
        </View>
        {/* Progress bar */}
        <View style={styles.voiceProgressBg}>
          <View style={[styles.voiceProgressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.voiceTime}>
          {isPlaying ? formatTime(position) : formatTime(totalDuration)}
        </Text>
      </View>
    </View>
  );
}

function PdfCapture({ url, filename }: { url: string; filename?: string }) {
  return (
    <TouchableOpacity
      style={styles.docCapture}
      onPress={() => Linking.openURL(url)}
    >
      <Text style={styles.docIcon}>📄</Text>
      <View style={styles.docInfo}>
        <Text style={styles.docName} numberOfLines={2}>
          {filename || "Document"}
        </Text>
        <Text style={styles.docAction}>Tap to open</Text>
      </View>
    </TouchableOpacity>
  );
}

function TextCapture({ text }: { text: string }) {
  return (
    <View style={styles.textCapture}>
      <Text style={styles.textCaptureContent} numberOfLines={6}>
        {text}
      </Text>
    </View>
  );
}

function EmailCapture({ text, filename }: { text: string; filename?: string }) {
  return (
    <View style={styles.emailCapture}>
      <View style={styles.emailHeader}>
        <Text style={styles.emailIcon}>✉️</Text>
        <Text style={styles.emailSubject} numberOfLines={1}>
          {filename || "Email"}
        </Text>
      </View>
      <Text style={styles.emailBody} numberOfLines={4}>
        {text}
      </Text>
    </View>
  );
}

// ── Main card ──

interface SnapBackCardProps {
  memory: MemoryPayload;
  recallReason?: string;
  onArchive?: () => void;
}

export function SnapBackCard({ memory, recallReason, onArchive }: SnapBackCardProps) {
  const { action, original, context, pip } = memory;
  const inputConfig = INPUT_TYPE_CONFIG[original.input_type] || INPUT_TYPE_CONFIG.text;

  const renderCapture = () => {
    switch (original.input_type) {
      case "image":
        return <ImageCapture url={original.file_url} />;
      case "voice":
        return (
          <VoiceCapture
            url={original.file_url}
            durationSeconds={original.duration_seconds}
          />
        );
      case "pdf":
        return <PdfCapture url={original.file_url} filename={original.filename} />;
      case "email":
        return (
          <EmailCapture
            text={original.extracted_text || ""}
            filename={original.filename}
          />
        );
      case "text":
      default:
        return <TextCapture text={original.extracted_text || action.description || ""} />;
    }
  };

  return (
    <View style={styles.card}>
      {/* PIP message bar */}
      {pip?.message ? <PipMessageBar message={pip.message} /> : null}

      {/* Original capture — the hero */}
      <View style={styles.captureSection}>{renderCapture()}</View>

      {/* AI title + summary */}
      <View style={styles.actionInfo}>
        <Text style={styles.actionTitle} numberOfLines={2}>
          {action.title}
        </Text>
        {action.description ? (
          <Text style={styles.actionSummary} numberOfLines={2}>
            {action.description}
          </Text>
        ) : null}
      </View>

      {/* Context badge + input type */}
      <View style={styles.metaRow}>
        {context?.label ? (
          <Badge label={context.label} variant="warning" size="sm" />
        ) : null}
        <Badge label={inputConfig.label} variant={inputConfig.badgeVariant} size="sm" />
        {recallReason ? (
          <Text style={styles.recallReason} numberOfLines={1}>
            {recallReason}
          </Text>
        ) : null}
      </View>

      {/* Open Memory button */}
      <TouchableOpacity
        style={styles.openBtn}
        onPress={() => router.push(`/action/${action.id}`)}
      >
        <Text style={styles.openBtnText}>Open Memory</Text>
      </TouchableOpacity>

      {/* Optional archive button */}
      {onArchive ? (
        <TouchableOpacity onPress={onArchive} style={styles.archiveBtn}>
          <Text style={styles.archiveBtnText}>Archive</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: spacing.md,
  },

  // PIP message bar
  pipBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: "#FFF8F0",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pipAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
  },
  pipMessage: {
    flex: 1,
    fontSize: 13,
    color: "#5C4A2A",
    fontStyle: "italic",
    lineHeight: 18,
  },

  // Capture section
  captureSection: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Image
  imageCapture: {
    width: "100%",
    height: 200,
    backgroundColor: colors.surface,
  },
  fallbackCapture: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  fallbackIcon: { fontSize: 32, marginBottom: 4 },
  fallbackText: { fontSize: 13, color: colors.text.muted },

  // Voice
  voiceCapture: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  voicePlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent.warm + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  voicePlayIcon: { fontSize: 20 },
  voiceInfo: { flex: 1 },
  voiceBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 24,
    marginBottom: 6,
  },
  voiceBar: {
    width: 3,
    backgroundColor: colors.accent.warm,
    borderRadius: 1.5,
  },
  voiceProgressBg: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 1.5,
    overflow: "hidden",
  },
  voiceProgressFill: {
    height: "100%",
    backgroundColor: colors.accent.warm,
    borderRadius: 1.5,
  },
  voiceTime: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 4,
  },

  // PDF / Document
  docCapture: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: "#FEF2F2",
  },
  docIcon: { fontSize: 32 },
  docInfo: { flex: 1 },
  docName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.deep,
    marginBottom: 2,
  },
  docAction: { fontSize: 12, color: colors.error },

  // Text
  textCapture: {
    padding: spacing.md,
    backgroundColor: "#F8FAFC",
  },
  textCaptureContent: {
    fontSize: 14,
    color: colors.deep,
    lineHeight: 20,
  },

  // Email
  emailCapture: {
    padding: spacing.md,
    backgroundColor: "#F0FDF4",
  },
  emailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 6,
  },
  emailIcon: { fontSize: 18 },
  emailSubject: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.deep,
    flex: 1,
  },
  emailBody: {
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 18,
  },

  // Action info
  actionInfo: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.deep,
    marginBottom: 2,
  },
  actionSummary: {
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 18,
  },

  // Meta row
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexWrap: "wrap",
  },
  recallReason: {
    fontSize: 11,
    color: colors.text.muted,
    fontStyle: "italic",
    marginLeft: spacing.xs,
    flex: 1,
  },

  // Open Memory button
  openBtn: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.brand.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  openBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },

  // Archive
  archiveBtn: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    alignItems: "center",
    paddingVertical: 4,
  },
  archiveBtnText: {
    fontSize: 12,
    color: colors.text.muted,
    fontWeight: "500",
  },
});
