import { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Link, router } from "expo-router";
import { signup } from "../../src/services/auth";
import { useAuthStore } from "../../src/stores/authStore";

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const error = useAuthStore((state) => state.error);
  const setError = useAuthStore((state) => state.setError);

  const handleSignUp = async () => {
    if (!displayName.trim()) {
      Alert.alert("Error", "Please enter your name.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }
    if (!password || password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters.");
      return;
    }

    try {
      await signup({
        email: email.trim().toLowerCase(),
        password,
        display_name: displayName.trim(),
      });
      // Navigate to onboarding on success
      router.replace("/onboarding");
    } catch {
      // Error is set by the auth store automatically
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Start capturing and getting things done</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor="#94A3B8"
          autoCapitalize="words"
          value={displayName}
          onChangeText={(text) => {
            setDisplayName(text);
            if (error) setError(null);
          }}
        />

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
        <TextInput
          style={styles.input}
          placeholder="At least 8 characters"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (error) setError(null);
          }}
        />

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.signUpButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.signUpText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Link href="/(auth)/sign-in">
          <Text style={styles.footerLink}> Sign In</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 24, paddingTop: 80, justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "800", color: "#0F172A", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#64748B", marginBottom: 32 },
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  input: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: "#E2E8F0", color: "#1E293B" },
  errorContainer: { backgroundColor: "#FEF2F2", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#FECACA" },
  errorText: { color: "#EF4444", fontSize: 14, textAlign: "center" },
  signUpButton: { backgroundColor: "#0891B2", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  signUpText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { fontSize: 15, color: "#64748B" },
  footerLink: { fontSize: 15, color: "#0891B2", fontWeight: "600" },
});