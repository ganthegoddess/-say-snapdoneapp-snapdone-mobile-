import { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { signin } from "../../src/services/auth";
import { useAuthStore } from "../../src/stores/authStore";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const error = useAuthStore((state) => state.error);
  const setError = useAuthStore((state) => state.setError);

  const handleSignIn = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }
    if (!password) {
      Alert.alert("Error", "Please enter your password.");
      return;
    }

    try {
      await signin({ email: email.trim().toLowerCase(), password });
      // Navigate to home on success
      router.replace("/(tabs)");
    } catch {
      // Error is set by the auth store automatically
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to your SnapDone account</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#94A3B8"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError(null);
          }}
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            placeholderTextColor="#94A3B8"
            secureTextEntry={!showPassword}
            autoComplete="password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError(null);
            }}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#94A3B8"
            />
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.signInButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.signInText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account?</Text>
        <Link href="/(auth)/sign-up">
          <Text style={styles.footerLink}> Sign Up</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 24, paddingTop: 100, justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "800", color: "#0F172A", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#64748B", marginBottom: 32 },
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  input: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: "#E2E8F0", color: "#1E293B" },
  passwordContainer: { position: "relative", justifyContent: "center" },
  passwordInput: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, paddingRight: 48, fontSize: 16, borderWidth: 1, borderColor: "#E2E8F0", color: "#1E293B" },
  eyeButton: { position: "absolute", right: 14, padding: 4 },
  errorContainer: { backgroundColor: "#FEF2F2", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#FECACA" },
  errorText: { color: "#EF4444", fontSize: 14, textAlign: "center" },
  signInButton: { backgroundColor: "#0891B2", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  signInText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { fontSize: 15, color: "#64748B" },
  footerLink: { fontSize: 15, color: "#0891B2", fontWeight: "600" },
});