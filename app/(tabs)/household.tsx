import { View, Text, StyleSheet } from "react-native";

export default function HouseholdScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Household</Text>
      <Text style={styles.subtitle}>Share actions and lists with your family</Text>

      {/* Invite section placeholder */}
      <View style={styles.inviteCard}>
        <Text style={styles.inviteIcon}>👨‍👩‍👧‍👦</Text>
        <Text style={styles.inviteTitle}>Invite your household</Text>
        <Text style={styles.inviteText}>
          Share grocery lists, chores, and events with up to 4 family members
        </Text>
        <View style={styles.inviteButton}>
          <Text style={styles.inviteButtonText}>Invite Members</Text>
        </View>
      </View>

      {/* Members placeholder */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No members yet</Text>
          <Text style={styles.emptySubtext}>Household sharing is available on the Household plan</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#64748B", marginBottom: 24 },
  inviteCard: { backgroundColor: "#ECFEFF", borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 24, borderWidth: 1, borderColor: "#0891B2" },
  inviteIcon: { fontSize: 40, marginBottom: 12 },
  inviteTitle: { fontSize: 18, fontWeight: "700", color: "#0E7490", marginBottom: 8 },
  inviteText: { fontSize: 14, color: "#0E7490", textAlign: "center", marginBottom: 16, lineHeight: 20 },
  inviteButton: { backgroundColor: "#0891B2", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  inviteButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  section: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 12 },
  emptyState: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0", borderStyle: "dashed" },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#1E293B", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#64748B", textAlign: "center" },
});