/**
 * PipLoadingOverlay — PIP replaces all loading indicators
 *
 * Implements the spec requirement: PIP IS the loading state.
 * No spinners. No progress bars. No skeleton screens.
 * When syncing, searching, uploading, or processing — PIP.
 *
 * Spec reference: PIP-design-system.md section 11.1a
 */

import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Text, Animated as RNAnimated } from "react-native";
import { PipWisp } from "./PipWisp";

export interface PipLoadingOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Optional message shown below PIP */
  message?: string;
  /** Backdrop color (default: white at 80% opacity) */
  backdropColor?: string;
  /** Fade duration in ms (default: 300) */
  fadeDuration?: number;
}

export const PipLoadingOverlay: React.FC<PipLoadingOverlayProps> = ({
  visible,
  message = "Thinking...",
  backdropColor = "rgba(255, 255, 255, 0.80)",
  fadeDuration = 300,
}) => {
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: fadeDuration,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeDuration, opacity]);

  if (!visible && (opacity as any)._value === 0) return null;

  return (
    <RNAnimated.View
      style={[
        styles.overlay,
        { backgroundColor: backdropColor, opacity },
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <View style={styles.content}>
        <PipWisp
          state="thinking"
          position="center-content"
          size={38}
        />
        {message ? (
          <Text style={styles.message}>{message}</Text>
        ) : null}
      </View>
    </RNAnimated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  message: {
    fontSize: 14,
    fontFamily: "Inter",
    color: "#5B6B72",
    textAlign: "center",
    marginTop: 8,
  },
});
