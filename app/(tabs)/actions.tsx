import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { colors, spacing, typography, borderRadius, shadow } from "../../src/constants/colors";
import { ActionCard } from "../../src/components/actions/ActionCard";
import { useActions } from "../../src/hooks/useActions";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { BrandGradient } from "../../src/components/ui/BrandGradient";
import { Icon } from "../../src/components/ui/icons";
import { PipBadge } from "../../src/components/ui/PipBadge";
import { PipEmptyState } from "../../src/components/ui/PipEmptyState";
import { pip } from "../../src/constants/pipCopy";
import type { ActionItem } from "../../src/services/actions";
import { formatMemoryDate } from "../../src/utils/dateDisplay";
// Memory Vault is a pure memory list — no segment/filter controls, no legacy
// "Lists" IA (owner: "the user never files/organizes"). DESIGN-SYSTEM §3.
const TYPE_MAP: Record<string, any> = {
  reminder: "reminder",
  event: "event",
  "list-item": "list-item",
  bill: "bill",
  task: "task",
  grocery_list: "list-item",
  note: "note",
};
const STATUS_MAP: Record<string, "pending" | "confirmed" | "dismissed"> = {
  pending_confirmation: "pending",
  active: "confirmed",
  completed: "confirmed",
  dismissed: "dismissed",
};
export default function ActionsScreen() {
  const { memoryId } = useLocalSearchParams<{ memoryId?: string }>();
  const { data: actions, isLoading, error, refetch } = useActions();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Defensive UI deadline: the API wrapper has its own timeout/retry, but a
  // screen must never leave a person staring at placeholders if a platform
  // request gets stuck below that layer.
  useEffect(() => {
    if (!isLoading) {
      setLoadingTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setLoadingTimedOut(true), 20_000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const retryLoad = () => {
    setLoadingTimedOut(false);
    void refetch();
  };
  const filtered = actions || [];
  const grouped = filtered.reduce((acc: Record<string, ActionItem[]>, a: ActionItem) => {
    const key = a.due_date ? formatMemoryDate(a.due_date, { weekday: "long", month: "long", day: "numeric" }) : "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {} as Record<string, ActionItem[]>);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <Text style={styles.title}>Memory Vault</Text>
          <Text style={styles.subtitle}>I've got everything you've trusted me with.</Text>
        </View>
        {/*
          Search/retrieval route (ask-pip) is feature-flagged off during beta.
          Keep the affordance dormant rather than surfacing a broken action.
        */}
      </View>
      <ScrollView style={styles.list}>
        {isLoading && !loadingTimedOut ? (
          <><Skeleton lines={3} /><Skeleton lines={2} /><Skeleton lines={3} /></>
        ) : error || loadingTimedOut ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}><Icon name="warning" size={34} color={colors.warm.amber} /></View>
            <Text style={styles.emptyTitle}>{loadingTimedOut ? "Still trying to reach SnapDone" : "Couldn't reach SnapDone"}</Text>
            <Text style={styles.emptyText}>
              {loadingTimedOut
                ? "Your memories are safe. This is taking longer than it should — please try again."
                : "Your memories are safe — I just couldn't load them. Check your connection and try again."}
            </Text>
            <TouchableOpacity style={styles.retryWrap} onPress={retryLoad} accessibilityRole="button" accessibilityLabel="Try loading Memory Vault again">
              <BrandGradient style={styles.retryBtn} rounded={borderRadius.full}>
                <Text style={styles.retryText}>Try again</Text>
              </BrandGradient>
            </TouchableOpacity>
          </View>
        ) : Object.keys(grouped).length === 0 ? (
          <PipEmptyState
            title={pip.vaultEmpty.title}
            body={pip.vaultEmpty.body}
            ctaLabel={pip.vaultEmpty.cta}
            onCta={() => router.push("/capture")}
          />
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
                  date={a.due_date ? formatMemoryDate(a.due_date, {}) : undefined}
                  status={STATUS_MAP[a.status] || "pending"}
                  isHighlighted={memoryId === a.id}
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
  header: { paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: 12, alignItems: "center" },
  headerInner: { alignItems: "center" },
  title: { fontSize: typography.sizes.h1, fontWeight: "800", color: colors.deep, textAlign: "center" },
  subtitle: { fontSize: typography.sizes.bodySmall, color: colors.text.muted, marginTop: 2, textAlign: "center" },
  list: { flex: 1, paddingHorizontal: spacing.lg },
  groupTitle: { fontSize: 15, fontWeight: "700", color: colors.deep, marginBottom: 8, marginTop: 12 },
  empty: { alignItems: "center", paddingTop: 64, paddingHorizontal: spacing.lg },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.warm.pipGlow, alignItems: "center", justifyContent: "center", marginBottom: spacing.md, borderWidth: 1, borderColor: colors.warm.soft },
  emptyTitle: { fontSize: typography.sizes.h3, fontWeight: "700", color: colors.deep, marginBottom: 8, textAlign: "center" },
  emptyText: { fontSize: typography.sizes.bodySmall, color: colors.text.muted, textAlign: "center", lineHeight: 21 },
  retryWrap: { marginTop: spacing.lg },
  retryBtn: { paddingVertical: 12, paddingHorizontal: 28, alignItems: "center" },
  retryText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  emptyCta: { marginTop: spacing.lg, flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 28, backgroundColor: "transparent" },
  emptyCtaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
