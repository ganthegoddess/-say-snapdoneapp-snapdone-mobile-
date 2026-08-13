/**
 * Join a Household — enter an invite code to join a family's household.
 *
 * Fixes the dead `/household/join` route referenced by app/(tabs)/household.tsx
 * ("Join a Household" button). The backend endpoint (POST /api/v1/households/join)
 * and the useJoinHousehold hook already exist — only the route file was missing,
 * which meant tapping the button threw a route-not-found error.
 *
 * Error codes mapped to friendly messages (see snapdone-api-reference.md §5):
 *   invalid_code     → 404  Invite code not found
 *   already_member   → 409  Already in this household
 *   household_full   → 403  Household reached max members (4)
 */
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "../../src/constants/colors";
import { Button } from "../../src/components/ui/Button";
import { useJoinHousehold } from "../../src/hooks/useHouseholds";
import { ApiError } from "../../src/services/api";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code:
    "That invite code doesn't match a household. Double-check it with the person who invited you.",
  already_member: "You're already a member of that household.",
  household_full: "That household has reached its member limit of 4.",
};

export default function JoinHouseholdScreen() {
  const joinHousehold = useJoinHousehold();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = inviteCode.trim().length > 0 && !joinHousehold.isPending;

  const handleJoin = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    setError(null);
    try {
      const result = await joinHousehold.mutateAsync(code);
      Alert.alert(
        "You're in.",
        `Welcome to ${result.name}. Shared lists and reminders will appear in your Household tab.`,
        [{ text: "Done", onPress: () => router.back() }]
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setError(ERROR_MESSAGES[err.code] ?? err.message ?? "Couldn't join this household. Please try again.");
      } else {
        setError("Couldn't join this household. Please try again.");
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Join a Household", presentation: "card" }} />
      <View style={styles.content}>
        <View style={styles.inviteCard}>
          <Text style={styles.inviteIcon}>🔑</Text>
          <Text style={styles.inviteTitle}>Enter your invite code</Text>
          <Text style={styles.inviteText}>
            Ask the person who started the household for their code — it looks like ABCD-EFGH.
          </Text>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder="ABCD-EFGH"
            placeholderTextColor={colors.text.muted}
            value={inviteCode}
            onChangeText={(text) => {
              setInviteCode(text);
              setError(null);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            maxLength={16}
            editable={!joinHousehold.isPending}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Button
            title={joinHousehold.isPending ? "Joining..." : "Join Household"}
            onPress={handleJoin}
            variant="primary"
            size="lg"
            fullWidth
            loading={joinHousehold.isPending}
            disabled={!canSubmit}
          />
          <TouchableOpacity
            style={{ marginTop: 12 }}
            onPress={() => router.back()}
            disabled={joinHousehold.isPending}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, justifyContent: "center", padding: 24 },
  inviteCard: {
    backgroundColor: colors.brand.light,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  inviteIcon: { fontSize: 40, marginBottom: 12 },
  inviteTitle: { fontSize: 18, fontWeight: "700", color: colors.brand.dark, marginBottom: 8 },
  inviteText: {
    fontSize: 14,
    color: colors.brand.dark,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.deep,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    letterSpacing: 2,
    textAlign: "center",
    fontWeight: "600",
  },
  inputError: { borderColor: colors.error },
  errorText: {
    width: "100%",
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 12,
  },
  cancelText: { fontSize: 15, color: colors.text.muted, fontWeight: "500" },
});
