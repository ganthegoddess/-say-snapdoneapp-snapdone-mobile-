import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { colors } from "../../constants/colors";

interface SkeletonProps {
  lines?: number;
  hasImage?: boolean;
}

export function Skeleton({ lines = 3, hasImage = false }: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1], outputRange: [-200, 400],
  });

  return (
    <View style={styles.card}>
      {hasImage && <View style={styles.imageBlock} />}
      {Array.from({ length: lines }).map((_, i) => (
        <View key={i} style={[styles.line, { width: i === lines - 1 ? "60%" : "90%" }]} />
      ))}
      <Animated.View style={[styles.shimmer, { transform: [{ translateX }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    position: "relative",
  },
  imageBlock: { height: 120, backgroundColor: "#E2E8F0", borderRadius: 8, marginBottom: 12 },
  line: { height: 14, backgroundColor: "#E2E8F0", borderRadius: 7, marginBottom: 10 },
  shimmer: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(255,255,255,0.4)", width: 200,
  },
});