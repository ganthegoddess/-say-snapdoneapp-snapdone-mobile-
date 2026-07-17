import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { colors } from "../../src/constants/colors";
import { ActionCard } from "../../src/components/actions/ActionCard";
import { useActions } from "../../src/hooks/useActions";
import { Skeleton } from "../../src/components/ui/Skeleton";
import type { ActionItem } from "../../src/services/actions";

type FilterType = "all" | "pending" | "done" | "lists";
const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "done", label: "Done" },
  { key: "lists", label: "Lists" },
];

const TYPE_MAP: Record<string, any> = {
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

export default function ActionsScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const { data: actions, isLoading } = useActions();

  const filtered = (actions || []).filter((a: ActionItem) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "pending") return a.status === "pending_confirmation" || a.status === "active";
    if (activeFilter === "done") return a.status === "completed";
    if (activeFilter === "lists") return a.action_type === "task" || a.action_type === "grocery_list";
    return true;
  });

  const grouped = filtered.reduce((acc: Record<string, ActionItem[]>, a: ActionItem) => {
    const key = a.due_date ? new Date(a.due_date).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) : "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {} as Record<string, ActionItem[]>);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Actions</Text>
        <TouchableOpacity style={styles.searchBtn}><Text style={styles.searchIcon}>🔍</Text></TouchableOpacity>
      </View>
      <View style={styles.segControl}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.key} style={[styles.seg, activeFilter === f.key && styles.segActive]} onPress={() => setActiveFilter(f.key)}>
            <Text style={[styles.segText, activeFilter === f.key && styles.segTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={styles.list}>
        {isLoading ? (
          <><Skeleton lines={3} /><Skeleton lines={2} /><Skeleton lines={3} /></>
        ) : Object.keys(grouped).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No {activeFilter} actions</Text>
            <Text style={styles.emptyText}>Nothing to show here yet.</Text>
          </View>
        ) : (
          (Object.entries(grouped) as [string, ActionItem[]][]).map(([dateLabel, items]) => (
            <View key={dateLabel}>
              <Text style={styles.groupTitle}>{dateLabel}</Text>
              {items.map((a) => (
                <ActionCard
                  key={a.id}
                  type={TYPE_MAP[a.action_type] || "task"}
                  title={a.title}
                  detail={a.description}
                  date={a.due_date ? new Date(a.due_date).toLocaleDateString() : undefined}
                  status={STATUS_MAP[a.status] || "pending"}
                  onConfirm={() => {}}
                  onEdit={() => router.push(`/action/${a.id}`)}
                  onDismiss={() => {}}
                />
              ))}
            </View>
          ))
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", color: colors.deep },
  searchBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  searchIcon: { fontSize: 18 },
  segControl: { flexDirection: "row", marginHorizontal: 20, marginBottom: 16, backgroundColor: colors.white, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: colors.border },
  seg: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  segActive: { backgroundColor: colors.brand.primary },
  segText: { fontSize: 14, fontWeight: "600", color: colors.text.muted },
  segTextActive: { color: colors.white },
  list: { flex: 1, paddingHorizontal: 20 },
  groupTitle: { fontSize: 15, fontWeight: "700", color: colors.deep, marginBottom: 8, marginTop: 12 },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: colors.deep, marginBottom: 8 },
  emptyText: { fontSize: 15, color: colors.text.muted, textAlign: "center" },
});