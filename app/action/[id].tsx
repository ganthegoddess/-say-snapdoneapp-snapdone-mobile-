import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { useLocalSearchParams, router, Link } from "expo-router";
import { colors } from "../../src/constants/colors";
import { Button } from "../../src/components/ui/Button";
import { useAction, useUpdateAction } from "../../src/hooks/useActions";
import { useNotifications } from "../../src/hooks/useNotifications";
import { useCalendar } from "../../src/hooks/useCalendar";
import { Skeleton } from "../../src/components/ui/Skeleton";

const CATEGORIES = [
  { key: "event", icon: "📅", label: "Calendar Event", color: colors.brand.primary },
  { key: "reminder", icon: "🔔", label: "Reminder", color: colors.accent.warm },
  { key: "list-item", icon: "📋", label: "List Item", color: colors.brand.primary },
  { key: "bill", icon: "💰", label: "Bill", color: colors.error },
  { key: "task", icon: "✅", label: "Task", color: colors.accent.complete },
];

const PRIORITIES = [
  { key: "low", label: "Low", color: colors.text.muted },
  { key: "medium", label: "Medium", color: colors.accent.warm },
  { key: "high", label: "High", color: colors.error },
];

export default function ActionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: action, isLoading } = useAction(id || "");
  const updateAction = useUpdateAction();
  const { scheduleReminder, requestPermissions: requestNotifPermissions } = useNotifications();
  const { createEvent, requestPermissions: requestCalendarPermissions } = useCalendar();

  const [confirmed, setConfirmed] = useState(false);
  const [category, setCategory] = useState(action?.action_type || "event");
  const [priority, setPriority] = useState(action?.priority || "medium");
  const [addToCalendar, setAddToCalendar] = useState(true);
  const [shareWithHousehold, setShareWithHousehold] = useState(false);

  const handleConfirm = useCallback(async () => {
    try {
      // Update on backend
      if (id && id !== "demo") {
        await updateAction.mutateAsync({ id, data: { status: "active", priority } });
      }

      // Schedule notification reminder
      if (action?.due_date) {
        const hasNotifPermission = await requestNotifPermissions();
        if (hasNotifPermission) {
          await scheduleReminder({
            title: `Reminder: ${action.title}`,
            body: action.description || "",
            date: new Date(new Date(action.due_date).getTime() - 15 * 60 * 1000), // 15 min before
            actionId: id,
          });
        }
      }

      // Add to calendar if toggled on
      if (addToCalendar) {
        const hasCalPermission = await requestCalendarPermissions();
        if (hasCalPermission && action?.due_date) {
          await createEvent({
            title: action.title,
            notes: action.description,
            startDate: new Date(action.due_date),
            location: action.location || undefined,
            alarms: [{ relativeOffset: -15 }],
          });
        }
      }

      setConfirmed(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save action");
    }
  }, [action, id, priority, addToCalendar, updateAction, scheduleReminder, requestNotifPermissions, createEvent, requestCalendarPermissions]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton lines={5} hasImage />
      </View>
    );
  }

  const actionTitle = action?.title || "Dentist Appointment";
  const actionDetail = action?.description || "123 Main St, Suite 200 · Dr. Smith";
  const actionDate = action?.due_date ? new Date(action.due_date).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "April 12, 2026";
  const actionTime = action?.due_date ? new Date(action.due_date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "3:00 PM";

  if (confirmed) {
    return (
      <View style={styles.confirmedContainer}>
        <Text style={styles.confirmedIcon}>✅</Text>
        <Text style={styles.confirmedTitle}>Action Created!</Text>
        <Text style={styles.confirmedText}>
          {addToCalendar ? "Added to your calendar. " : ""}
          A reminder has been set.
        </Text>
        <Link href="/(tabs)" asChild>
          <TouchableOpacity style={styles.backHomeBtn}>
            <Text style={styles.backHomeText}>Back to Home</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Link href="/(tabs)" asChild>
          <TouchableOpacity><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
        </Link>
        <Text style={styles.headerTitle}>Review Action</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.confidenceBar}>
        <Text style={styles.confidenceIcon}>🤖</Text>
        <View style={styles.confidenceContent}>
          <Text style={styles.confidenceText}>AI extracted this with high confidence</Text>
          <View style={styles.confidenceTrack}>
            <View style={[styles.confidenceFill, { width: "92%" }]} />
          </View>
        </View>
        <Text style={styles.confidencePct}>92%</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{actionTitle}</Text>
        <Text style={styles.cardDetail}>{actionDetail}</Text>
        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, category === c.key && { backgroundColor: c.color + "20", borderColor: c.color }]}
              onPress={() => setCategory(c.key)}
            >
              <Text style={styles.chipIcon}>{c.icon}</Text>
              <Text style={[styles.chipLabel, category === c.key && { color: c.color }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Date</Text>
          <TouchableOpacity style={styles.fieldValue}>
            <Text style={styles.fieldValueText}>{actionDate}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Time</Text>
          <TouchableOpacity style={styles.fieldValue}>
            <Text style={styles.fieldValueText}>{actionTime}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.priorityChip, priority === p.key && { backgroundColor: p.color + "20", borderColor: p.color }]}
              onPress={() => setPriority(p.key)}
            >
              <Text style={[styles.priorityText, priority === p.key && { color: p.color, fontWeight: "700" }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleIcon}>📅</Text>
            <Text style={styles.toggleLabel}>Add to calendar</Text>
          </View>
          <Switch value={addToCalendar} onValueChange={setAddToCalendar} trackColor={{ false: colors.border, true: colors.brand.primary + "80" }} thumbColor={addToCalendar ? colors.brand.primary : "#f4f3f4"} />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleIcon}>🏠</Text>
            <Text style={styles.toggleLabel}>Share with household</Text>
          </View>
          <Switch value={shareWithHousehold} onValueChange={setShareWithHousehold} trackColor={{ false: colors.border, true: colors.accent.complete + "80" }} thumbColor={shareWithHousehold ? colors.accent.complete : "#f4f3f4"} />
        </View>
      </View>

      <View style={styles.actions}>
        <Button title="✓ Confirm & Save" onPress={handleConfirm} variant="primary" size="lg" fullWidth loading={updateAction.isPending} />
        <Button title="✏️ Edit Details" onPress={() => {}} variant="secondary" size="md" fullWidth />
        <Button title="Dismiss" onPress={() => router.replace("/(tabs)")} variant="ghost" size="md" fullWidth />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 20, paddingTop: 56 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  backBtn: { fontSize: 16, color: colors.brand.primary, fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.deep },
  confidenceBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.brand.light, borderRadius: 10, padding: 12, marginBottom: 16, gap: 10 },
  confidenceIcon: { fontSize: 18 },
  confidenceContent: { flex: 1 },
  confidenceText: { fontSize: 13, color: colors.brand.dark, fontWeight: "500", marginBottom: 4 },
  confidenceTrack: { height: 4, backgroundColor: colors.brand.primary + "30", borderRadius: 2 },
  confidenceFill: { height: 4, backgroundColor: colors.brand.primary, borderRadius: 2 },
  confidencePct: { fontSize: 13, fontWeight: "700", color: colors.brand.dark },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 24 },
  cardTitle: { fontSize: 22, fontWeight: "700", color: colors.deep, marginBottom: 6 },
  cardDetail: { fontSize: 15, color: colors.text.muted, lineHeight: 22, marginBottom: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: colors.text.primary, marginBottom: 10 },
  chipScroll: { marginBottom: 16 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginRight: 8, backgroundColor: colors.surface },
  chipIcon: { fontSize: 16 },
  chipLabel: { fontSize: 13, fontWeight: "600", color: colors.text.muted },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  fieldLabel: { fontSize: 15, color: colors.text.muted },
  fieldValue: { backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  fieldValueText: { fontSize: 15, color: colors.deep, fontWeight: "500" },
  priorityRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  priorityChip: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  priorityText: { fontSize: 14, fontWeight: "600", color: colors.text.muted },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleIcon: { fontSize: 18 },
  toggleLabel: { fontSize: 15, color: colors.text.primary },
  actions: { gap: 12, paddingBottom: 40 },
  confirmedContainer: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 32 },
  confirmedIcon: { fontSize: 64, marginBottom: 20 },
  confirmedTitle: { fontSize: 28, fontWeight: "800", color: colors.accent.complete, marginBottom: 12 },
  confirmedText: { fontSize: 16, color: colors.text.muted, textAlign: "center", lineHeight: 22, marginBottom: 32 },
  backHomeBtn: { backgroundColor: colors.brand.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  backHomeText: { color: colors.white, fontSize: 17, fontWeight: "700" },
});