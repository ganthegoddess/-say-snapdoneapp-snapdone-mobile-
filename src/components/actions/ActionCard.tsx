import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../../constants/colors";

type ActionType = "event" | "reminder" | "list-item" | "bill" | "task";
type ActionStatus = "pending" | "confirmed" | "dismissed";
type CaptureSource = "photo" | "screenshot" | "voice" | "email";

interface ActionCardProps {
  type: ActionType;
  title: string;
  detail?: string;
  date?: string;
  amount?: string;
  status: ActionStatus;
  source?: CaptureSource;
  onConfirm?: () => void;
  onEdit?: () => void;
  onDismiss?: () => void;
}

const TYPE_CONFIG: Record<ActionType, { icon: string; color: string; label: string }> = {
  event: { icon: "📅", color: colors.brand.primary, label: "Event" },
  reminder: { icon: "🔔", color: colors.accent.warm, label: "Reminder" },
  "list-item": { icon: "📋", color: colors.brand.primary, label: "List" },
  bill: { icon: "💰", color: colors.error, label: "Bill" },
  task: { icon: "✅", color: colors.accent.complete, label: "Task" },
};

export function ActionCard({ type, title, detail, date, amount, status, source, onConfirm, onEdit, onDismiss }: ActionCardProps) {
  const config = TYPE_CONFIG[type];
  const isDone = status === "confirmed";
  const isDismissed = status === "dismissed";
  if (isDismissed) return null;

  return (
    <View style={[styles.card, isDone && styles.cardDone]}>
      <View style={styles.header}>
        <View style={styles.typeRow}>
          <Text style={styles.typeIcon}>{config.icon}</Text>
          <View style={[styles.dot, { backgroundColor: config.color }]} />
          <Text style={[styles.typeLabel, { color: config.color }]}>{config.label}</Text>
        </View>
        {source && <Text style={styles.source}>{source}</Text>}
      </View>
      <Text style={[styles.title, isDone && styles.titleDone]} numberOfLines={2}>{title}</Text>
      {detail && <Text style={styles.detail} numberOfLines={1}>{detail}</Text>}
      {(date || amount) && (
        <View style={styles.meta}>
          {date && <Text style={styles.metaText}>{date}</Text>}
          {amount && <Text style={[styles.metaText, styles.amount]}>{amount}</Text>}
        </View>
      )}
      {status === "pending" && (
        <View style={styles.actions}>
          {onConfirm && <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}><Text style={styles.confirmText}>✓</Text></TouchableOpacity>}
          {onEdit && <TouchableOpacity style={styles.editBtn} onPress={onEdit}><Text style={styles.editText}>✏️</Text></TouchableOpacity>}
          {onDismiss && <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}><Text style={styles.dismissText}>✕</Text></TouchableOpacity>}
        </View>
      )}
      {isDone && <View style={styles.doneBadge}><Text style={styles.doneText}>✓ Done</Text></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2, marginBottom: 10 },
  cardDone: { borderLeftWidth: 4, borderLeftColor: colors.accent.complete, opacity: 0.75 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  typeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  typeIcon: { fontSize: 14 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  typeLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  source: { fontSize: 10, color: colors.text.muted, textTransform: "capitalize" },
  title: { fontSize: 16, fontWeight: "700", color: colors.deep, marginBottom: 3, lineHeight: 20 },
  titleDone: { textDecorationLine: "line-through", color: colors.text.muted },
  detail: { fontSize: 13, color: colors.text.muted, lineHeight: 18, marginBottom: 6 },
  meta: { flexDirection: "row", gap: 10, marginBottom: 8 },
  metaText: { fontSize: 12, color: colors.text.muted },
  amount: { fontWeight: "600", color: colors.deep },
  actions: { flexDirection: "row", gap: 6, marginTop: 2 },
  confirmBtn: { backgroundColor: colors.accent.complete, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6 },
  confirmText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  editBtn: { backgroundColor: colors.brand.light, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6 },
  editText: { fontSize: 14 },
  dismissBtn: { backgroundColor: colors.surface, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  dismissText: { fontSize: 14, color: colors.text.muted },
  doneBadge: { position: "absolute", top: 8, right: 8, backgroundColor: colors.accent.complete, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  doneText: { color: "#FFF", fontSize: 10, fontWeight: "600" },
});