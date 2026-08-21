import { useState } from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { colors } from "../../constants/colors";
import { CaptureSheet } from "./CaptureSheet";
interface CaptureButtonProps {
  onPress?: () => void;
  showBadge?: boolean;
}
/**
 * Floating capture button (FAB). Opens the CaptureSheet — the product's
 * "What would you like me to remember?" menu: 📷 Photo / 🎤 Voice / 📝 Note.
 * Uses the brand signature teal→green gradient.
 */
export function CaptureButton({ onPress, showBadge = false }: CaptureButtonProps) {
  const [showSheet, setShowSheet] = useState(false);
  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    setShowSheet(true);
  };
  return (
    <>
      <TouchableOpacity style={styles.btn} onPress={handlePress} activeOpacity={0.85}>
        <Text style={styles.icon}>＋</Text>
        {showBadge && <View style={styles.badge} />}
      </TouchableOpacity>
      <CaptureSheet visible={showSheet} onClose={() => setShowSheet(false)} />
    </>
  );
}
const styles = StyleSheet.create({
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    position: "absolute",
    bottom: 24,
    right: 24,
    zIndex: 100,
  },
  icon: { fontSize: 30, color: colors.white, fontWeight: "700", lineHeight: 34 },
  badge: { position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
});
