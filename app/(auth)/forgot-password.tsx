import { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Link, router } from "expo-router";
import { forgotPassword } from "../../src/services/auth";
import { ApiError } from "../../src/services/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const data = await forgotPassword(value);
      // Beta mode: the backend returns a single-use reset_token when the
      // account exists. Take the user straight to the new-password screen.
      if (data.reset_token) {
        router.replace({
          pathname: "/(auth)/reset-password",
          params: { token: data.reset_token, email: value },
        });
        return;
      }
      // Public mode: always the generic message — never reveal whether the
      // email is registered (Memory Covenant).
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "validation_error") {
          setError("Please enter a valid email address.");
        } else if (err.code === "rate_limited") {
          setError("Too many requests. Please wait a minute and try again.");
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

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.successText}>
          If that email is registered, a reset link is on its way.
        </Text>

        <View style={styles.form}>
          <Link href="/(auth)/reset-password" style={styles.quietLink}>
            Have a reset code? Enter it instead
          </Link>
          <Link href="/(auth)/sign-in" style={styles.backLink}>
            Back to Sign In
          </Link>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.title}>Forgot your password?</Text>
      <Text style={styles.subtitle}>No problem. We'll get you back in.</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#94A3B8"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
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
            <Text style={styles.submitText}>Send reset link</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/sign-in" style={styles.backLink}>
          Back to Sign In
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 24, paddingTop: 100, justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "800", color: "#0F172A", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#64748B", marginBottom: 32 },
  successText: { fontSize: 17, color: "#334155", lineHeight: 26, marginBottom: 8 },
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  input: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: "#E2E8F0", color: "#1E293B" },
  errorContainer: { backgroundColor: "#FEF2F2", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#FECACA" },
  errorText: { color: "#EF4444", fontSize: 14, textAlign: "center" },
  submitButton: { backgroundColor: "#0891B2", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  submitText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  backLink: { fontSize: 15, color: "#0891B2", fontWeight: "600", textAlign: "center", marginTop: 4 },
  quietLink: { fontSize: 15, color: "#64748B", fontWeight: "600", textAlign: "center", marginTop: 16 },
});
