import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router, Link } from "expo-router";
import { PipWisp } from "../../src/components/PipWisp";
import { colors } from "../../src/constants/colors";
import { Button } from "../../src/components/ui/Button";
import { useAction, useUpdateAction } from "../../src/hooks/useActions";
import { useNotifications } from "../../src/hooks/useNotifications";
import { useCalendar } from "../../src/hooks/useCalendar";
import { useCaptureStore } from "../../src/stores/captureStore";
import { useAuthStore } from "../../src/stores/authStore";
import { useHousehold } from "../../src/hooks/useHouseholds";
import { MemberPicker } from "../../src/components/household/MemberPicker";
import { shareAction, unshareAction } from "../../src/services/household";
import type { PickerMember } from "../../src/components/household/MemberPicker";
import { locationContextFromText, getLocationBadgeIcon } from "../../src/utils/locationContext";
import { useUpdateMemoryState } from "../../src/hooks/useMemories";
import type { MemoryState } from "../../src/services/memories";
import { FEATURES } from "../../src/constants/features";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { formatMemoryDate, formatMemoryTime, parseMemoryDate } from "../../src/utils/dateDisplay";

const CATEGORIES = [
  { key: "event", icon: "📅", label: "Calendar Event", color: colors.brand.primary },
  { key: "reminder", icon: "🔔", label: "Reminder", color: colors.accent.warm },
  { key: "list-item", icon: "📋", label: "List Item", color: colors.brand.primary },
  { key: "bill", icon: "💰", label: "Bill", color: colors.error },
  { key: "task", icon: "✅", label: "Task", color: colors.accent.complete },
  { key: "note", icon: "📝", label: "Note", color: colors.deep },
];

const PRIORITIES = [
  { key: "low", label: "Low", color: colors.text.muted },
  { key: "medium", label: "Medium", color: colors.accent.warm },
  { key: "high", label: "High", color: colors.error },
];

