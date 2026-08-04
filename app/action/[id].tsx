import { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router, Link } from "expo-router";
import { colors } from "../../src/constants/colors";
import { Button } from "../../src/components/ui/Button";
import { useAction, useUpdateAction } from "../../src/hooks/useActions";
import { useNotifications } from "../../src/hooks/useNotifications";
import { useCalendar } from "../../src/hooks/useCalendar";
import { useCaptureStore } from "../../src/stores/captureStore";
import { useAuthStore } from "../../src/stores/authStore";
import { useHouseholdDetail } from "../../src/hooks/useHousehold";
import { MemberPicker } from "../../src/components/household/MemberPicker";
import { shareAction, unshareAction } from "../../src/services/household";
import type { PickerMember } from "../../src/components/household/MemberPicker";
import { locationContextFromText, getLocationBadgeIcon } from "../../src/utils/locationContext";
import { useUpdateMemoryState } from "../../src/hooks/useMemories";
import type { MemoryState } from "../../src/services/memories";
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
  const captureDraftAssigneeId = useCaptureStore((s) => s.draft.assigneeId);
  const captureDraftAssigneeName = useCaptureStore((s) => s.draft.assigneeDisplayName);
  const setDraft = useCaptureStore((s) => s.setDraft);
  const updateMemoryState = useUpdateMemoryState();
  const user = useAuthStore((s) => s.user);

  // Household sharing state
  const activeHouseholdId = action?.household_id || undefined;
  const { data: householdDetail, isLoading: isLoadingHousehold } = useHouseholdDetail(
    activeHouseholdId || ""
  );

  const [confirmed, setConfirmed] = useState(false);
  const [category, setCategory] = useState(action?.action_type || "event");
  const [priority, setPriority] = useState(action?.priority || "medium");
  const [addToCalendar, setAddToCalendar] = useState(true);
  const [shareWithHousehold, setShareWithHousehold] = useState(!!action?.household_id);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [clientAssigneeId, setClientAssigneeId] = useState<string | null>(captureDraftAssigneeId || null);
  const [clientAssigneeName, setClientAssigneeName] = useState<string | null>(captureDraftAssigneeName || null);
  const [memoryState, setMemoryState] = useState<MemoryState>(action?.memory_state || "active");

  // Household members excluding current user
  const householdMembers: PickerMember[] = useMemo(() => {
    if (!householdDetail?.members) return [];
    return householdDetail.members
      .filter((m) => m.user_id !== user?.id)
      .map((m) => ({
        user_id: m.user_id,
        display_name: m.display_name,
        role: m.role,
      }));
  }, [householdDetail, user?.id]);

  // Whether this action was already shared (has existing household_id)
  const isAlreadyShared = !!action?.household_id;

  const handleMemoryStateChange = useCallback(
    (newState: MemoryState) => {
      setMemoryState(newState);
      if (id && id !== "demo") {
        updateMemoryState.mutate({ actionId: id, state: newState });
      }
    },
    [id, updateMemoryState]
  );

  const handleConfirm = useCallback(async () => {
    try {
      // Update on backend
      if (id && id !== "demo") {
        const patchData: Record<string, unknown> = { status: "active", priority };
        if (clientAssigneeId) {
          patchData.assignee_id = clientAssigneeId;
        }
        await updateAction.mutateAsync({ id, data: patchData as any });
      }

      // Handle sharing — send selected members to backend
      if (shareWithHousehold && selectedMemberIds.length > 0 && id && id !== "demo") {
        setIsSharing(true);
        try {
          // If already shared and list changed, unshare then reshare
          if (isAlreadyShared) {
            await unshareAction(id);
          }
          await shareAction(id, selectedMemberIds);
        } catch (shareErr: any) {
          // Sharing is non-blocking — log but don't block confirmation
          console.warn("Sharing failed:", shareErr.message);
        } finally {
          setIsSharing(false);
        }
      } else if (isAlreadyShared && !shareWithHousehold && id && id !== "demo") {
        // User toggled sharing off on a previously shared action
        setIsSharing(true);
        try {
          await unshareAction(id);
        } catch (shareErr: any) {
          console.warn("Unshare failed:", shareErr.message);
        } finally {
          setIsSharing(false);
        }
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
  }, [action, id, priority, addToCalendar, shareWithHousehold, selectedMemberIds, isAlreadyShared, clientAssigneeId, updateAction, scheduleReminder, requestNotifPermissions, createEvent, requestCalendarPermissions]);

  const dismissAssignee = useCallback(() => {
    setClientAssigneeId(null);
    setClientAssigneeName(null);
    setDraft({ assigneeId: undefined, assigneeDisplayName: undefined });
  }, [setDraft]);

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
        <Text style={styles.confirmedTitle}>I've got it.</Text>
        <Text style={styles.confirmedText}>
          {addToCalendar ? "It's on your calendar. " : ""}
          I'll remind you when the time comes.
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
        <Text style={styles.headerTitle}>Does this look right?</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.confidenceBar}>
        <Text style={styles.confidenceIcon}>💡</Text>
        <View style={styles.confidenceContent}>
          <Text style={styles.confidenceText}>I understood this with high confidence</Text>
          <View style={styles.confidenceTrack}>
            <View style={[styles.confidenceFill, { width: "92%" }]} />
          </View>
        </View>
        <Text style={styles.confidencePct}>92%</Text>
      </View>

      {clientAssigneeName && (
        <View style={styles.assigneeBadge}>
          <View style={styles.assigneeInfo}>
            <Text style={styles.assigneeIcon}>👤</Text>
            <Text style={styles.assigneeText}>Assigned to {clientAssigneeName}</Text>
          </View>
          <TouchableOpacity onPress={dismissAssignee} hitSlop={8}>
            <Text style={styles.assigneeDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Location badge: show when backend returns a relevant location_context, or as static fallback */}
      {action?.location_context?.relevant ? (
        <View style={styles.locationBadge}>
          <Text style={styles.locationIcon}>{getLocationBadgeIcon(action.location)}</Text>
          <Text style={styles.locationText}>
            Near {action.location}
          </Text>
        </View>
      ) : action?.location && !action?.location_context ? (
        <View style={[styles.locationBadge, { opacity: 0.6 }]}>
          <Text style={styles.locationIcon}>{getLocationBadgeIcon(action.location)}</Text>
          <Text style={styles.locationText}>
            {action.location}
          </Text>
        </View>
      ) : null}

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

        {/* ── Household Sharing ── */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleIcon}>🏠</Text>
            <Text style={styles.toggleLabel}>
              {isAlreadyShared ? "Shared with household" : "Share with household"}
            </Text>
          </View>
          <Switch
            value={shareWithHousehold}
            onValueChange={(val) => {
              setShareWithHousehold(val);
              if (!val) setSelectedMemberIds([]);
            }}
            trackColor={{ false: colors.border, true: colors.accent.complete + "80" }}
            thumbColor={shareWithHousehold ? colors.accent.complete : "#f4f3f4"}
          />
        </View>

        {/* Show member picker when sharing is enabled */}
        {shareWithHousehold && (
          <View style={{ marginTop: 4, marginBottom: 8 }}>
            {isLoadingHousehold ? (
              <View style={styles.memberPickerLoading}>
                <ActivityIndicator size="small" color={colors.brand.primary} />
                <Text style={styles.memberPickerLoadingText}>Loading household...</Text>
              </View>
            ) : householdDetail ? (
              <MemberPicker
                members={householdMembers}
                selectedIds={selectedMemberIds}
                onSelectionChange={setSelectedMemberIds}
                isSaving={isSharing}
                alreadySharedIds={isAlreadyShared ? householdMembers.map(m => m.user_id) : []}
              />
            ) : (
              <View style={styles.memberPickerEmpty}>
                <Text style={styles.memberPickerEmptyIcon}>👨‍👩‍👧‍👦</Text>
                <Text style={styles.memberPickerEmptyText}>
                  You're not in a household yet.
                </Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/household")}>
                  <Text style={styles.memberPickerEmptyLink}>Create or join a household →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Show sharing info when already shared but toggle off */}
        {isAlreadyShared && !shareWithHousehold && (
          <View style={styles.unshareNotice}>
            <Text style={styles.unshareNoticeIcon}>🔓</Text>
            <Text style={styles.unshareNoticeText}>
              This memory will be unshared when you save. Other household members will no longer see it.
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Memory State */}
        <Text style={styles.sectionLabel}>Memory State</Text>
        <View style={styles.memoryChips}>
          {([
            { key: "active" as MemoryState, icon: "🔔", label: "SnapBack will remind me" },
            { key: "dormant" as MemoryState, icon: "💭", label: "PIP keeps an eye on this" },
            { key: "archived" as MemoryState, icon: "📦", label: "Don't surface this" },
          ]).map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.memoryChip, memoryState === s.key && styles.memoryChipActive]}
              onPress={() => handleMemoryStateChange(s.key)}
            >
              <Text style={styles.memoryChipIcon}>{s.icon}</Text>
              <Text style={[styles.memoryChipLabel, memoryState === s.key && styles.memoryChipLabelActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <Button title="Yes, remember this" onPress={handleConfirm} variant="primary" size="lg" fullWidth loading={updateAction.isPending} />
        <Button title="✏️ Edit Details" onPress={() => {}} variant="secondary" size="md" fullWidth />
        <Button title="Let this go" onPress={() => router.replace("/(tabs)")} variant="ghost" size="md" fullWidth />
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
  assigneeBadge: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.brand.light, borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.brand.primary + "30" },
  assigneeInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  assigneeIcon: { fontSize: 16 },
  assigneeText: { fontSize: 14, color: colors.brand.dark, fontWeight: "600", flex: 1 },
  assigneeDismiss: { fontSize: 16, color: colors.text.muted, fontWeight: "700", paddingHorizontal: 4 },
  locationBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  locationIcon: { fontSize: 16 },
  locationText: { fontSize: 14, color: colors.text.primary, fontWeight: "500", flex: 1 },
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

  // Memory state chips
  memoryChips: { gap: 8, marginBottom: 8 },
  memoryChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: 8 },
  memoryChipActive: { borderColor: colors.accent.warm, backgroundColor: colors.accent.warm + "15" },
  memoryChipIcon: { fontSize: 14 },
  memoryChipLabel: { fontSize: 13, color: colors.text.muted, fontWeight: "500" },
  memoryChipLabelActive: { color: colors.accent.warm, fontWeight: "600" },

  // Member picker loading
  memberPickerLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  memberPickerLoadingText: {
    fontSize: 13,
    color: colors.text.muted,
  },

  // Member picker empty (no household)
  memberPickerEmpty: {
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberPickerEmptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  memberPickerEmptyText: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: 8,
  },
  memberPickerEmptyLink: {
    fontSize: 14,
    color: colors.brand.primary,
    fontWeight: "600",
  },

  // Unshare notice
  unshareNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.accent.warm + "15",
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.accent.warm + "40",
  },
  unshareNoticeIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  unshareNoticeText: {
    flex: 1,
    fontSize: 13,
    color: colors.accent.warm,
    lineHeight: 18,
    fontWeight: "500",
  },
});