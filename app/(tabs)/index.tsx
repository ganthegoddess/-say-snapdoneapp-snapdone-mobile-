import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, AppState, AppStateStatus } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Calendar from "expo-calendar";
import { colors } from "../../src/constants/colors";
import { ActionCard } from "../../src/components/actions/ActionCard";
import { SnapBackCard } from "../../src/components/memories/SnapBackCard";
import { CaptureButton } from "../../src/components/capture/CaptureButton";
import { PipWisp } from "../../src/components/PipWisp";
import { PipBadge } from "../../src/components/ui/PipBadge";
import { BrandGradient } from "../../src/components/ui/BrandGradient";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { useActions } from "../../src/hooks/useActions";
import { useCompleteAction, useDeleteAction } from "../../src/hooks/useActions";
import { useLocationContext } from "../../src/hooks/useLocationContext";
import { useLocationStore } from "../../src/stores/locationStore";
import { useRecallMemories, useUpdateMemoryState } from "../../src/hooks/useMemories";
import { useAuthStore } from "../../src/stores/authStore";
import { getLocationBadgeIcon } from "../../src/utils/locationContext";
import { pip, fill } from "../../src/constants/pipCopy";
import { trackEvent } from "../../src/lib/posthog";
import type { ActionItem } from "../../src/services/actions";
import type { RecalledMemory } from "../../src/services/memories";

const LOCATION_COOLDOWN = 30 * 60 * 1000; // 30 minutes
const RECALL_COOLDOWN = 5 * 60 * 1000; // 5 minutes between recall checks

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

