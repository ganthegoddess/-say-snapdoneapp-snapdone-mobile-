import { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, TextInput,
  Platform, ActionSheetIOS, Alert, ActivityIndicator, Linking,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useAudioRecorder, useAudioRecorderState, setAudioModeAsync, requestRecordingPermissionsAsync, RecordingPresets } from "expo-audio";
import { colors } from "../../constants/colors";
import { useCaptureStore } from "../../stores/captureStore";
import * as captureService from "../../services/capture";
import { trackEvent } from "../../lib/posthog";
import { isUpgradeRequired } from "../../hooks/useCapture";
import { Icon } from "../ui/icons";
import { PressScale } from "../ui/PressScale";

/** FILLED premium capture-pill fill (owner B direction): full-opacity brand tint gradient. */
function tintFill(base: string): [string, string] {
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  const deep = (c: number) => Math.round(c * 0.82);
  return [base, `rgb(${deep(r)},${deep(g)},${deep(b)})`];
}

const MAX_RECORDING_SECONDS = 120; // matches backend MAX_VOICE_DURATION_MS
const MIN_RECORDING_SECONDS = 1;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Record elapsed time while recording. */
function useElapsed(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return elapsed;
}

interface CaptureSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Open directly into a mode (Home's stacked Snap/Tell/Type actions). */
  initialMode?: "photo" | "voice" | "note";
}

/**
 * The capture sheet — the product's "What can I carry for you today?"
 * menu. Three ways in: Photo, Voice, Note (DESIGN-SYSTEM §6.2 voice).
 */
