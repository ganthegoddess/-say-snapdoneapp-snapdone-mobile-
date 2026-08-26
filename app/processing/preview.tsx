/**
 * Photo Preview + Voice Note — Multimodal Capture (Phase 6)
 *
 * After capturing a photo, this screen shows the preview and offers
 * an OPTIONAL voice note. Default snap → done flow is unchanged.
 *
 * Design spec: /home/team/shared/multimodal-capture-design.md
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  type AudioRecorder,
} from "expo-audio";
import { colors, spacing, borderRadius } from "../../src/constants/colors";
import { PipWisp } from "../../src/components/PipWisp";
import { WaveformDots } from "../../src/components/ui/WaveformDots";
import { useCaptureStore, type DraftCapture } from "../../src/stores/captureStore";
import { useCapture } from "../../src/hooks/useCapture";
import LimitReachedScreen from "../../src/components/upgrade/LimitReachedScreen";
import { trackEvent } from "../../src/lib/posthog";

const MAX_RECORDING_SECONDS = 15;
const MIN_RECORDING_SECONDS = 1;

type PreviewPhase =
  | "preview"        // photo preview + "Add voice note" invitation
  | "recording"      // actively recording voice note
  | "confirmation";  // dual-hero confirmation before saving

const PIP_VOICE_LINES = ["I'm listening.", "Tell me.", "Go ahead."];
const PIP_CONFIRM_MESSAGES: Record<string, string> = {
  photo_only: "I've got it.",
  "photo+voice": "I've got both. Photo and voice note — saved together.",
  short: "I've got it. Short and sweet.",
  long: "I've got it. Lots of detail — I'll remember all of it.",
};

export default function PhotoPreviewScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const photoUri = uri ? decodeURIComponent(uri) : "";

  const setDraft = useCaptureStore((state) => state.setDraft);
  const { uploadPhoto, upgradeRequired, error, isUploading } = useCapture();

  const [phase, setPhase] = useState<PreviewPhase>("preview");
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [transcription, setTranscription] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [pipLineIdx, setPipLineIdx] = useState(0);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState<boolean | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordingRef = useRef<AudioRecorder | null>(recorder);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable refs to avoid stale closure issues in callbacks
  const stopRecordingRef = useRef<() => Promise<void>>(async () => {});
  const startRecordingRef = useRef<() => Promise<void>>(async () => {});

  // Photo dimmed overlay for recording
  const dimAnim = useRef(new Animated.Value(1)).current;

  // Cycle PIP voice line every few seconds during recording
  useEffect(() => {
    if (!isRecording || phase !== "recording") return;
    const interval = setInterval(() => {
      setPipLineIdx((prev) => (prev + 1) % PIP_VOICE_LINES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isRecording, phase]);

  // Recording elapsed timer (display only — auto-stop via setTimeout)
  useEffect(() => {
    if (!isRecording) return;
    timerRef.current = setInterval(() => {
      setRecordingElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Clean up audio mode on unmount
  useEffect(() => {
    return () => {
      setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
      }).catch(() => {});
    };
  }, []);

  // Capture 31+ on the free tier — backend returned 402 / upgrade_required.
  // Surface the friendly limit screen (Upgrade → /paywall) instead of a silent
  // dead-end when the user taps "Save memory".
  if (upgradeRequired) {
    return <LimitReachedScreen />;
  }

  // Guard against empty photo URI (deep link / share extension edge case)
  if (!photoUri) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>No Photo</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorHeadline}>No photo to preview</Text>
          <Text style={styles.errorSub}>Please take or select a photo first.</Text>
        </View>
      </View>
    );
  }

  const startRecording = useCallback(async () => {
    try {
      // Request audio permissions
      const { status } = await requestRecordingPermissionsAsync();
      if (status !== "granted") {
        setAudioPermissionGranted(false);
        Alert.alert(
          "Microphone Access",
          "Microphone access is needed to add voice notes to your memories. Enable it in Settings.",
          [
            { text: "Not Now", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      setAudioPermissionGranted(true);

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const activeRecorder = recordingRef.current ?? recorder;
      await activeRecorder.prepareToRecordAsync();
      activeRecorder.record();

      recordingRef.current = activeRecorder;
      setIsRecording(true);
      setPhase("recording");
      setRecordingElapsed(0);

      trackEvent("voice_capture_started", {});

      // Dim photo overlay
      Animated.timing(dimAnim, {
        toValue: 0.7,
        duration: 350,
        useNativeDriver: true,
      }).start();

      // Auto-stop at max duration
      holdTimerRef.current = setTimeout(() => {
        stopRecordingRef.current();
      }, MAX_RECORDING_SECONDS * 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [dimAnim]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      const activeRecorder = recordingRef.current;
      // Capture duration BEFORE stop() — expo-audio resets currentTime to 0 on
      // stop, so reading it after would yield 0 and wrongly drop the recording
      // ("Too short / try again"). Fall back to the elapsed second-counter.
      const currentTimeSec = Math.round(activeRecorder.currentTime) || 0;
      const durationSec = currentTimeSec > 0 ? currentTimeSec : recordingElapsed;
      await activeRecorder.stop();
      const uri = activeRecorder.uri;

      recordingRef.current = null;
      setIsRecording(false);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

      // Discard if under minimum
      if (durationSec < MIN_RECORDING_SECONDS) {
        Alert.alert("Too Short", "Keep holding to record. Voice notes should be at least 1 second.", [
          { text: "Try Again", onPress: () => startRecordingRef.current() },
          { text: "Skip", onPress: () => setPhase("preview") },
        ]);
        Animated.timing(dimAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        return;
      }

      setVoiceUri(uri);
      setVoiceDuration(durationSec);
      setPhase("confirmation");

      // Reset dim to full for confirmation
      Animated.timing(dimAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Transcription will be generated by backend after upload
      setTranscription("Processing transcription...");
    } catch (err) {
      console.error("Failed to stop recording:", err);
      setIsRecording(false);
      setPhase("preview");
    }
  }, [dimAnim, recordingElapsed]);

  // Keep refs in sync
  stopRecordingRef.current = stopRecording;
  startRecordingRef.current = startRecording;

  const handleDiscardVoice = () => {
    setVoiceUri(null);
    setVoiceDuration(0);
    setTranscription("");
    setPhase("preview");
  };

  const handleSaveMemory = () => {
    const hasVoice = !!voiceUri && voiceDuration > 0;

    trackEvent("multimodal_memory_created", {
      has_voice_note: hasVoice,
      voice_duration_seconds: hasVoice ? voiceDuration : 0,
      input_type: hasVoice ? "photo+voice" : "image",
    });

    if (hasVoice && voiceUri) {
      uploadPhoto(photoUri, {
        uri: voiceUri,
        durationSeconds: voiceDuration,
        transcription,
      });
    } else {
      uploadPhoto(photoUri);
    }
  };

  const handleDiscardAll = () => {
    router.back();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ── Phase: Preview (photo + voice note invitation) ──

  if (phase === "preview") {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleDiscardAll} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Preview</Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Photo */}
        <View style={styles.photoArea}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="contain" />
          ) : null}
        </View>

        {/* Voice Note Invitation */}
        <View style={styles.invitationSection}>
          <View style={styles.invitationDivider} />
          <TouchableOpacity style={styles.voiceInvitation} onPress={startRecording}>
            <Text style={styles.voiceInviteIcon}>🎤</Text>
            <View>
              <Text style={styles.voiceInviteLabel}>Add a voice note</Text>
              <Text style={styles.voiceInviteSub}>optional</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Confirm button */}
        <View style={styles.bottomActions}>
          {error ? (
            <View style={styles.uploadError}>
              <Text style={styles.uploadErrorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={handleSaveMemory} disabled={isUploading}>
                <Text style={styles.retryBtnText}>{isUploading ? "Uploading…" : "Try Again"}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity style={[styles.saveBtn, isUploading && styles.saveBtnDisabled]} onPress={handleSaveMemory} disabled={isUploading}>
            <Text style={styles.saveBtnText}>{isUploading ? "Uploading…" : "✓ Use Photo"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDiscardAll} style={styles.discardBtn}>
            <Text style={styles.discardBtnText}>Discard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Phase: Recording ──

  if (phase === "recording") {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              // Discard recording — user explicitly backed out, skip duration check
              if (recordingRef.current) {
                recordingRef.current.stop().catch(() => {});
                recordingRef.current = null;
              }
              setIsRecording(false);
              if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
              handleDiscardVoice();
            }}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recording</Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Dimmed photo backdrop */}
        <Animated.View style={[styles.photoArea, { opacity: dimAnim }]}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="contain" />
          ) : null}
        </Animated.View>

        {/* PIP + Recording UI overlay */}
        <View style={styles.recordingOverlay}>
          {/* PIP — centered, listening state */}
          <View style={styles.pipListening}>
            <PipWisp state="listening" position="center-screen" background="dark" />
            <Text style={styles.pipListeningLabel}>
              {PIP_VOICE_LINES[pipLineIdx]}
            </Text>
          </View>

          {/* Waveform dots */}
          <View style={styles.waveformContainer}>
            <WaveformDots active={isRecording} />
          </View>

          {/* Timer */}
          <Text style={styles.recordingTimer}>
            {formatTime(recordingElapsed)} / {formatTime(MAX_RECORDING_SECONDS)}
          </Text>

          {/* Recording button */}
          <TouchableOpacity
            style={styles.recordBtn}
            onPress={stopRecording}
            activeOpacity={0.7}
          >
            <Text style={styles.recordBtnText}>
              {isRecording ? "TAP TO STOP" : "HOLD TO RECORD"}
            </Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            onPress={() => {
              if (isRecording) stopRecording();
              handleDiscardVoice();
            }}
            style={styles.cancelVoiceBtn}
          >
            <Text style={styles.cancelVoiceText}>Cancel voice note</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Phase: Confirmation (dual-hero) ──

  const pipMessage = (() => {
    if (voiceDuration < 2) return PIP_CONFIRM_MESSAGES.short;
    if (voiceDuration > 10) return PIP_CONFIRM_MESSAGES.long;
    return PIP_CONFIRM_MESSAGES["photo+voice"];
  })();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDiscardVoice} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.confirmationScroll}>
        {/* Dual-hero preview card */}
        <View style={styles.dualHeroCard}>
          {/* Photo hero */}
          <View style={styles.dualPhotoHero}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            ) : null}
          </View>

          {/* Audio hero */}
          <View style={styles.audioHero}>
            <Text style={styles.audioIcon}>🎤</Text>
            <View style={styles.audioInfo}>
              <Text style={styles.audioLabel}>Voice note · {formatTime(voiceDuration)}</Text>
              {/* Playback bar placeholder */}
              <View style={styles.playbackBar}>
                <View style={styles.playbackTrack}>
                  <View style={[styles.playbackFill, { width: "100%" }]} />
                </View>
                <Text style={styles.playbackTime}>{formatTime(voiceDuration)}</Text>
              </View>
              {transcription ? (
                <Text style={styles.transcriptionText} numberOfLines={2}>
                  {transcription}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={handleDiscardVoice} style={styles.rerecordBtn}>
              <Text style={styles.rerecordText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PIP confirms */}
        <View style={styles.pipConfirmSection}>
          <PipWisp state="success" position="center-screen" />
          <Text style={styles.pipConfirmMessage}>{pipMessage}</Text>
        </View>

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtnLarge} onPress={handleSaveMemory}>
          <Text style={styles.saveBtnLargeText}>✓ Save memory</Text>
        </TouchableOpacity>

        {/* Discard */}
        <TouchableOpacity onPress={handleDiscardAll} style={styles.discardBtnLarge}>
          <Text style={styles.discardBtnLargeText}>Discard</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  headerBtn: { width: 60, height: 44, justifyContent: "center" },
  headerBtnText: { fontSize: 16, color: colors.text.muted, fontWeight: "500" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.deep },

  // Photo area
  photoArea: { flex: 1, backgroundColor: "#F5F5F5" },
  photo: { width: "100%", height: "100%" },

  // Voice note invitation
  invitationSection: { paddingHorizontal: 16, paddingVertical: 12 },
  invitationDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  voiceInvitation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceInviteIcon: { fontSize: 24 },
  voiceInviteLabel: { fontSize: 15, color: colors.deep, fontWeight: "500" },
  voiceInviteSub: { fontSize: 12, color: colors.text.muted, fontStyle: "italic" },

  // Bottom actions
  bottomActions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    gap: 10,
  },
  saveBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  saveBtnDisabled: { opacity: 0.6 },
  uploadError: { width: "100%", backgroundColor: colors.warm.pipGlow, borderColor: colors.warm.soft, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 12, alignItems: "center" },
  uploadErrorText: { color: colors.text.muted, fontSize: 13, textAlign: "center", lineHeight: 18, marginBottom: 8 },
  retryBtn: { backgroundColor: colors.error, paddingVertical: 9, paddingHorizontal: 22, borderRadius: 999 },
  retryBtnText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  discardBtn: { alignItems: "center", paddingVertical: 6 },
  discardBtnText: { color: colors.text.muted, fontSize: 14 },

  // Recording overlay
  recordingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingTop: 100,
  },
  pipListening: {
    alignItems: "center",
    gap: 12,
  },
  pipListeningLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    fontStyle: "italic",
    opacity: 0.8,
  },
  waveformContainer: {
    paddingVertical: 12,
    paddingHorizontal: 48,
  },
  recordingTimer: {
    fontSize: 15,
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
    opacity: 0.7,
  },
  recordBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingVertical: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 200,
  },
  recordBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  cancelVoiceBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelVoiceText: { color: "rgba(255,255,255,0.5)", fontSize: 14 },

  // Confirmation
  confirmationScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dualHeroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  dualPhotoHero: {
    width: "100%",
    height: 240,
    backgroundColor: colors.surface,
  },
  audioHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  audioIcon: { fontSize: 20 },
  audioInfo: { flex: 1 },
  audioLabel: { fontSize: 13, fontWeight: "600", color: colors.deep, marginBottom: 6 },
  playbackBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  playbackTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  playbackFill: {
    height: "100%",
    backgroundColor: colors.brand.primary,
    borderRadius: 2,
  },
  playbackTime: { fontSize: 12, color: colors.text.muted, fontVariant: ["tabular-nums"] },
  transcriptionText: {
    fontSize: 13,
    color: colors.text.muted,
    fontStyle: "italic",
    lineHeight: 18,
  },
  rerecordBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rerecordText: { fontSize: 16 },

  // PIP confirmation
  pipConfirmSection: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  pipConfirmMessage: {
    fontSize: 15,
    color: colors.deep,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 24,
  },

  // Save actions
  saveBtnLarge: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  saveBtnLargeText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  discardBtnLarge: { alignItems: "center", paddingVertical: 8, marginBottom: 16 },
  discardBtnLargeText: { color: colors.text.muted, fontSize: 14 },

  // Error screen (empty photoUri guard)
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  errorHeadline: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.deep,
    marginBottom: 8,
    textAlign: "center",
  },
  errorSub: {
    fontSize: 15,
    color: colors.text.muted,
    textAlign: "center",
  },
});
