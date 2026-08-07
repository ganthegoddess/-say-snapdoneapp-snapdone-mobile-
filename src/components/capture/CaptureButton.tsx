import { useState } from "react";
import { TouchableOpacity, Text, View, StyleSheet, Modal, Pressable, Platform, ActionSheetIOS } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../../constants/colors";
import { router } from "expo-router";
import { useCaptureStore } from "../../stores/captureStore";

interface CaptureButtonProps {
  onPress?: () => void;
  showBadge?: boolean;
}

export function CaptureButton({ onPress, showBadge = false }: CaptureButtonProps) {
  const [showSheet, setShowSheet] = useState(false);
  const setDraft = useCaptureStore((state) => state.setDraft);

  const handlePress = () => {
    if (onPress) { onPress(); return; }
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Take Photo", "Choose from Library", "Cancel"],
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) router.push("/capture");
          else if (buttonIndex === 1) pickFromLibrary();
        }
      );
    } else {
      setShowSheet(true);
    }
  };

  const pickFromLibrary = async () => {
    setShowSheet(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setDraft({ source: "photo_library", uri, inputType: "image", status: "pending" });
      router.replace(`/processing/preview?uri=${encodeURIComponent(uri)}`);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.btn} onPress={handlePress} activeOpacity={0.85}>
        <Text style={styles.icon}>📷</Text>
        {showBadge && <View style={styles.badge} />}
      </TouchableOpacity>

      {/* Android action sheet modal */}
      <Modal visible={showSheet} transparent animationType="fade" onRequestClose={() => setShowSheet(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowSheet(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add a memory</Text>
            <TouchableOpacity style={styles.sheetOption} onPress={() => { setShowSheet(false); router.push("/capture"); }}>
              <Text style={styles.sheetIcon}>📸</Text>
              <Text style={styles.sheetText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetOption} onPress={pickFromLibrary}>
              <Text style={styles.sheetIcon}>🖼️</Text>
              <Text style={styles.sheetText}>Choose from Library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowSheet(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand.primary, alignItems: "center", justifyContent: "center", shadowColor: colors.brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8, position: "absolute", bottom: 24, right: 24, zIndex: 100 },
  icon: { fontSize: 26 },
  badge: { position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.deep, marginBottom: 16, textAlign: "center" },
  sheetOption: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  sheetIcon: { fontSize: 24 },
  sheetText: { fontSize: 17, color: colors.deep, fontWeight: "600" },
  sheetCancel: { marginTop: 12, paddingVertical: 14, alignItems: "center", backgroundColor: colors.surface, borderRadius: 12 },
  sheetCancelText: { fontSize: 16, color: colors.text.muted, fontWeight: "600" },
});