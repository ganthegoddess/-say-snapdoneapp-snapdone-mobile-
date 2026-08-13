import { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { resetPassword } from "../../src/services/auth";
import { ApiError } from "../../src/services/api";

export default function ResetPasswordScreen() {
  // Deep link: snapdone://reset-password?token=…  (from the reset email)
  // Beta redirect: forgot-password passes token + email as params.
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const initialToken = typeof params.token === "string" ? params.token : "";
  const emailHint = typeof params.email === "string" ? params.email : "";

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    const value = token.trim();
    if (!value) {
      setError("Please enter your reset code.");
      return;
    }
    if (password.length < 8) {
      setError("Your new password needs to be at least 8 characters.");
      return;
    }
    if (password.length > 128) {
      setError("Your new password is too long (max 128 characters).");
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match. Please try again.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(value, password);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "invalid_token") {
          setError("This reset link has already been used or is no longer valid. Please request a new one.");
        } else if (err.code === "token_expired") {
          setError("This reset link has expired. Please request a new one.");
        } else if (err.code === "validation_error") {
          setError("Please check the reset code and make sure your password is at least 8 characters.");
        } else if (err.code === "rate_limited") {
          setError("Too many attempts. Please wait a minute and try again.");
        } else {
          setError(err.message || "Something went wrong. Please try again.");
        }
      } else {
        setError("Something went wrong. Please check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>You're all set</Text>
        <Text style={styles.successText}>
          Your password has been updated — sign in with your new password.
        </Text>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => router.replace("/(auth)/sign-in")}
        >
          <Text style={styles.submitText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.title}>Set a new password</Text>
      <Text style={styles.subtitle}>
        {emailHint ? `For ${emailHint}` : "Choose a new password to get back in."}
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Reset code</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste the code from your email"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          value={token}
          onChangeText={(text) => {
            setToken(text);
            if (error) setError(null);
          }}
          editable={!submitting}
        />

        <Text style={styles.label}>New password</Text>
        <TextInput
          style={styles.input}
          placeholder="At least 8 characters"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (error) setError(null);
          }}
          editable={!submitting}
        />

        <Text style={styles.label}>Confirm new password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter it once more"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          value={confirm}
          onChangeText={(text) => {
            setConfirm(text);
            if (error) setError(null);
          }}
          editable={!submitting}
        />

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Reset password</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/forgot-password" style={styles.backLink}>
          Request a new link
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 24, paddingTop: 100, justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "800", color: "#0F172A", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#64748B", marginBottom: 32 },
  successText: { fontSize: 17, color: "#334155", lineHeight: 26, marginBottom: 24 },
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  input: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: "#E2E8F0", color: "#1E293B" },
  errorContainer: { backgroundColor: "#FEF2F2", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#FECACA" },
  errorText: { color: "#EF4444", fontSize: 14, textAlign: "center" },
  submitButton: { backgroundColor: "#0891B2", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  submitText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  backLink: { fontSize: 15, color: "#0891B2", fontWeight: "600", textAlign: "center", marginTop: 4 },
});
