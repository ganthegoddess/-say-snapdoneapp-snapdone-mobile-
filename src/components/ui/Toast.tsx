import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { colors } from "../../constants/colors";

type ToastType = "success" | "error" | "info" | "reminder";

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

const TYPE_CONFIG: Record<ToastType, { icon: string; bg: string }> = {
  success: { icon: "✓", bg: colors.accent.complete },
  error: { icon: "✕", bg: colors.error },
  info: { icon: "ℹ", bg: colors.brand.primary },
  reminder: { icon: "🔔", bg: colors.accent.warm },
};

export function Toast({ message, type = "info", visible, onDismiss, duration = 3000 }: ToastProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const config = TYPE_CONFIG[type];

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(slideAnim, { toValue: -100, duration: 250, useNativeDriver: true }).start(() => onDismiss());
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { backgroundColor: config.bg, transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute", top: 50, left: 16, right: 16,
    flexDirection: "row", alignItems: "center",
    padding: 14, borderRadius: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
    zIndex: 9999,
  },
  icon: { color: "#FFF", fontSize: 16, fontWeight: "700", marginRight: 10 },
  message: { flex: 1, color: "#FFF", fontSize: 15, fontWeight: "500" },
  dismissBtn: { padding: 4, marginLeft: 8 },
  dismissText: { color: "#FFF", fontSize: 14, opacity: 0.8 },
});