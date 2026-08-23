import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { colors, spacing, typography, borderRadius, shadow } from "../../src/constants/colors";
import { ActionCard } from "../../src/components/actions/ActionCard";
import { useActions } from "../../src/hooks/useActions";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { BrandGradient } from "../../src/components/ui/BrandGradient";
import { Icon } from "../../src/components/ui/icons";
import { PipBadge } from "../../src/components/ui/PipBadge";
import { pip } from "../../src/constants/pipCopy";
import type { ActionItem } from "../../src/services/actions";
type FilterType = "all" | "pending" | "done" | "lists";
const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "To do" },
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
        <View>
          <Text style={styles.title}>Memory Vault</Text>
          <Text style={styles.subtitle}>Everything you've trusted PIP with.</Text>
        </View>
        {/*
          Search/retrieval route (ask-pip) is feature-flagged off during beta.
          Keep the affordance dormant rather than surfacing a broken action.
        */}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chipRowContent}
      >
        {FILTERS.map((f) => {
          const active = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              onPress={() => setActiveFilter(f.key)}
            >
              {active && <BrandGradient style={styles.chipFill} rounded={borderRadius.full} colors={colors.gradient.colors} />}
              <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView style={styles.list}>
        {isLoading ? (
          <><Skeleton lines={3} /><Skeleton lines={2} /><Skeleton lines={3} /></>
        ) : error ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}><Icon name="warning" size={34} color={colors.warm.amber} /></View>
            <Text style={styles.emptyTitle}>Couldn't reach SnapDone</Text>
            <Text style={styles.emptyText}>Your memories are safe — I just couldn't load them. Check your connection and try again.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : Object.keys(grouped).length === 0 ? (
          <View style={styles.empty}>
            <PipBadge size={84} />
            <Text style={styles.emptyTitle}>{pip.vaultEmpty.title}</Text>
            <Text style={styles.emptyText}>{pip.vaultEmpty.body}</Text>
            <TouchableOpacity onPress={() => router.push("/capture")}>
              <BrandGradient style={styles.emptyCta} rounded={borderRadius.full} colors={colors.gradient.colors}>
                <Icon name="camera" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.emptyCtaText}>Snap your first memory</Text>
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
  header: { paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: typography.sizes.h1, fontWeight: "800", color: colors.deep },
  subtitle: { fontSize: typography.sizes.bodySmall, color: colors.text.muted, marginTop: 2 },
  chipRow: { flexGrow: 0, marginBottom: spacing.md },
  chipRowContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: borderRadius.full, minHeight: 36, justifyContent: "center", overflow: "hidden" },
  chipActive: { backgroundColor: "transparent" },
  chipInactive: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  chipFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: borderRadius.full },
  chipText: { fontSize: typography.sizes.caption, fontWeight: "700" },
  chipTextActive: { color: "#FFFFFF" },
  chipTextInactive: { color: colors.text.primary },
  list: { flex: 1, paddingHorizontal: spacing.lg },
  groupTitle: { fontSize: 15, fontWeight: "700", color: colors.deep, marginBottom: 8, marginTop: 12 },
  empty: { alignItems: "center", paddingTop: 64, paddingHorizontal: spacing.lg },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.warm.pipGlow, alignItems: "center", justifyContent: "center", marginBottom: spacing.md, borderWidth: 1, borderColor: colors.warm.soft },
  emptyTitle: { fontSize: typography.sizes.h3, fontWeight: "700", color: colors.deep, marginBottom: 8, textAlign: "center" },
  emptyText: { fontSize: typography.sizes.bodySmall, color: colors.text.muted, textAlign: "center", lineHeight: 21 },
  retryBtn: { marginTop: spacing.lg, backgroundColor: colors.gradient.to, borderRadius: borderRadius.full, paddingVertical: 12, paddingHorizontal: 28 },
  retryText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  emptyCta: { marginTop: spacing.lg, flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 28, backgroundColor: "transparent" },
  emptyCtaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
