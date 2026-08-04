import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { colors } from "../../constants/colors";

export interface PickerMember {
  user_id: string;
  display_name: string;
  role: "admin" | "member";
}

interface MemberPickerProps {
  /** All household members (excluding current user) */
  members: PickerMember[];
  /** Currently selected member IDs */
  selectedIds: string[];
  /** Called when selection changes */
  onSelectionChange: (selectedIds: string[]) => void;
  /** Whether sharing is currently saving */
  isSaving?: boolean;
  /** Whether this action is already shared — shows current recipients */
  alreadySharedIds?: string[];
}

/**
 * MemberPicker — lets users select which household members
 * to share a memory with. Inline component (not a modal),
 * designed to replace the binary "Share with household" toggle.
 */
export function MemberPicker({
  members,
  selectedIds,
  onSelectionChange,
  isSaving = false,
  alreadySharedIds = [],
}: MemberPickerProps) {
  const toggleMember = useCallback(
    (userId: string) => {
      if (isSaving) return;
      const next = selectedIds.includes(userId)
        ? selectedIds.filter((id) => id !== userId)
        : [...selectedIds, userId];
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange, isSaving]
  );

  const selectAll = useCallback(() => {
    if (isSaving) return;
    onSelectionChange(members.map((m) => m.user_id));
  }, [members, onSelectionChange, isSaving]);

  const deselectAll = useCallback(() => {
    if (isSaving) return;
    onSelectionChange([]);
  }, [onSelectionChange, isSaving]);

  if (members.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>👨‍👩‍👧‍👦</Text>
        <Text style={styles.emptyText}>
          No household members to share with.
        </Text>
        <Text style={styles.emptySubtext}>
          Invite family members to your household first.
        </Text>
      </View>
    );
  }

  const selectedCount = selectedIds.length;

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Share with {selectedCount > 0 ? `${selectedCount} member${selectedCount !== 1 ? "s" : ""}` : "whom?"}
        </Text>
        {selectedCount > 0 && (
          <TouchableOpacity onPress={deselectAll} hitSlop={8} disabled={isSaving}>
            <Text style={styles.clearLink}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Member list */}
      <ScrollView
        style={styles.memberList}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {members.map((member) => {
          const isSelected = selectedIds.includes(member.user_id);
          const wasAlreadyShared = alreadySharedIds.includes(member.user_id);

          return (
            <TouchableOpacity
              key={member.user_id}
              style={[
                styles.memberRow,
                isSelected && styles.memberRowSelected,
                isSaving && styles.memberRowDisabled,
              ]}
              onPress={() => toggleMember(member.user_id)}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              {/* Checkbox */}
              <View
                style={[
                  styles.checkbox,
                  isSelected && styles.checkboxSelected,
                ]}
              >
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>

              {/* Avatar */}
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {member.display_name?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>

              {/* Name + badge */}
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.display_name}</Text>
                <Text style={styles.memberRole}>
                  {member.role === "admin" ? "Admin" : "Member"}
                  {wasAlreadyShared ? " · Already shared" : ""}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Select all shortcut */}
      {selectedCount < members.length && (
        <TouchableOpacity
          style={styles.selectAllRow}
          onPress={selectAll}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          <Text style={styles.selectAllText}>
            Share with everyone ({members.length} members)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
  },
  clearLink: {
    fontSize: 13,
    color: colors.error,
    fontWeight: "600",
  },

  // Member list
  memberList: {
    maxHeight: 200,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "60",
  },
  memberRowSelected: {
    backgroundColor: colors.brand.light + "40",
  },
  memberRowDisabled: {
    opacity: 0.5,
  },

  // Checkbox
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  checkboxSelected: {
    borderColor: colors.accent.complete,
    backgroundColor: colors.accent.complete,
  },
  checkmark: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
  },

  // Avatar
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.light,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.brand.primary,
  },

  // Info
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.deep,
  },
  memberRole: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },

  // Select all
  selectAllRow: {
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border + "60",
    backgroundColor: colors.surface,
  },
  selectAllText: {
    fontSize: 13,
    color: colors.brand.primary,
    fontWeight: "600",
  },

  // Empty state
  emptyContainer: {
    padding: 20,
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: "center",
  },
});
