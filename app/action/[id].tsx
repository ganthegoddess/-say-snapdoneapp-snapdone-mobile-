import { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal } from "react-native";
import { useLocalSearchParams, router, Link } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../src/constants/colors";
import { Button } from "../../src/components/ui/Button";
import { useAction, useUpdateAction } from "../../src/hooks/useActions";
import * as actionsService from "../../src/services/actions";
import { useNotifications } from "../../src/hooks/useNotifications";
import { useCalendar } from "../../src/hooks/useCalendar";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { useHouseholds, useHousehold, useAcknowledgeAction } from "../../src/hooks/useHouseholds";
import { useAuthStore } from "../../src/stores/authStore";

const NOTIF_EXPLAINER_KEY = "@snapdone/notif_explainer_seen";

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
  const { data: action, isLoading, isError, error, refetch } = useAction(id || "");
  const updateAction = useUpdateAction();

  const queryClient = useQueryClient();
  const scheduleMutation = useMutation({
    mutationFn: ({ actionId, dueDate, chosenSuggestion, source }: { actionId: string; dueDate: string; chosenSuggestion: string; source: "suggested" | "custom_date" }) =>
      actionsService.scheduleAction(actionId, dueDate, chosenSuggestion, source),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action", id as string] });
      queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });

  const calculateDateFromSuggestion = (suggestion: string): Date => {
    const now = new Date();
    const lower = suggestion.toLowerCase();
    if (lower.includes("tomorrow")) { const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }
    if (lower.includes("evening") || lower.includes("tonight")) { const d = new Date(now); d.setHours(18, 0, 0, 0); if (d <= now) d.setDate(d.getDate() + 1); return d; }
    if (lower.includes("saturday")) { const d = new Date(now); const days = (6 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + days); d.setHours(9, 0, 0, 0); return d; }
    if (lower.includes("sunday")) { const d = new Date(now); const days = (7 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + days); d.setHours(9, 0, 0, 0); return d; }
    if (lower.includes("weekend")) { const d = new Date(now); const days = (6 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + days); d.setHours(10, 0, 0, 0); return d; }
    if (lower.includes("next week")) { const d = new Date(now); d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0); return d; }
    const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d;
  };

  const handleScheduleSuggestion = useCallback((suggestion: string, source: "suggested" | "custom_date" = "suggested") => {
    const dueDate = calculateDateFromSuggestion(suggestion);
    scheduleMutation.mutate({ actionId: id as string, dueDate: dueDate.toISOString(), chosenSuggestion: suggestion, source });
  }, [id, scheduleMutation]);

  const scheduleDismiss = useCallback(() => { refetch(); }, [refetch]);

  const { scheduleReminder, requestPermissions: requestNotifPermissions } = useNotifications();
  const { createEvent, requestPermissions: requestCalendarPermissions } = useCalendar();
  const { data: households } = useHouseholds();
  const activeHouseholdId = households?.[0]?.id;
  const { data: householdDetails } = useHousehold(activeHouseholdId);
  const acknowledgeAction = useAcknowledgeAction();
  const currentUser = useAuthStore((s) => s.user);
  const householdMembers = householdDetails?.members || [];

  const [confirmed, setConfirmed] = useState(false);
  const [category, setCategory] = useState<string>(action?.action_type || "event");
  const [priority, setPriority] = useState<string>(action?.priority || "medium");
  const [addToCalendar, setAddToCalendar] = useState(true);
  const [shareWithHousehold, setShareWithHousehold] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [showNotifExplainer, setShowNotifExplainer] = useState(false);
  const [notifExplainerSeen, setNotifExplainerSeen] = useState(false);
  const [pendingNotifFlow, setPendingNotifFlow] = useState(false);

  // Auto-acknowledge shared actions assigned to current user
  useEffect(() => {
    if (action && action.assignee_id && currentUser && action.assignee_id === currentUser.id && action.status !== "completed") {
      acknowledgeAction.mutate(action.id);
    }
  }, [action?.id, action?.assignee_id, currentUser?.id]);

  // Check on mount if the notification explainer has been shown before
  useEffect(() => {
    AsyncStorage.getItem(NOTIF_EXPLAINER_KEY).then((val) => {
      if (val === "true") {
        setNotifExplainerSeen(true);
      }
    });
  }, []);

  const handleExplainerDone = useCallback(async () => {
    setShowNotifExplainer(false);
    setNotifExplainerSeen(true);
    setPendingNotifFlow(false);
    // Persist that the user has seen it
    await AsyncStorage.setItem(NOTIF_EXPLAINER_KEY, "true");
    // Now trigger the actual permission request
    const hasPermission = await requestNotifPermissions();
    // Schedule the reminder
    if (hasPermission && action?.due_date) {
      const reminderDate = new Date(new Date(action.due_date).getTime() - 15 * 60 * 1000);
      if (reminderDate > new Date()) {
        try {
          await scheduleReminder({
            title: `Reminder: ${action.title || "Untitled"}`,
            body: action.description || "Tap to view details",
            date: reminderDate,
            actionId: id,
          });
        } catch (notifErr: any) {
          console.warn("Failed to schedule notification:", notifErr);
        }
      }
    }
    // Add to calendar if toggled on
    if (addToCalendar) {
      const hasCalPermission = await requestCalendarPermissions();
      if (hasCalPermission && action?.due_date) {
        try {
          await createEvent({
            title: action.title || "Untitled Event",
            notes: action.description || undefined,
            startDate: new Date(action.due_date),
            location: action.location || undefined,
            alarms: [{ relativeOffset: -15 }],
          });
        } catch (calErr: any) {
          console.warn("Failed to create calendar event:", calErr);
        }
      }
    }
    setConfirmed(true);
  }, [requestNotifPermissions, scheduleReminder, action, id, addToCalendar, createEvent, requestCalendarPermissions]);

  const handleConfirm = useCallback(async () => {
    try {
      // Update on backend
      if (id && id !== "demo") {
        const updateData: Record<string, any> = { status: "active", priority };
        if (shareWithHousehold && activeHouseholdId) {
          updateData.household_id = activeHouseholdId;
          if (assigneeId) {
            updateData.assignee_id = assigneeId;
          }
        }
        await updateAction.mutateAsync({ id, data: updateData });
      }

      // Schedule notification reminder — show explainer first if needed
      if (action?.due_date) {
        if (notifExplainerSeen) {
          const reminderDate = new Date(new Date(action.due_date).getTime() - 15 * 60 * 1000);
          if (reminderDate > new Date()) {
            const hasNotifPermission = await requestNotifPermissions();
            if (hasNotifPermission) {
              try {
                await scheduleReminder({
                  title: `Reminder: ${action.title || "Untitled"}`,
                  body: action.description || "Tap to view details",
                  date: reminderDate,
                  actionId: id,
                });
              } catch (notifErr: any) {
                console.warn("Failed to schedule notification:", notifErr);
              }
            }
          }
        } else {
          // First time — show explainer
          setPendingNotifFlow(true);
          setShowNotifExplainer(true);
          return; // handleExplainerDone will continue the flow
        }
      }

      // Add to calendar if toggled on
      if (addToCalendar) {
        const hasCalPermission = await requestCalendarPermissions();
        if (hasCalPermission && action?.due_date) {
          try {
            await createEvent({
              title: action.title || "Untitled Event",
              notes: action.description || undefined,
              startDate: new Date(action.due_date),
              location: action.location || undefined,
              alarms: [{ relativeOffset: -15 }],
            });
          } catch (calErr: any) {
            console.warn("Failed to create calendar event:", calErr);
          }
        }
      }

      setConfirmed(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save action");
    }
  }, [action, id, priority, addToCalendar, updateAction, scheduleReminder, requestNotifPermissions, createEvent, requestCalendarPermissions, notifExplainerSeen, shareWithHousehold, activeHouseholdId, assigneeId]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton lines={5} hasImage />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not load action</Text>
          <Text style={styles.errorText}>
            The server may be unavailable. Please check your connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const actionTitle = action?.title || "Untitled";
  const actionDetail = action?.description || null;
  const actionDate = action?.due_date ? new Date(action.due_date).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "No date set";
  const actionTime = action?.due_date ? new Date(action.due_date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;

  if (confirmed) {
    return (
      <View style={styles.confirmedContainer}>
        <Text style={styles.confirmedIcon}>✨</Text>
        <Text style={styles.confirmedTitle}>Done. It's out of your head now.</Text>
        <Text style={styles.confirmedText}>
          {addToCalendar ? "Added to your calendar. " : ""}
          Snap saved. I'll snap back when it's time.
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
    <View style={{ flex: 1 }}>
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
              <View style={[styles.confidenceFill, { width: `${Math.min(Math.max((action?.confidence_score ?? 0.92) * 100, 5), 100)}%` }]} />
            </View>
          </View>
          <Text style={styles.confidencePct}>{Math.round(Math.min(Math.max((action?.confidence_score ?? 0.92) * 100, 5), 100))}%</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{actionTitle}</Text>
          {actionDetail && <Text style={styles.cardDetail}>{actionDetail}</Text>}
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
          {actionTime && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Time</Text>
              <TouchableOpacity style={styles.fieldValue}>
                <Text style={styles.fieldValueText}>{actionTime}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Scheduling prompt for dateless actions */}
          {!action?.due_date && action?.scheduling_suggestions && action.scheduling_suggestions.length > 0 && (
            <View style={styles.scheduleSection}>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>When should we remind you?</Text>
              <View style={styles.scheduleChips}>
                {action.scheduling_suggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.scheduleChip}
                    onPress={() => handleScheduleSuggestion(suggestion)}
                  >
                    <Text style={styles.scheduleChipText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.scheduleChipPick}>
                  <Text style={styles.scheduleChipText}>Pick a date</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.scheduleDismiss} onPress={() => scheduleDismiss()}>
                <Text style={styles.scheduleDismissText}>Not now</Text>
              </TouchableOpacity>
            </View>
          )}

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
          {shareWithHousehold && householdMembers.length > 1 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Assign to</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <TouchableOpacity
                  style={[styles.chip, !assigneeId && { backgroundColor: colors.brand.primary + "20", borderColor: colors.brand.primary }]}
                  onPress={() => setAssigneeId(null)}
                >
                  <Text style={[styles.chipLabel, !assigneeId && { color: colors.brand.primary }]}>Anyone</Text>
                </TouchableOpacity>
                {householdMembers.map((m) => (
                  <TouchableOpacity
                    key={m.user_id}
                    style={[styles.chip, assigneeId === m.user_id && { backgroundColor: colors.brand.primary + "20", borderColor: colors.brand.primary }]}
                    onPress={() => setAssigneeId(m.user_id === assigneeId ? null : m.user_id)}
                  >
                    <Text style={[styles.chipLabel, assigneeId === m.user_id && { color: colors.brand.primary }]}>
                      {m.display_name} {m.user_id === currentUser?.id ? "(Me)" : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        <View style={styles.actions}>
          <Button title="✓ Confirm & Save" onPress={handleConfirm} variant="primary" size="lg" fullWidth loading={updateAction.isPending} />
          <Button title="✏️ Edit Details" onPress={() => {}} variant="secondary" size="md" fullWidth />
          <Button title="Dismiss" onPress={() => router.replace("/(tabs)")} variant="ghost" size="md" fullWidth />
        </View>
      </ScrollView>

      {/* Notification explainer modal — shown once before first permission request */}
      <Modal visible={showNotifExplainer} transparent animationType="fade" onRequestClose={() => setShowNotifExplainer(false)}>
        <View style={styles.explainerOverlay}>
          <View style={styles.explainerCard}>
            <Text style={styles.explainerIcon}>🔔</Text>
            <Text style={styles.explainerTitle}>One quick thing...</Text>
            <Text style={styles.explainerText}>
              SnapDone needs permission to send you notifications for your own reminders — like appointments, bills, and tasks you've captured. We never send spam or promotional notifications.
            </Text>
            <TouchableOpacity style={styles.explainerBtn} onPress={handleExplainerDone}>
              <Text style={styles.explainerBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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

  // Notification explainer modal
  explainerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 32 },
  explainerCard: { backgroundColor: colors.white, borderRadius: 20, padding: 32, alignItems: "center", maxWidth: 340, width: "100%" },
  explainerIcon: { fontSize: 40, marginBottom: 12 },
  explainerTitle: { fontSize: 20, fontWeight: "800", color: colors.deep, marginBottom: 12, textAlign: "center" },
  explainerText: { fontSize: 15, color: colors.text.muted, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  explainerBtn: { backgroundColor: colors.brand.primary, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12 },
  explainerBtnText: { color: colors.white, fontSize: 17, fontWeight: "700" },

  // Error state
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: "700", color: colors.deep, marginBottom: 8, textAlign: "center" },
  errorText: { fontSize: 15, color: colors.text.muted, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  retryBtn: { backgroundColor: colors.brand.primary, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12 },
  retryBtnText: { color: colors.white, fontSize: 16, fontWeight: "600" },

  /* Scheduling prompt */
  scheduleSection: { marginBottom: 12 },
  scheduleChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  scheduleChip: { backgroundColor: colors.brand.light, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.brand.primary },
  scheduleChipPick: { backgroundColor: colors.white, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed" },
  scheduleChipText: { fontSize: 14, fontWeight: "600", color: colors.brand.dark },
  scheduleDismiss: { alignItems: "center", paddingVertical: 8 },
  scheduleDismissText: { fontSize: 14, color: colors.text.muted, fontWeight: "500" },

});