import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { colors } from "../../src/constants/colors";
import { ActionCard } from "../../src/components/actions/ActionCard";
import { CaptureButton } from "../../src/components/capture/CaptureButton";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { useActions } from "../../src/hooks/useActions";
import { useCompleteAction, useDeleteAction } from "../../src/hooks/useActions";
import type { ActionItem } from "../../src/services/actions";

type FilterKey = "all" | "reminders" | "events" | "lists" | "bills";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "reminders", label: "Reminders" },
  { key: "events", label: "Events" },
  { key: "lists", label: "Lists" },
  { key: "bills", label: "Bills" },
];

const TYPE_MAP: Record<string, string> = {
  reminder: "reminder",
  event: "event",
  "list-item": "list-item",
  bill: "bill",
  task: "task",
  grocery_list: "list-item",
};

const STATUS_MAP: Record<string, "pending" | "confirmed" | "dismissed"> = {
  pending_confirmation: "pending",
  active: "pending",
  completed: "confirmed",
  dismissed: "dismissed",
};

export default function HomeScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const { data: actions, isLoading } = useActions();
  const completeAction = useCompleteAction();
  const deleteAction = useDeleteAction();

  const filteredActions = (actions || []).filter((a: ActionItem) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "reminders") return a.action_type === "reminder";
    if (activeFilter === "events") return a.action_type === "event";
    if (activeFilter === "lists") return a.action_type === "task" || a.action_type === "grocery_list";
    if (activeFilter === "bills") return a.action_type === "bill";
    return true;
  });

  const todayActions = filteredActions.filter((a: ActionItem) => {
    if (!a.due_date) return false;
    const today = new Date();
    const due = new Date(a.due_date);
    return due.toDateString() === today.toDateString();
  });
  const upcomingActions = filteredActions.filter((a: ActionItem) => !todayActions.includes(a));

  const handleConfirm = useCallback((id: string) => {
    completeAction.mutate(id);
  }, [completeAction]);

  const handleDismiss = useCallback((id: string) => {
    deleteAction.mutate(id);
  }, [deleteAction]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return `Today at ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow at ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.headline}>Ready to capture?</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(tabs)/settings")} style={styles.settingsBtn}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.segControl}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.key} style={[styles.seg, activeFilter === f.key && styles.segActive]} onPress={() => setActiveFilter(f.key)}>
            <Text style={[styles.segText, activeFilter === f.key && styles.segTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.feed} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <>
            <Skeleton lines={3} />
            <Skeleton lines={2} />
            <Skeleton lines={3} />
          </>
        ) : filteredActions.length === 0 ? (
          <EmptyState
            icon="📸"
            title="Nothing here yet"
            description="Snap a photo, share from another app, or record a voice note to get started"
            actionLabel="Capture something"
            onAction={() => router.push("/capture")}
          />
        ) : (
          <>
            {todayActions.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Today</Text>
                {todayActions.map((a: ActionItem) => (
                  <ActionCard
                    key={a.id}
                    type={(TYPE_MAP[a.action_type] || "task") as any}
                    title={a.title}
                    detail={a.description}
                    date={formatDate(a.due_date)}
                    status={STATUS_MAP[a.status] || "pending"}
                    onConfirm={() => handleConfirm(a.id)}
                    onEdit={() => router.push(`/action/${a.id}`)}
                    onDismiss={() => handleDismiss(a.id)}
                  />
                ))}
              </View>
            )}
            {upcomingActions.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.sectionTitle}>Upcoming</Text>
                {upcomingActions.map((a: ActionItem) => (
                  <ActionCard
                    key={a.id}
                    type={(TYPE_MAP[a.action_type] || "task") as any}
                    title={a.title}
                    detail={a.description}
                    date={formatDate(a.due_date)}
                    status={STATUS_MAP[a.status] || "pending"}
                    onConfirm={() => handleConfirm(a.id)}
                    onEdit={() => router.push(`/action/${a.id}`)}
                    onDismiss={() => handleDismiss(a.id)}
                  />
                ))}
              </View>
            )}
            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>
      <CaptureButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 56, paddingBottom: 12 },
  greeting: { fontSize: 15, color: colors.text.muted, fontWeight: "500" },
  headline: { fontSize: 28, fontWeight: "800", color: colors.deep, marginTop: 2 },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  settingsIcon: { fontSize: 18 },
  segControl: { flexDirection: "row", marginHorizontal: 16, marginBottom: 16, backgroundColor: colors.white, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: colors.border },
  seg: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: 8 },
  segActive: { backgroundColor: colors.brand.primary },
  segText: { fontSize: 12, fontWeight: "600", color: colors.text.muted },
  segTextActive: { color: colors.white },
  feed: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.deep, marginBottom: 12, marginTop: 8 },
});