import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../src/constants/colors";

/**
 * Calendar — coming soon (honest empty state).
 * No hardcoded/demo events: per Code Hygiene + Beta Freeze, fake data is
 * banned from shipping. Real calendar surfacing lands with the SnapBack
 * scheduler UI (actions with due dates will appear here).
 */
export default function CalendarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendar</Text>
      <Text style={styles.subtitle}>Your upcoming SnapBacks, in one place</Text>
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🗓️</Text>
        <Text style={styles.emptyText}>Nothing scheduled yet</Text>
        <Text style={styles.emptySubtext}>
          When you snap a date — a school flyer, a bill, an appointment — it
          will show up here at the right moment
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: "800", color: colors.deep, marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.text.muted, marginBottom: 32 },
  emptyState: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.deep, marginBottom: 8 },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});
