import { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, TextInput,
  Platform, ActionSheetIOS, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAudioRecorder, useAudioRecorderState, setAudioModeAsync, requestRecordingPermissionsAsync, RecordingPresets } from "expo-audio";
import { colors } from "../../constants/colors";
import { useCaptureStore } from "../../stores/captureStore";
import * as captureService from "../../services/capture";
import { trackEvent } from "../../lib/posthog";
import { isUpgradeRequired } from "../../hooks/useCapture";

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
}

/**
 * The capture sheet — the product's "What would you like me to remember?"
 * menu. Three ways in: 📷 Photo, 🎤 Voice, 📝 Note.
 */
export function CaptureSheet({ visible, onClose }: CaptureSheetProps) {
  const setDraft = useCaptureStore((state) => state.setDraft);
  const [voiceMode, setVoiceMode] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        Alert.alert("Microphone Access", "Microphone access is needed to capture voice notes. Enable it in Settings.", [{ text: "OK" }]);
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>
            {voiceMode ? "Recording your voice note…" : "What would you like me to remember?"}
          </Text>

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

          {/* OPTIONS (shown when not in voice/note mode) */}
          {!voiceMode && !noteMode && (
            <>
              <TouchableOpacity style={styles.sheetOption} onPress={takePhoto}>
                <Text style={styles.sheetIcon}>📷</Text>
                <View style={styles.optionBody}>
                  <Text style={styles.sheetText}>Photo</Text>
                  <Text style={styles.sheetSub}>Snap a receipt, flyer, note, or screenshot</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetOption} onPress={startVoice}>
                <Text style={styles.sheetIcon}>🎤</Text>
                <View style={styles.optionBody}>
                  <Text style={styles.sheetText}>Voice</Text>
                  <Text style={styles.sheetSub}>Say it — PIP remembers it</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetOption} onPress={() => setNoteMode(true)}>
                <Text style={styles.sheetIcon}>📝</Text>
                <View style={styles.optionBody}>
                  <Text style={styles.sheetText}>Note</Text>
                  <Text style={styles.sheetSub}>Type what you don't want to forget</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetOption} onPress={pickFromLibrary}>
                <Text style={styles.sheetIcon}>🖼️</Text>
                <View style={styles.optionBody}>
                  <Text style={styles.sheetText}>Choose from Library</Text>
                  <Text style={styles.sheetSub}>Already have the photo?</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
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
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.deep, marginBottom: 16, textAlign: "center" },
  sheetOption: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  sheetIcon: { fontSize: 24 },
  optionBody: { flex: 1 },
  sheetText: { fontSize: 17, color: colors.deep, fontWeight: "700" },
  sheetSub: { fontSize: 13, color: colors.text.muted, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.text.muted },
  sheetCancel: { marginTop: 16, paddingVertical: 14, alignItems: "center", backgroundColor: colors.surface, borderRadius: 12 },
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
