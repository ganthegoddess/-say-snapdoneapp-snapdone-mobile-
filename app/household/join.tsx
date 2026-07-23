import { useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert } from "react-native";
import { router } from "expo-router";
import { colors } from "../../src/constants/colors";
import { Button } from "../../src/components/ui/Button";
import { useJoinHousehold } from "../../src/hooks/useHouseholds";

export default function JoinHouseholdScreen() {
  const [inviteCode, setInviteCode] = useState("");
  const joinHousehold = useJoinHousehold();

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    const code = inviteCode.trim().toUpperCase();
    try {
      await joinHousehold.mutateAsync(code);
      Alert.alert("Joined!", "You're now part of the household.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to join household");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>🔑</Text>
        <Text style={styles.title}>Join a Household</Text>
        <Text style={styles.subtitle}>
          Enter the invite code shared by your household admin
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. ABCD-1234"
          placeholderTextColor={colors.text.muted}
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          autoFocus
        />
        <Button
          title={joinHousehold.isPending ? "Joining..." : "Join"}
          onPress={handleJoin}
          variant="primary"
          size="lg"
          fullWidth
          loading={joinHousehold.isPending}
        />
        <Button
          title="Cancel"
          onPress={() => router.back()}
          variant="ghost"
          size="md"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, justifyContent: "center", padding: 24 },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 32, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "800", color: colors.deep, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.text.muted, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  input: { width: "100%", backgroundColor: colors.surface, borderRadius: 10, padding: 16, fontSize: 18, color: colors.deep, borderWidth: 1, borderColor: colors.border, marginBottom: 20, textAlign: "center", letterSpacing: 2 },
});
