import { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Alert } from "react-native";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { colors } from "../src/constants/colors";
import { useCaptureStore } from "../src/stores/captureStore";
import { useCapture } from "../src/hooks/useCapture";

type CaptureMode = "camera" | "voice" | "gallery";

export default function CaptureScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mode, setMode] = useState<CaptureMode>("camera");
  const [flash, setFlash] = useState<"off" | "on" | "auto">("off");
  const [showGrid, setShowGrid] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const cameraRef = useRef<CameraView>(null);
  const setDraft = useCaptureStore((state) => state.setDraft);
  const { uploadVoice } = useCapture();

  // Voice recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Request camera permission on mount
  useEffect(() => {
    if (!cameraPermission?.granted) {
      requestCameraPermission();
    }
  }, []);

  // Pulsing animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationTimer.current) clearInterval(durationTimer.current);
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  // ──── Camera ────
  const handleCapture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, exif: false });
    if (photo?.uri) {
      setDraft({ source: "camera", uri: photo.uri, inputType: "image", status: "pending" });
      setTimeout(() => router.replace(`/processing/preview?uri=${encodeURIComponent(photo.uri)}`), 500);
    }
  };

  // ──── Gallery ────
  const handlePickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setDraft({ source: "photo_library", uri, inputType: "image", status: "pending" });
      router.replace(`/processing/preview?uri=${encodeURIComponent(uri)}`);
    }
  };

  // ──── Voice Recording ────
  const requestMicPermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setMicPermission(status === "granted");
      return status === "granted";
    } catch {
      setMicPermission(false);
      return false;
    }
  };

  const startRecording = async () => {
    // Check permission
    let permitted = micPermission;
    if (permitted === null) {
      permitted = await requestMicPermission();
    }
    if (!permitted) {
      Alert.alert("Microphone Access", "SnapDone needs microphone access to record voice notes.", [
        { text: "Not Now", style: "cancel" },
        { text: "Grant Access", onPress: () => requestMicPermission() },
      ]);
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      durationTimer.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      Alert.alert("Recording Error", err.message || "Could not start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    // Stop duration counter
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }

    setIsRecording(false);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        // Upload the voice recording — same flow as photo captures
        setDraft({ source: "camera", uri, inputType: "audio", status: "processing" });
        uploadVoice(uri);
      } else {
        Alert.alert("Recording Error", "Could not save the recording. Please try again.");
      }
    } catch (err: any) {
      Alert.alert("Recording Error", err.message || "Could not save the recording. Please try again.");
    } finally {
      setRecording(null);
    }
  };

  const handleVoiceButton = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const switchMode = (newMode: CaptureMode) => {
    if (isRecording && recording) {
      recording.stopAndUnloadAsync().catch(() => {});
      setIsRecording(false);
      setRecording(null);
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
        durationTimer.current = null;
      }
    }
    setMode(newMode);
  };

  // ──── Camera Permission Screen ────
  if (mode === "camera" && !cameraPermission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Access</Text>
        <Text style={styles.permissionText}>SnapDone needs camera access to capture receipts, flyers, notes, and more.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Not now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ──── Main UI ────
  return (
    <View style={styles.container}>
      {/* Content area — switches based on mode */}
      {mode === "camera" && (
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} flash={flash}>
          {showGrid && (
            <View style={styles.grid}>
              <View style={[styles.gridLine, styles.gridV, { left: "33%" }]} />
              <View style={[styles.gridLine, styles.gridV, { left: "66%" }]} />
              <View style={[styles.gridLine, styles.gridH, { top: "33%" }]} />
              <View style={[styles.gridLine, styles.gridH, { top: "66%" }]} />
            </View>
          )}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
              <Text style={styles.topBtnText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.topRight}>
              <TouchableOpacity onPress={() => setFlash(flash === "off" ? "on" : flash === "on" ? "auto" : "off")} style={styles.topBtn}>
                <Text style={styles.topBtnText}>⚡</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowGrid(!showGrid)} style={styles.topBtn}>
                <Text style={[styles.topBtnText, showGrid && styles.active]}>⊞</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      )}

      {mode === "voice" && (
        <View style={styles.voiceContainer}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
              <Text style={styles.topBtnText}>✕</Text>
            </TouchableOpacity>
            <View style={{ width: 40 }} />
          </View>

          {/* Voice UI */}
          <View style={styles.voiceContent}>
            <Text style={styles.voiceTitle}>
              {isRecording ? "Recording..." : "Tap to Record"}
            </Text>
            <Text style={styles.voiceSubtitle}>
              {isRecording
                ? "Tap the mic again when you're done"
                : "Speak your reminder, list, or note"}
            </Text>

            {/* Duration display */}
            {isRecording && (
              <View style={styles.durationContainer}>
                <Animated.View style={[styles.recordingDot, { opacity: pulseAnim }]} />
                <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
              </View>
            )}

            {/* Mic button */}
            <TouchableOpacity
              style={[styles.micButton, isRecording && styles.micButtonRecording]}
              onPress={handleVoiceButton}
              activeOpacity={0.7}
            >
              <Text style={styles.micIcon}>🎤</Text>
            </TouchableOpacity>

            {/* Tip */}
            {!isRecording && (
              <Text style={styles.voiceTip}>
                Try: "Remind me to call the dentist tomorrow at 2pm" or "Buy milk, eggs, and bread"
              </Text>
            )}
          </View>
        </View>
      )}

      {mode === "gallery" && (
        <View style={styles.modePlaceholder}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.topBtn, { position: "absolute", top: 54, left: 20, zIndex: 10 }]}>
            <Text style={styles.topBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modePlaceholderText}>Select a photo from your gallery</Text>
          <TouchableOpacity style={styles.galleryPickBtn} onPress={handlePickFromGallery}>
            <Text style={styles.galleryPickBtnText}>Open Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom mode selector + capture button */}
      <View style={styles.bottomBar}>
        {/* Mode tabs */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, mode === "voice" && styles.modeTabActive]}
            onPress={() => switchMode("voice")}
          >
            <Text style={[styles.modeTabText, mode === "voice" && styles.modeTabTextActive]}>🎤</Text>
            <Text style={[styles.modeTabLabel, mode === "voice" && styles.modeTabLabelActive]}>Voice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === "camera" && styles.modeTabActive]}
            onPress={() => switchMode("camera")}
          >
            <Text style={[styles.modeTabText, mode === "camera" && styles.modeTabTextActive]}>📷</Text>
            <Text style={[styles.modeTabLabel, mode === "camera" && styles.modeTabLabelActive]}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === "gallery" && styles.modeTabActive]}
            onPress={() => switchMode("gallery")}
          >
            <Text style={[styles.modeTabText, mode === "gallery" && styles.modeTabTextActive]}>🖼️</Text>
            <Text style={[styles.modeTabLabel, mode === "gallery" && styles.modeTabLabelActive]}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Action button per mode */}
        {mode === "camera" && (
          <>
            <TouchableOpacity onPress={handlePickFromGallery} style={styles.galleryBtn}>
              <Text style={{ fontSize: 22 }}>🖼️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCapture} style={styles.captureBtn}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFacing(facing === "back" ? "front" : "back")} style={styles.flipBtn}>
              <Text style={{ color: "#FFF", fontSize: 24 }}>↻</Text>
            </TouchableOpacity>
          </>
        )}

        {mode === "voice" && (
          <View style={styles.voiceBottomFill}>
            <Text style={styles.voiceBottomHint}>
              {isRecording ? "Tap to stop" : "Tap mic above to start"}
            </Text>
          </View>
        )}

        {mode === "gallery" && (
          <View style={styles.voiceBottomFill}>
            <Text style={styles.voiceBottomHint}>Tap above to browse photos</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  // Camera
  camera: { flex: 1 },
  grid: { ...StyleSheet.absoluteFillObject },
  gridLine: { position: "absolute", backgroundColor: "rgba(255,255,255,0.3)" },
  gridV: { top: 0, bottom: 0, width: 1 },
  gridH: { left: 0, right: 0, height: 1 },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 54, zIndex: 10 },
  topRight: { flexDirection: "row", gap: 12 },
  topBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  topBtnText: { color: "#FFF", fontSize: 20 },
  active: { color: colors.brand.light },

  // Voice recording
  voiceContainer: { flex: 1, backgroundColor: "#0F172A" },
  voiceContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 40 },
  voiceTitle: { fontSize: 24, fontWeight: "700", color: "#FFF", marginBottom: 8, textAlign: "center" },
  voiceSubtitle: { fontSize: 15, color: "#94A3B8", textAlign: "center", marginBottom: 32, lineHeight: 22 },
  durationContainer: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#EF4444" },
  durationText: { fontSize: 20, fontWeight: "600", color: "#F1F5F9", fontVariant: ["tabular-nums"] },
  micButton: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.brand.primary, alignItems: "center", justifyContent: "center", shadowColor: colors.brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  micButtonRecording: { backgroundColor: "#EF4444", shadowColor: "#EF4444", borderWidth: 3, borderColor: "rgba(239,68,68,0.4)" },
  micIcon: { fontSize: 40 },
  voiceTip: { fontSize: 13, color: "#64748B", textAlign: "center", marginTop: 32, lineHeight: 20, paddingHorizontal: 20 },
  voiceBottomFill: { alignItems: "center", paddingVertical: 16 },
  voiceBottomHint: { fontSize: 14, color: "#64748B" },

  // Gallery mode placeholder
  modePlaceholder: { flex: 1, backgroundColor: "#0F172A", alignItems: "center", justifyContent: "center" },
  modePlaceholderText: { fontSize: 18, color: "#94A3B8", marginBottom: 24, textAlign: "center" },
  galleryPickBtn: { backgroundColor: colors.brand.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  galleryPickBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  // Bottom bar
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingBottom: 40, paddingTop: 12, zIndex: 10, backgroundColor: "rgba(0,0,0,0.6)" },
  modeTabs: { flexDirection: "row", justifyContent: "center", gap: 24, marginBottom: 16 },
  modeTab: { alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  modeTabActive: { backgroundColor: "rgba(255,255,255,0.15)" },
  modeTabText: { fontSize: 22, opacity: 0.5 },
  modeTabTextActive: { opacity: 1 },
  modeTabLabel: { fontSize: 11, color: "#94A3B8", marginTop: 2, fontWeight: "500" },
  modeTabLabelActive: { color: "#FFF", fontWeight: "700" },

  // Camera action buttons
  galleryBtn: { width: 48, height: 48, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: "#FFF", alignItems: "center", justifyContent: "center" },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#FFF" },
  flipBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },

  // Permission
  permissionContainer: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 32 },
  permissionTitle: { fontSize: 28, fontWeight: "800", color: colors.deep, marginBottom: 12, textAlign: "center" },
  permissionText: { fontSize: 16, color: colors.text.muted, textAlign: "center", lineHeight: 22, marginBottom: 32 },
  permissionButton: { backgroundColor: colors.brand.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, marginBottom: 16 },
  permissionButtonText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  backText: { color: colors.text.muted, fontSize: 15, fontWeight: "600" },
});
