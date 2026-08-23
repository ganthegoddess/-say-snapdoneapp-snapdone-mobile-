import { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Share, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { colors } from "../../src/constants/colors";
import { Button } from "../../src/components/ui/Button";
import { Icon } from "../../src/components/ui/icons";
import { ActionCard } from "../../src/components/actions/ActionCard";
import { useHouseholds, useCreateHousehold, useLeaveHousehold, useHousehold } from "../../src/hooks/useHouseholds";
import { useSubscription } from "../../src/hooks/useSubscription";
import { useAuthStore } from "../../src/stores/authStore";
import { trackInviteEvent } from "../../src/services/analytics";
import { trackEvent } from "../../src/lib/posthog";
import { fetchHouseholdFeed } from "../../src/services/household";
import type { ActionItem } from "../../src/services/actions";

export default function HouseholdScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: households, isLoading: loadingHouseholds } = useHouseholds();
  const createHousehold = useCreateHousehold();
  const leaveHousehold = useLeaveHousehold();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [houseName, setHouseName] = useState("");
  const inviteCountRef = useRef(0);
  const [invitesSent, setInvitesSent] = useState(0);

  // Household feed state
  const [feedActions, setFeedActions] = useState<ActionItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [showFeed, setShowFeed] = useState(true);

  const activeHousehold = households?.[0];
  const { data: householdDetails } = useHousehold(activeHousehold?.id);

  const handleCreate = async () => {
    if (!houseName.trim()) return;
    try {
      await createHousehold.mutateAsync(houseName.trim());
      trackEvent("household_created");
      setShowCreateForm(false);
      setHouseName("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create household");
    }
  };

  const handleShareInvite = async () => {
    if (!activeHousehold?.invite_code) return;
    const newCount = inviteCountRef.current + 1;
    inviteCountRef.current = newCount;
    setInvitesSent(newCount);
    trackInviteEvent("invite_sent", {
      source_screen: "household",
      household_id: activeHousehold.id,
      method: "share",
      invites_sent: newCount,
    });
    trackEvent("household_invited");
    try {
      await Share.share({
        message: `Join my household on SnapDone! Use invite code: ${activeHousehold.invite_code}`,
        title: "SnapDone Household Invite",
      });
    } catch {}
  };

  const handleLeave = () => {
    if (!activeHousehold?.id) return;
    Alert.alert(
      "Leave Household",
      "Are you sure? You'll lose access to shared actions and lists.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveHousehold.mutateAsync(activeHousehold.id);
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  };

  // Fetch household feed when household is available
  useEffect(() => {
    if (!activeHousehold?.id || activeHousehold.id === "demo") return;
    setIsLoadingFeed(true);
    fetchHouseholdFeed(activeHousehold.id)
      .then((res) => setFeedActions(res.actions))
      .catch(() => setFeedActions([]))
      .finally(() => setIsLoadingFeed(false));
  }, [activeHousehold?.id]);

  const members = householdDetails?.members || [];
  const isAdmin = householdDetails?.members?.find((m) => m.user_id === user?.id)?.role === "admin";
  // Household = PAID ONLY (owner decision). A free user never gets in.
  const { data: sub } = useSubscription();
  const isPaid = !!sub?.plan_type;
  // Member limits: Household = 3, Household Plus = 6 (corrected from hardcoded "4").
  const memberLimit = (sub?.plan_type ?? "").includes("plus") ? 6 : 3;

  if (loadingHouseholds) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  // Paid gate — free users see a clean "upgrade to continue" screen.
  if (!isPaid) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.gateContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.gateIconChip}><Icon name="household" size={40} color={colors.text.muted} /></View>
          <Text style={styles.gateTitle}>Household is a paid feature</Text>
          <Text style={styles.gateText}>
            Share memories, lists, and reminders with up to {memberLimit} people. Upgrade to Household to start your family's shared memory vault.
          </Text>
          <Button title="See Household Plans" onPress={() => router.push("/paywall")} variant="primary" size="lg" fullWidth />
        </ScrollView>
      </View>
    );
  }
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Household</Text>
      <Text style={styles.subtitle}>Share actions and lists with your family</Text>

      {!activeHousehold ? (
        <>
          {!showCreateForm ? (
            <View style={styles.inviteCard}>
              <View style={styles.gateIconChip}><Icon name="household" size={36} color={colors.text.muted} /></View>
              <Text style={styles.inviteTitle}>Start your household</Text>
              <Text style={styles.inviteText}>
                Share grocery lists, chores, reminders, and events with up to {memberLimit} family members. One household per subscription.
              </Text>
              <Button title="Create Household" onPress={() => {
                trackInviteEvent("invite_tapped", { source_screen: "household", household_id: undefined });
                setShowCreateForm(true);
              }} variant="primary" size="lg" fullWidth />
              <View style={{ marginTop: 12 }}>
                <Button title="Join a Household" onPress={() => {
                  trackInviteEvent("invite_tapped", { source_screen: "household", household_id: undefined });
                  router.push("/household/join");
                }} variant="secondary" size="md" fullWidth />
              </View>
            </View>
          ) : (
            <View style={styles.inviteCard}>
              <View style={styles.gateIconChip}><Icon name="home" size={32} color={colors.text.muted} /></View>
              <Text style={styles.inviteTitle}>Name your household</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. The Smiths"
                placeholderTextColor={colors.text.muted}
                value={houseName}
                onChangeText={setHouseName}
                autoFocus
              />
              <Button
                title={createHousehold.isPending ? "Creating..." : "Create"}
                onPress={handleCreate}
                variant="primary"
                size="lg"
                fullWidth
                loading={createHousehold.isPending}
              />
              <TouchableOpacity style={{ marginTop: 12 }} onPress={() => setShowCreateForm(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.inviteCard}>
            <View style={styles.gateIconChip}><Icon name="household" size={32} color={colors.text.muted} /></View>
            <Text style={styles.inviteTitle}>{activeHousehold.name}</Text>
            <Text style={styles.inviteText}>
              {members.length} of {memberLimit} members • Invite code: {activeHousehold.invite_code}
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Button title="Share Invite" onPress={handleShareInvite} variant="primary" size="md" fullWidth />
              </View>
              {members.length < memberLimit && (
                <View style={{ flex: 1 }}>
                  <Button title="Copy Code" onPress={() => {
                    const newCount = inviteCountRef.current + 1;
                    inviteCountRef.current = newCount;
                    setInvitesSent(newCount);
                    trackInviteEvent("invite_sent", {
                      source_screen: "household",
                      household_id: activeHousehold.id,
                      method: "copy_code",
                      invites_sent: newCount,
                    });
                    Share.share({ message: activeHousehold.invite_code || "" });
                  }} variant="secondary" size="md" fullWidth />
                </View>
              )}
            </View>
          </View>

          {invitesSent > 0 && (
            <View style={styles.inviteCounter}>
              <Text style={styles.inviteCounterText}>
                {invitesSent} invite{invitesSent !== 1 ? "s" : ""} sent this session
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Members</Text>
          {members.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No members yet</Text>
              <Text style={styles.emptySubtext}>Share your invite code to add family members</Text>
            </View>
          ) : (
            <View style={styles.memberList}>
              {members.map((m) => (
                <View key={m.user_id} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {m.display_name?.charAt(0)?.toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {m.display_name} {m.user_id === user?.id ? "(You)" : ""}
                    </Text>
                    <Text style={styles.memberRole}>{m.role === "admin" ? "Admin" : "Member"}</Text>
                  </View>
                  {m.role === "admin" && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={{ marginTop: 24, marginBottom: 40 }}>
            {/* ── Household Shared Feed ── */}
            {activeHousehold && activeHousehold.id !== "demo" && (
              <View style={{ marginBottom: 24 }}>
                <View style={styles.feedHeaderRow}>
                  <Text style={styles.sectionTitle}>Shared Memories</Text>
                  <TouchableOpacity onPress={() => setShowFeed(!showFeed)} hitSlop={8}>
                    <Text style={styles.feedToggleText}>
                      {showFeed ? "Hide" : "Show"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showFeed && (
                  <>
                    {isLoadingFeed ? (
                      <View style={styles.feedLoading}>
                        <ActivityIndicator size="small" color={colors.brand.primary} />
                        <Text style={styles.feedLoadingText}>Loading shared memories...</Text>
                      </View>
                    ) : feedActions.length === 0 ? (
                      <View style={styles.feedEmpty}>
                        <View style={styles.feedEmptyIcon}><Icon name="vault" size={26} color={colors.text.muted} /></View>
                        <Text style={styles.feedEmptyTitle}>No shared memories yet</Text>
                        <Text style={styles.feedEmptySubtext}>
                          When someone shares a memory with the household, it will appear here.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.feedList}>
                        {feedActions.map((a) => (
                          <ActionCard
                            key={a.id}
                            type={
                              a.action_type === "grocery_list"
                                ? "list-item"
                                : (a.action_type as any)
                            }
                            title={a.title}
                            detail={a.description}
                            date={a.due_date}
                            status={a.status === "completed" ? "confirmed" : "pending"}
                            onEdit={() => router.push(`/action/${a.id}`)}
                          />
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            <Button
              title="Leave Household"
              onPress={handleLeave}
              variant="ghost"
              size="md"
              fullWidth
              loading={leaveHousehold.isPending}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: "800", color: colors.deep, marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.text.muted, marginBottom: 24, lineHeight: 22 },
  inviteCard: { backgroundColor: colors.brand.light, borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 24, borderWidth: 1, borderColor: colors.brand.primary },
  gateIconChip: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brand.light, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  inviteTitle: { fontSize: 18, fontWeight: "700", color: colors.ink, marginBottom: 8 },
  inviteText: { fontSize: 14, color: colors.text.muted, textAlign: "center", marginBottom: 16, lineHeight: 20 },
  // Paid gate
  gateContainer: { paddingVertical: 60, paddingHorizontal: 8, alignItems: "center" },

  gateTitle: { fontSize: 22, fontWeight: "800", color: colors.deep, textAlign: "center", marginBottom: 10 },
  gateText: { fontSize: 15, color: colors.text.muted, textAlign: "center", lineHeight: 22, marginBottom: 24, paddingHorizontal: 8 },
  input: { width: "100%", backgroundColor: colors.white, borderRadius: 10, padding: 14, fontSize: 16, color: colors.deep, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  cancelText: { fontSize: 15, color: colors.text.muted, fontWeight: "500" },

  // Invite counter pill
  inviteCounter: {
    marginTop: 12,
    backgroundColor: colors.brand.light,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: colors.brand.primary + "30",
    marginBottom: 8,
  },
  inviteCounterText: { fontSize: 13, color: colors.text.muted, fontWeight: "600" },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.deep, marginBottom: 12 },
  emptyState: { backgroundColor: colors.white, borderRadius: 12, padding: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderStyle: "dashed" },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text.primary, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: colors.text.muted, textAlign: "center" },
  memberList: { gap: 8 },
  memberRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand.light, alignItems: "center", justifyContent: "center", marginRight: 12 },
  memberAvatarText: { fontSize: 16, fontWeight: "700", color: colors.brand.primary },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: "600", color: colors.deep },
  memberRole: { fontSize: 13, color: colors.text.muted, marginTop: 2 },
  adminBadge: { backgroundColor: colors.accent.complete + "20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  adminBadgeText: { fontSize: 12, fontWeight: "600", color: colors.text.muted },

  // ── Feed section ──
  feedHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  feedToggleText: {
    fontSize: 13,
    color: colors.brand.primary,
    fontWeight: "600",
  },
  feedLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedLoadingText: {
    fontSize: 13,
    color: colors.text.muted,
  },
  feedEmpty: {
    alignItems: "center",
    padding: 24,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  feedEmptyIcon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brand.light, alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  feedEmptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 4,
  },
  feedEmptySubtext: {
    fontSize: 13,
    color: colors.text.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  feedList: {
    gap: 8,
  },
});
