import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { colors } from "../../src/constants/colors";
import { ActionCard } from "../../src/components/actions/ActionCard";
import { useActions } from "../../src/hooks/useActions";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { BrandGradient } from "../../src/components/ui/BrandGradient";
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
  const { data: actions, isLoading, error, refetch } = useActions();

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
        <Text style={styles.title}>Memory Vault</Text>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => router.push("/ask-pip")}
        ><Text style={styles.searchIcon}>🔍</Text></TouchableOpacity>
      </View>
      <View style={styles.segControl}>
        {FILTERS.map((f) => {
          const active = activeFilter === f.key;
          return (
            <BrandGradient
              key={f.key}
              colors={active ? colors.gradient.colors : ["transparent", "transparent"]}
              style={styles.seg}
              rounded={8}
            >
              <TouchableOpacity style={styles.segInner} onPress={() => setActiveFilter(f.key)}>
                <Text style={[styles.segText, active && styles.segTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            </BrandGradient>
          );
        })}
      </View>
      <ScrollView style={styles.list}>
        {isLoading ? (
          <><Skeleton lines={3} /><Skeleton lines={2} /><Skeleton lines={3} /></>
        ) : error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📶</Text>
            <Text style={styles.emptyTitle}>Couldn't reach SnapDone</Text>
            <Text style={styles.emptyText}>Your memories are safe — we just couldn't load them. Check your connection and try again.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : Object.keys(grouped).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧠</Text>
            <Text style={styles.emptyTitle}>Your Memory Vault is empty</Text>
            <Text style={styles.emptyText}>PIP remembers everything you save — photos, voice notes, and more. Capture your first memory below.</Text>
            <TouchableOpacity onPress={() => router.push("/capture")}>
              <BrandGradient style={styles.emptyCta} rounded={14}>
                <Text style={styles.emptyCtaText}>📷 Save your first memory</Text>
              </BrandGradient>
            </TouchableOpacity>
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
  seg: { flex: 1, paddingVertical: 4, borderRadius: 8 },
  segInner: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  segActive: { backgroundColor: colors.brand.primary },
  segText: { fontSize: 13, fontWeight: "600", color: colors.text.muted },
  segTextActive: { color: "#FFFFFF" },
  list: { flex: 1, paddingHorizontal: 20 },
  groupTitle: { fontSize: 15, fontWeight: "700", color: colors.deep, marginBottom: 8, marginTop: 12 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: colors.deep, marginBottom: 8, textAlign: "center" },
  emptyText: { fontSize: 15, color: colors.text.muted, textAlign: "center", lineHeight: 22 },
  retryBtn: {
    marginTop: 20,
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  retryText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  emptyCta: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: "transparent",
  },
  emptyCtaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});