import { useState } from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { BrandGradient } from "../ui/BrandGradient";
import { shadow } from "../../constants/colors";
import { CaptureSheet } from "./CaptureSheet";
interface CaptureButtonProps {
  onPress?: () => void;
  showBadge?: boolean;
}
/**
 * Floating capture button (FAB) — the single brand moment on Home. Uses the
 * signature teal→green gradient circle with a white "+" glyph + warm shadow,
 * exactly like the website's primary CTA. Opens the CaptureSheet.
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
      <TouchableOpacity style={styles.wrap} onPress={handlePress} activeOpacity={0.85}>
        <BrandGradient style={[styles.btn, shadow.fab as any]}>
          {showBadge && <View style={styles.badge} />}
          <Text style={styles.icon}>＋</Text>
        </BrandGradient>
      </TouchableOpacity>
      <CaptureSheet visible={showSheet} onClose={() => setShowSheet(false)} />
    </>
  );
}
const styles = StyleSheet.create({
  wrap: { position: "absolute", bottom: 24, right: 24, zIndex: 100 },
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 30, color: "#FFFFFF", fontWeight: "700", lineHeight: 34 },
  badge: { position: "absolute", top: 6, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444" },
});