/** Fetch upcoming calendar events for the next 30 days (titles only) */
async function getUpcomingEventTitles(): Promise<string[]> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") return [];

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const events = await Calendar.getEventsAsync(
      calendars.map((c) => c.id),
      now,
      thirtyDays
    );

    return events.slice(0, 20).map((e) => e.title);
  } catch {
    return [];
  }
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: actions, isLoading } = useActions();
  const completeAction = useCompleteAction();
  const deleteAction = useDeleteAction();

  // Location polling
  const { checkLocationContext } = useLocationContext();
  const locationEnabled = useLocationStore((s) => s.locationRemindersEnabled);
  const lastLocationCheck = useLocationStore((s) => s.lastLocationCheck);
  const markLocationChecked = useLocationStore((s) => s.markLocationChecked);
  const [nearbyActions, setNearbyActions] = useState<ActionItem[]>([]);
  const [showNearby, setShowNearby] = useState(false);

  // Memory recall
  const { recall, isRecalling, recalled } = useRecallMemories();
  const updateMemoryState = useUpdateMemoryState();
  const [pipMemories, setPipMemories] = useState<RecalledMemory[]>([]);
  const [showPipMemories, setShowPipMemories] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RecalledMemory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isCheckingRef = useRef(false);

  // Foreground: location check + memory recall
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active" &&
        locationEnabled &&
        !isCheckingRef.current
      ) {
        isCheckingRef.current = true;

        // Location context check (throttled to 30 min)
        const now = Date.now();
        if (now - lastLocationCheck >= LOCATION_COOLDOWN) {
          const result = await checkLocationContext();
          if (result && result.matches.length > 0) {
            setNearbyActions(result.matches);
            setShowNearby(true);
            markLocationChecked();
            for (const match of result.matches) {
              const icon = getLocationBadgeIcon(match.location);
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `${icon} Nearby: ${match.title}`,
                  body: match.location
                    ? `You're near ${match.location} — don't forget!`
                    : "Don't forget this!",
                  data: { actionId: match.id, type: "location_snapback" },
                  sound: true,
                },
                trigger: null,
              });
            }
          }
        }

        // Memory recall (PIP remembered) — separate throttle
        try {
          const placeName = await (async () => {
            try {
              const { getCurrentPositionAsync, reverseGeocodeAsync, getForegroundPermissionsAsync } =
                await import("expo-location");
              const { status } = await getForegroundPermissionsAsync();
              if (status !== "granted") return undefined;
              const pos = await getCurrentPositionAsync({
                accuracy: (await import("expo-location")).Accuracy.Balanced,
              });
              const geocode = await reverseGeocodeAsync({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
              return geocode[0]?.name || geocode[0]?.street || undefined;
            } catch {
              return undefined;
            }
          })();

          const upcomingEvents = await getUpcomingEventTitles();
          const memories = await recall({
            place_name: placeName,
            upcoming_events: upcomingEvents,
          });

          if (memories.length > 0) {
            setPipMemories(memories);
            setShowPipMemories(true);
          }
        } catch {
          // Memory recall is best-effort
        }

        isCheckingRef.current = false;
      }
      appStateRef.current = nextState;
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [locationEnabled, lastLocationCheck, checkLocationContext, markLocationChecked, recall]);

  const todayActions = (actions || []).filter((a: ActionItem) => {
    if (!a.due_date) return false;
    const today = new Date();
    const due = new Date(a.due_date);
    return due.toDateString() === today.toDateString();
  });
  const upcomingActions = (actions || []).filter((a: ActionItem) => !todayActions.includes(a));

  const handleConfirm = useCallback(
    (id: string) => {
      const action = (actions || []).find((a: ActionItem) => a.id === id);
      const category = action?.action_type || "other";
      trackEvent("snapback_completed", { category });
      trackEvent("memory_relief_event", {
        category,
        original_capture_type: "image",
        relief_type: "completed_task",
      });
      completeAction.mutate(id);
    },
    [completeAction, actions]
  );

  const handleDismiss = useCallback(
    (id: string) => deleteAction.mutate(id),
    [deleteAction]
  );

  const handleArchiveMemory = useCallback(
    (actionId: string) => {
      updateMemoryState.mutate({ actionId, state: "archived" });
      setPipMemories((prev) => prev.filter((m) => m.action.id !== actionId));
      if (pipMemories.length <= 1) setShowPipMemories(false);
    },
    [updateMemoryState, pipMemories.length]
  );

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setSearchResults([]);
        setShowSearch(false);
        return;
      }
      setIsSearching(true);
      setShowSearch(true);
      try {
        const results = await recall({ search_query: query.trim() });
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [recall]
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString())
      return `Today at ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString())
      return `Tomorrow at ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, styles.homeWash]}>
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>
            {(() => {
              const h = new Date().getHours();
              const prefix = h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
              const first = user?.displayName?.trim().split(/\s+/)[0];
              return first ? `${prefix}, ${first} 👋` : prefix;
            })()}
          </Text>
          <Text style={styles.headline}>What would you like PIP to help you remember today?</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Ask PIP what you need to remember..."
          placeholderTextColor={colors.text.muted}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch("")} hitSlop={8}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.feed} showsVerticalScrollIndicator={false}>
        {/* Search results */}
        {showSearch && (
          <View style={{ marginBottom: 16 }}>
            {isSearching ? (
              <Skeleton lines={3} />
            ) : searchResults.length === 0 ? (
              <Text style={styles.searchEmpty}>
                Hmm, I don't remember anything about "{searchQuery}"
              </Text>
            ) : (
              <>
                <Text style={styles.sectionTitle}>
                  I remembered {searchResults.length} thing{searchResults.length !== 1 ? "s" : ""}
                </Text>
                {searchResults.map((m) => (
                  <SnapBackCard
                    key={`search-${m.action.id}`}
                    memory={m}
                    recallReason={m.recall_reason}
                  />
                ))}
              </>
            )}
          </View>
        )}

        {/* PIP remembered — dormant memories surfaced by recall engine */}
        {showPipMemories && pipMemories.length > 0 && !showSearch && (
          <View style={styles.pipSection}>
            <View style={styles.pipHeader}>
              <View style={styles.pipHeaderTitle}>
                <PipWisp state="remembered" position="left-banner" size={28} background="light" />
                <Text style={styles.pipTitle}>PIP remembered…</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPipMemories(false)} hitSlop={8}>
                <Text style={styles.pipDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
            {pipMemories.map((m) => (
              <SnapBackCard
                key={`pip-${m.action.id}`}
                memory={m}
                recallReason={m.recall_reason}
                onArchive={() => handleArchiveMemory(m.action.id)}
              />
            ))}
          </View>
        )}

        {/* Location SnapBacks */}
        {showNearby && nearbyActions.length > 0 && !showSearch && (
          <View style={styles.nearbySection}>
            <View style={styles.nearbyHeader}>
              <Text style={styles.nearbyTitle}>📍 Nearby</Text>
              <TouchableOpacity onPress={() => setShowNearby(false)} hitSlop={8}>
                <Text style={styles.nearbyDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
            {nearbyActions.map((a) => (
              <ActionCard
                key={`nearby-${a.id}`}
                type={(TYPE_MAP[a.action_type] || "task") as any}
                title={a.title}
                detail={a.description || (a.location ? `Near ${a.location}` : undefined)}
                date={formatDate(a.due_date)}
                status={STATUS_MAP[a.status] || "pending"}
                assigneeName={a.assignee_display_name}
                isAssignedToMe={a.assignee_id === user?.id}
                onConfirm={() => handleConfirm(a.id)}
                onEdit={() => router.push(`/action/${a.id}`)}
                onDismiss={() => handleDismiss(a.id)}
              />
            ))}
          </View>
        )}

        {isLoading ? (
          <View style={styles.pipLoading}>
            <PipWisp state="idle" position="center-screen" size={64} background="light" />
            <Text style={styles.pipLoadingText}>{pip.loading.searching}</Text>
          </View>
        ) : !showSearch && (actions || []).length === 0 ? (
          <View style={styles.pipEmpty}>
            <PipBadge size={88} />
            <Text style={styles.pipEmptyTitle}>
              {fill(pip.emptyHome.title, { name: user?.displayName })}
            </Text>
            <Text style={styles.pipEmptyText}>{pip.emptyHome.body}</Text>
            <TouchableOpacity onPress={() => router.push("/capture")}>
              <BrandGradient style={styles.pipCta} rounded={14}>
                <Text style={styles.pipCtaText}>Snap your first memory</Text>
              </BrandGradient>
            </TouchableOpacity>
          </View>
        ) : !showSearch ? (
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
                    assigneeName={a.assignee_display_name}
                    isAssignedToMe={a.assignee_id === user?.id}
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
                    assigneeName={a.assignee_display_name}
                    isAssignedToMe={a.assignee_id === user?.id}
                    onConfirm={() => handleConfirm(a.id)}
                    onEdit={() => router.push(`/action/${a.id}`)}
                    onDismiss={() => handleDismiss(a.id)}
                  />
                ))}
              </View>
            )}
            <View style={{ height: 100 }} />
          </>
        ) : null}
      </ScrollView>
      <CaptureButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  // Warm brand header wash (brand-light into surface) — mirrors the site.
  homeWash: { backgroundColor: colors.brand.light },
  header: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 20,
  },
  greetingBlock: {},
  greeting: { fontSize: 15, color: colors.brand.dark, fontWeight: "600" },
  headline: { fontSize: 28, fontWeight: "800", color: colors.deep, marginTop: 2, lineHeight: 36 },
  greetingUnderline: { width: 48, height: 3, marginTop: 8 },
  // PIP loading
  pipLoading: { alignItems: "center", paddingVertical: 80, paddingHorizontal: 24 },
  pipLoadingText: { fontSize: 15, color: colors.text.muted, marginTop: 4 },
  // PIP empty home (first-run companion)
  pipEmpty: {
    backgroundColor: colors.warm.cream,
    borderRadius: 20, marginHorizontal: 20, marginTop: 8,
    alignItems: "center", paddingVertical: 32, paddingHorizontal: 24,
    borderWidth: 1, borderColor: colors.warm.soft,
  },
  pipEmptyTitle: { fontSize: 22, fontWeight: "800", color: colors.deep, marginTop: 16, marginBottom: 8 },
  pipEmptyText: { fontSize: 15, color: colors.text.primary, textAlign: "center", lineHeight: 22, marginBottom: 20 },
  pipCta: { paddingVertical: 14, paddingHorizontal: 28, minWidth: 220, alignItems: "center" },
  pipCtaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text.primary, paddingVertical: 0 },
  searchClear: { fontSize: 16, color: colors.text.muted, fontWeight: "700", paddingHorizontal: 4 },
  searchEmpty: { fontSize: 14, color: colors.text.muted, textAlign: "center", marginTop: 24 },

  feed: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.deep, marginBottom: 12, marginTop: 8 },

  // PIP remembered
  pipSection: {
    backgroundColor: colors.warm.cream2,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.accent.warm,
  },
  pipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pipHeaderTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  pipTitle: { fontSize: 16, fontWeight: "700", color: colors.accent.warm },
  pipDismiss: { fontSize: 16, color: colors.text.muted, fontWeight: "700", paddingHorizontal: 4 },

  // Memory card
  memoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memoryCardContent: { flex: 1 },
  memoryTitle: { fontSize: 15, fontWeight: "600", color: colors.deep, marginBottom: 2 },
  memoryReason: { fontSize: 12, color: colors.text.muted, fontStyle: "italic" },
  memoryArchiveBtn: { paddingLeft: 12 },
  memoryArchiveText: { fontSize: 16, color: colors.text.muted, fontWeight: "700" },

  // Nearby
  nearbySection: {
    backgroundColor: colors.brand.light + "40",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.brand.primary + "30",
  },
  nearbyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  nearbyTitle: { fontSize: 16, fontWeight: "700", color: colors.brand.dark },
  nearbyDismiss: { fontSize: 16, color: colors.text.muted, fontWeight: "700", paddingHorizontal: 4 },
});