export default function ActionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: action, isLoading, error: actionError, refetch: refetchAction } = useAction(id || "");
  const updateAction = useUpdateAction();
  const queryClient = useQueryClient();
  const { scheduleReminder, requestPermissions: requestNotifPermissions } = useNotifications();
  const { createEvent, requestPermissions: requestCalendarPermissions } = useCalendar();
  const captureDraftAssigneeId = useCaptureStore((s) => s.draft.assigneeId);
  const captureDraftAssigneeName = useCaptureStore((s) => s.draft.assigneeDisplayName);
  const setDraft = useCaptureStore((s) => s.setDraft);
  const updateMemoryState = useUpdateMemoryState();
  const user = useAuthStore((s) => s.user);

  // Household sharing state
  const activeHouseholdId = action?.household_id || undefined;
  const { data: householdDetail, isLoading: isLoadingHousehold } = useHousehold(
    activeHouseholdId || ""
  );

  const [saveReceipt, setSaveReceipt] = useState<{
    title: string;
    date: string | null;
    calendarCreated: boolean | null;
    reminderScheduled: boolean | null;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
    if (!id || id === "demo" || !action) return;

    setIsSaving(true);
    try {
      // This PATCH is the source of truth: only show PIP's remembered-it receipt
      // after the backend has confirmed the memory is saved.
      const patchData: Record<string, unknown> = { status: "active", priority };
      if (clientAssigneeId) patchData.assignee_id = clientAssigneeId;
      await updateAction.mutateAsync({ id, data: patchData as any });

      // Keep both the detail and Memory Vault caches coherent before the user can
      // leave this screen. The vault still refetches from the API; this prevents a
      // stale cached row from briefly contradicting the saved confirmation.
      queryClient.setQueryData(["action", id], (current: typeof action | undefined) =>
        current ? { ...current, status: "active", priority, assignee_id: clientAssigneeId || undefined } : current
      );
      await queryClient.invalidateQueries({ queryKey: ["actions"] });

      // Household sharing is intentionally non-blocking. A successfully saved
      // personal memory must never be represented as unsaved because sharing failed.
      if (shareWithHousehold && selectedMemberIds.length > 0) {
        setIsSharing(true);
        try {
          if (isAlreadyShared) await unshareAction(id);
          await shareAction(id, selectedMemberIds);
        } catch (shareErr: unknown) {
          console.warn("Sharing failed:", shareErr);
        } finally {
          setIsSharing(false);
        }
      } else if (isAlreadyShared && !shareWithHousehold) {
        setIsSharing(true);
        try {
          await unshareAction(id);
        } catch (shareErr: unknown) {
          console.warn("Unshare failed:", shareErr);
        } finally {
          setIsSharing(false);
        }
      }

      // These are useful integrations, but they are not the memory save itself.
      // Record their real outcomes in the receipt instead of blocking or lying.
      let reminderScheduled: boolean | null = null;
      let calendarCreated: boolean | null = null;
      if (action.due_date) {
        try {
          const permitted = await requestNotifPermissions();
          reminderScheduled = permitted
            ? await scheduleReminder({
                title: `Reminder: ${action.title}`,
                body: action.description || "",
                date: new Date(parseMemoryDate(action.due_date).getTime() - 15 * 60 * 1000),
                actionId: id,
              })
            : false;
        } catch (reminderError: unknown) {
          console.warn("Reminder scheduling failed:", reminderError);
          reminderScheduled = false;
        }

        if (addToCalendar) {
          try {
            const permitted = await requestCalendarPermissions();
            if (permitted) {
              await createEvent({
                title: action.title,
                notes: action.description,
                startDate: parseMemoryDate(action.due_date),
                location: action.location || undefined,
                alarms: [{ relativeOffset: -15 }],
              });
              calendarCreated = true;
            } else {
              calendarCreated = false;
            }
          } catch (calendarError: unknown) {
            console.warn("Calendar event creation failed:", calendarError);
            calendarCreated = false;
          }
        }
      }

      setSaveReceipt({
        title: action.title,
        date: action.due_date || null,
        calendarCreated,
        reminderScheduled,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "PIP couldn't save that just yet. Please try again.";
      Alert.alert("Couldn't save memory", message);
    } finally {
      setIsSaving(false);
    }
  }, [action, id, priority, addToCalendar, shareWithHousehold, selectedMemberIds, isAlreadyShared, clientAssigneeId, updateAction, queryClient, scheduleReminder, requestNotifPermissions, createEvent, requestCalendarPermissions]);
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

  // Never replace a real failed retrieval with a demo appointment. A made-up
  // memory after a user entrusted us with one would violate the Memory Covenant.
  if (actionError || !action) {
    return (
      <View style={styles.unavailableContainer}>
        <PipWisp state="thinking" position="center-screen" size={88} background="light" />
        <Text style={styles.unavailableTitle}>I couldn't open that memory.</Text>
        <Text style={styles.unavailableText}>Your memory is safe. Please try loading it again.</Text>
        <View style={styles.unavailableActions}>
          <Button title="Try again" onPress={() => refetchAction()} variant="primary" size="md" />
          <Button title="Back to Memory Vault" onPress={() => router.replace("/(tabs)/actions")} variant="secondary" size="md" />
        </View>
      </View>
    );
  }

  const actionTitle = action.title;
  const actionDetail = action.description || "No additional details";
  const actionDate = action.due_date ? formatMemoryDate(action.due_date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "No date attached";
  const actionTime = action.due_date ? (formatMemoryTime(action.due_date, { hour: "numeric", minute: "2-digit" }) || "No time attached") : "No time attached";

  if (saveReceipt) {
    const receiptDate = saveReceipt.date
      ? formatMemoryDate(saveReceipt.date, { weekday: "long", month: "long", day: "numeric" })
      : "No date attached";
    return (
      <View style={styles.confirmedContainer}>
        <PipWisp state="success" position="center-screen" size={104} background="light" />
        <Text style={styles.confirmedTitle}>PIP remembered it!</Text>
        <View style={styles.receiptCard}>
          <Text style={styles.receiptTitle}>{saveReceipt.title}</Text>
          <Text style={styles.receiptRow}>Date · {receiptDate}</Text>
          <Text style={styles.receiptRow}>Memory Vault · Saved</Text>
          {saveReceipt.calendarCreated !== null && (
            <Text style={styles.receiptRow}>
              Calendar · {saveReceipt.calendarCreated ? "Event created" : "Not added"}
            </Text>
          )}
          {saveReceipt.reminderScheduled !== null && (
            <Text style={styles.receiptRow}>
              Reminder · {saveReceipt.reminderScheduled ? "Scheduled" : "Not scheduled"}
            </Text>
          )}
        </View>
        <Text style={styles.confirmedText}>You don't need to hold onto this now. I've got it.</Text>
        <View style={styles.receiptActions}>
          <Button
            title="View Memory"
            onPress={() => router.replace({ pathname: "/(tabs)/actions", params: { memoryId: id ?? "" } })}
            variant="primary"
            size="lg"
            fullWidth
          />
          <Button title="Done" onPress={() => router.replace("/(tabs)")} variant="secondary" size="md" fullWidth />
        </View>
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
              onPress={() => setCategory(c.key as "event" | "reminder" | "grocery_list" | "bill" | "task" | "note")}
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
              onPress={() => setPriority(p.key as "low" | "medium" | "high")}
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

        {/* Memory State — Beta Freeze: hidden pre-beta (FEATURES.MEMORY_STATE) */}
        {FEATURES.MEMORY_STATE && (
          <>
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
          </>
        )}
      </View>

      <View style={styles.actions}>
        <Button title="Yes, remember this" onPress={handleConfirm} variant="primary" size="lg" fullWidth loading={isSaving} />
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
  confirmedContainer: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 28 },
  confirmedTitle: { fontSize: 28, fontWeight: "800", color: colors.deep, marginTop: 12, marginBottom: 16, textAlign: "center" },
  confirmedText: { fontSize: 16, color: colors.text.muted, textAlign: "center", lineHeight: 22, marginTop: 18, marginBottom: 24 },
  receiptCard: { alignSelf: "stretch", backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 18 },
  receiptTitle: { color: colors.deep, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  receiptRow: { color: colors.text.muted, fontSize: 14, lineHeight: 22 },
  receiptActions: { alignSelf: "stretch", gap: 12 },
  unavailableContainer: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 28 },
  unavailableTitle: { fontSize: 22, fontWeight: "800", color: colors.deep, textAlign: "center", marginTop: 16, marginBottom: 8 },
  unavailableText: { fontSize: 15, color: colors.text.muted, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  unavailableActions: { alignSelf: "stretch", gap: 12 },

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
    color: colors.text.muted,
    lineHeight: 18,
    fontWeight: "500",
  },
});