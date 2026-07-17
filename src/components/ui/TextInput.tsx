import { View, Text, TextInput as RNTextInput, StyleSheet, type TextInputProps } from "react-native";
import { colors } from "../../constants/colors";
import { useState } from "react";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  variant?: "outlined" | "filled";
  size?: "lg" | "md" | "sm";
  suffix?: React.ReactNode;
}

export function TextInput({
  label,
  error,
  variant = "outlined",
  size = "md",
  suffix,
  style,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const containerStyles = [
    styles.container,
    variant === "filled" && styles.filled,
    focused && styles.focused,
    error && styles.error,
    styles[`size_${size}`],
  ];

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={containerStyles}>
        <RNTextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.text.muted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {suffix && <View style={styles.suffix}>{suffix}</View>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text.primary },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filled: { backgroundColor: "#F1F5F9", borderWidth: 0 },
  focused: { borderColor: colors.brand.primary, borderWidth: 2 },
  error: { borderColor: colors.error, borderWidth: 2 },
  size_lg: { height: 56, paddingHorizontal: 16 },
  size_md: { height: 48, paddingHorizontal: 14 },
  size_sm: { height: 40, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 16, color: colors.text.primary },
  suffix: { marginLeft: 8 },
  errorText: { fontSize: 13, color: colors.error, marginTop: 2 },
});