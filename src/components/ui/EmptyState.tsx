import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../constants/colors";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="primary" size="md" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: colors.deep, marginBottom: 8, textAlign: "center" },
  description: { fontSize: 15, color: colors.text.muted, textAlign: "center", lineHeight: 22, marginBottom: 24 },
});