export function CaptureSheet({ visible, onClose, initialMode }: CaptureSheetProps) {
  const setDraft = useCaptureStore((state) => state.setDraft);
  const [voiceMode, setVoiceMode] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Open into the requested mode when the sheet becomes visible (Home actions).
  const takePhotoRef = useRef<() => void>(() => {});
  const startVoiceRef = useRef<() => void>(() => {});
  const didOpen = useRef<boolean>(false);
  useEffect(() => {
    if (visible && !didOpen.current) {
      didOpen.current = true;
      if (initialMode === "photo") {
        takePhotoRef.current();
        return;
      }
      if (initialMode === "voice") {
        startVoiceRef.current();
        return;
      }
      if (initialMode === "note") {
        setNoteMode(true);
        setVoiceMode(false);
      }
    } else if (!visible) {
      didOpen.current = false;
    }
  }, [visible, initialMode]);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const isRecording = recorderState?.isRecording ?? false;
  const elapsed = useElapsed(isRecording);

  const reset = () => {
    setVoiceMode(false);
    setNoteMode(false);
    setNoteText("");
    setError(null);
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  // Photo
  const takePhoto = () => {
    handleClose();
    router.push("/capture");
  };
  takePhotoRef.current = takePhoto;
  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setDraft({ source: "photo_library", uri, inputType: "image", status: "pending" });
      handleClose();
      router.replace(`/processing/preview?uri=${encodeURIComponent(uri)}`);
    }
  };

  // Voice — standalone capture through POST /api/v1/capture/voice
  const startVoice = useCallback(async () => {
    setError(null);
    try {
      const { status } = await requestRecordingPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Microphone Access",
          "Microphone access is needed to capture voice notes. Enable it in Settings.",
          [
            { text: "Not Now", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setVoiceMode(true);
      trackEvent("voice_capture_started", {});
    } catch (err) {
      console.warn("start voice capture failed:", err);
      setError("Couldn't start recording. Please try again.");
    }
  }, [recorder]);
  startVoiceRef.current = startVoice;

  const stopAndUpload = useCallback(async () => {
    if (!recorderState?.isRecording) return;
    try {
      const uri = recorder.uri;
      const durationSec = Math.round(recorderState.durationMillis / 1000) || 0;
      recorder.stop();
      setVoiceMode(false);

      if (!uri) {
        setError("Recording failed. Please try again.");
        return;
      }
      if (durationSec < MIN_RECORDING_SECONDS) {
        setError("Too short. Speak a little longer and try again.");
        return;
      }
      setIsSubmitting(true);
      try {
        const result = await captureService.uploadVoiceCapture(uri, durationSec);
        if (result.capture_id) {
          trackEvent("memory_captured", { capture_type: "voice" });
          handleClose();
          router.replace(`/processing/${result.capture_id}`);
        } else {
          setError("Upload failed — no capture ID returned");
        }
      } catch (err) {
        if (isUpgradeRequired(err)) {
          handleClose();
          router.push("/paywall");
        } else {
          setError((err as Error).message || "Upload failed. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }
    } catch (err) {
      console.warn("stop voice capture failed:", err);
      setError("Couldn't finish recording. Please try again.");
    }
  }, [recorder, recorderState, handleClose]);

  const submitNote = useCallback(async () => {
    const text = noteText.trim();
    if (!text) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await captureService.submitText(text);
      if (result.capture_id) {
        trackEvent("memory_captured", { capture_type: "note" });
        handleClose();
        router.replace(`/processing/${result.capture_id}`);
      } else {
        setError("Submission failed — no capture ID returned");
      }
    } catch (err) {
      if (isUpgradeRequired(err)) {
        handleClose();
        router.push("/paywall");
      } else {
        setError((err as Error).message || "Submission failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [noteText, handleClose]);

  const CAPTURE_MODES: {
    key: string;
    icon: "camera" | "mic" | "note" | "album" | "upload";
    tint: string;
    title: string;
    onPress: () => void;
  }[] = [
    { key: "photo", icon: "camera", tint: "#0891B2", title: "Photo", onPress: takePhoto },
    { key: "voice", icon: "mic", tint: "#F59E0B", title: "Voice", onPress: () => startVoice() },
    { key: "library", icon: "album", tint: "#10B981", title: "Library", onPress: () => pickFromLibrary() },
    { key: "note", icon: "note", tint: "#0E7490", title: "Notes", onPress: () => setNoteMode(true) },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>
            {voiceMode ? "Recording your voice note…" : "What can I carry for you?"}
          </Text>
          {!voiceMode && !noteMode && (
            <Text style={styles.sheetSub}>Snap it. Say it. Type it. I've got it.</Text>
          )}

          {/* VOICE recording UI */}
          {voiceMode && (
            <View style={styles.voiceBox}>
              <Text style={styles.recTimer}>{formatDuration(elapsed)}</Text>
              <TouchableOpacity style={styles.stopBtn} onPress={stopAndUpload} disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.stopBtnText}>Stop &amp; Save</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.voiceHint}>Tap "Stop &amp; Save" when you're done.</Text>
            </View>
          )}

          {/* NOTE input UI */}
          {noteMode && (
            <View style={styles.noteBox}>
              <TextInput
                style={styles.noteInput}
                placeholder="What should PIP remember for you?"
                placeholderTextColor={colors.text.muted}
                value={noteText}
                onChangeText={setNoteText}
                multiline
                autoFocus
              />
              <TouchableOpacity
                style={[styles.noteSubmit, !noteText.trim() && { opacity: 0.5 }]}
                onPress={submitNote}
                disabled={!noteText.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.noteSubmitText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ERROR */}
          {error && !voiceMode && !noteMode && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>📶 {error}</Text>
            </View>
          )}

          {/* OPTIONS (shown when not in voice/note mode) — premium tinted mode pills */}
          {!voiceMode && !noteMode && (
            <>
              {CAPTURE_MODES.map((m) => (
                <PressScale key={m.key} style={styles.sheetOptionShadow} onPress={m.onPress} accessibilityLabel={m.title}>
                  <LinearGradient
                    colors={tintFill(m.tint)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.sheetOptionPill}
                  >
                    <Icon name={m.icon} size={30} color="#FFFFFF" />
                    <Text style={styles.sheetText}>{m.title}</Text>
                  </LinearGradient>
                </PressScale>
              ))}
            </>
          )}

          <TouchableOpacity style={styles.sheetCancel} onPress={() => (voiceMode ? stopAndUpload() : handleClose())}>
            <Text style={styles.sheetCancelText}>{voiceMode ? "Cancel Recording" : "Cancel"}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 24, fontWeight: "800", color: colors.ink, marginBottom: 8, textAlign: "center" },
  sheetSub: { fontSize: 15, color: colors.muted, marginBottom: 16, textAlign: "center" },
  sheetOptionShadow: {
    borderRadius: 26,
    marginBottom: 14,
    shadowColor: "#0F2A33",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.13,
    shadowRadius: 14,
    elevation: 5,
  },
  sheetOptionPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    borderRadius: 26,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  sheetText: { fontSize: 19, color: "#FFFFFF", fontWeight: "800" },
  sheetCancel: { marginTop: 16, paddingVertical: 14, alignItems: "center" },
  sheetCancelText: { fontSize: 16, color: colors.text.muted, fontWeight: "600" },
  // Voice
  voiceBox: { alignItems: "center", paddingVertical: 16 },
  recTimer: { fontSize: 32, fontWeight: "800", color: colors.accent.warm, marginBottom: 16 },
  stopBtn: { backgroundColor: colors.error, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, minWidth: 160, alignItems: "center" },
  stopBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  voiceHint: { fontSize: 13, color: colors.text.muted, marginTop: 12 },
  // Note
  noteBox: { paddingVertical: 8 },
  noteInput: {
    height: 110, backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    fontSize: 16, color: colors.text.primary, textAlignVertical: "top", borderWidth: 1, borderColor: colors.border, marginBottom: 16,
  },
  noteSubmit: { backgroundColor: colors.brand.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  noteSubmitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  // Error
  errorBox: { backgroundColor: "#FEF2F2", borderRadius: 12, padding: 14, marginBottom: 12 },
  errorText: { color: colors.error, fontSize: 14, textAlign: "center" },
});
