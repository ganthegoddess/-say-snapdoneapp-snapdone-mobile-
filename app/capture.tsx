import { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../src/constants/colors";
import { useCaptureStore } from "../src/stores/captureStore";

export default function CaptureScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<"off" | "on" | "auto">("off");
  const [showGrid, setShowGrid] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const cameraRef = useRef<CameraView>(null);
  const setDraft = useCaptureStore((state) => state.setDraft);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, exif: false });
    if (photo?.uri) {
      setDraft({ source: "camera", uri: photo.uri, inputType: "image", status: "pending" });
      setTimeout(() => router.replace(`/processing/preview?uri=${encodeURIComponent(photo.uri)}`), 500);
    }
  };

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

  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Access</Text>
        <Text style={styles.permissionText}>SnapDone needs camera access to capture receipts, flyers, notes, and more.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Not now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={handlePickFromGallery} style={styles.galleryBtn}>
          <Text style={{ fontSize: 22 }}>🖼️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCapture} style={styles.captureBtn}>
          <View style={styles.captureInner} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFacing(facing === "back" ? "front" : "back")} style={styles.flipBtn}>
          <Text style={{ color: "#FFF", fontSize: 24 }}>↻</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
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
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingHorizontal: 30, paddingBottom: 40, paddingTop: 20, zIndex: 10 },
  galleryBtn: { width: 48, height: 48, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: "#FFF", alignItems: "center", justifyContent: "center" },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#FFF" },
  flipBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" },
  permissionContainer: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 32 },
  permissionTitle: { fontSize: 28, fontWeight: "800", color: colors.deep, marginBottom: 12, textAlign: "center" },
  permissionText: { fontSize: 16, color: colors.text.muted, textAlign: "center", lineHeight: 22, marginBottom: 32 },
  permissionButton: { backgroundColor: colors.brand.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, marginBottom: 16 },
  permissionButtonText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  backText: { color: colors.text.muted, fontSize: 15, fontWeight: "600" },
});