import { View, Text, StyleSheet } from "react-native";

export default function ListsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lists</Text>
      <Text style={styles.subtitle}>Grocery lists, task lists, and more</Text>

      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyText}>No lists yet</Text>
        <Text style={styles.emptySubtext}>
          Grocery lists from receipts, task lists from flyers, and to-do lists from voice notes will appear here
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#64748B", marginBottom: 32 },
  emptyState: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0", borderStyle: "dashed" },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#1E293B", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 20 },
});