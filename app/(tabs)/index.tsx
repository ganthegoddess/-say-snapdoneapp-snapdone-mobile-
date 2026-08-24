import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, AppState, AppStateStatus } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Calendar from "expo-calendar";
import { colors } from "../../src/constants/colors";
import { ActionCard } from "../../src/components/actions/ActionCard";
import { SnapBackCard } from "../../src/components/memories/SnapBackCard";
import { PipWisp } from "../../src/components/PipWisp";
import { BrandGradient } from "../../src/components/ui/BrandGradient";
import { Icon } from "../../src/components/ui/icons";
import { useActions } from "../../src/hooks/useActions";
import { useCompleteAction, useDeleteAction } from "../../src/hooks/useActions";
import { useLocationContext } from "../../src/hooks/useLocationContext";
import { useLocationStore } from "../../src/stores/locationStore";
import { useRecallMemories, useUpdateMemoryState } from "../../src/hooks/useMemories";
import { useAuthStore } from "../../src/stores/authStore";
import { getLocationBadgeIcon } from "../../src/utils/locationContext";
import { pip, fill, greetingLine, HOME_CAPTURE_ACTIONS } from "../../src/constants/pipCopy";
import { trackEvent } from "../../src/lib/posthog";
import type { ActionItem } from "../../src/services/actions";
import type { RecalledMemory } from "../../src/services/memories";
import { CaptureSheet } from "../../src/components/capture/CaptureSheet";

const LOCATION_COOLDOWN = 30 * 60 * 1000; // 30 minutes

/**
 * v6 premium capture-pill fill: soft vertical gradient from a LIGHTER tint (top) to
 * the DEEPER brand tint (bottom) — mirrors mockup_kit.tinted_pill (top = tint lifted
 * toward white by 0.34). Translucent alpha keeps it a light/faded brand tint per §6.3
 * (→ dark INK label), staying premium/refined, not a heavy solid block.
 */
function tintFill(base: string): [string, string] {
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  const lift = (c: number) => Math.round(c + (255 - c) * 0.34);
  return [
    `rgba(${lift(r)},${lift(g)},${lift(b)},0.40)`,
    `rgba(${r},${g},${b},0.50)`,
  ];
}

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
  const { recall } = useRecallMemories();
  const updateMemoryState = useUpdateMemoryState();
  const [pipMemories, setPipMemories] = useState<RecalledMemory[]>([]);
  const [showPipMemories, setShowPipMemories] = useState(false);

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
  const outstandingCount = todayActions.length + upcomingActions.length;
  const overdueCount = (actions || []).filter(
    (a: ActionItem) => a.due_date && new Date(a.due_date) < new Date() && a.status !== "completed"
  ).length;

  // ── Capture sheet (Home stacked actions) ──
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<"photo" | "voice" | "note" | undefined>(undefined);
  const handleCaptureAction = (routeKey: string) => {
    // snap → photo mode (Home action keys: snap / tell / type)
    const mode = routeKey === "snap" ? "photo" : routeKey === "tell" ? "voice" : "note";
    setSheetMode(mode as "photo" | "voice" | "note");
    setSheetVisible(true);
  };

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
        {/* Emotional checkpoint (DESIGN-SYSTEM §7): greeting ladder + ONE hero PIP + stacked actions */}
        <View style={styles.greetingBlock}>
          <View style={styles.pipHero}>
            <PipWisp state="idle" position="center-screen" size={300} background="light" />
          </View>
          {(() => {
            const g = greetingLine(user?.displayName, {
              memoryCount: (actions || []).length,
              outstanding: outstandingCount,
              overdue: overdueCount,
            });
            return (
              <>
                <Text style={styles.greeting}>{g.greeting}</Text>
                <Text style={styles.headline}>{g.reassurance}</Text>
              </>
            );
          })()}
        </View>

        {/* Stacked capture actions — Snap something / Tell me / Type it (no Upload on Home) */}
        <View style={styles.captureStack}>
          {HOME_CAPTURE_ACTIONS.map((a) => (
            <TouchableOpacity key={a.key} style={styles.captureAction} onPress={() => handleCaptureAction(a.key)} activeOpacity={0.86}>
              <LinearGradient
                colors={tintFill(a.tint)}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.capturePill}
              >
                <Icon name={a.icon} size={34} color={a.tint} />
                <Text style={styles.captureActionLabel}>{a.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.feed} showsVerticalScrollIndicator={false}>
        {/* PIP remembered — dormant memories surfaced by recall engine */}
        {showPipMemories && pipMemories.length > 0 && (
          <View style={styles.pipSection}>
            <View style={styles.pipHeader}>
              <Text style={styles.pipTitle}>PIP remembered…</Text>
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
        {showNearby && nearbyActions.length > 0 && (
          <View style={styles.nearbySection}>
            <View style={styles.nearbyHeader}>
              <Text style={styles.nearbyTitle}>Nearby</Text>
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
            <Text style={styles.pipLoadingText}>{pip.loading.searching}</Text>
          </View>
        ) : (actions || []).length === 0 ? (
          <View style={styles.pipEmpty}>
            <Text style={styles.pipEmptyTitle}>
              {fill(pip.emptyHome.title, { name: user?.displayName })}
            </Text>
            <Text style={styles.pipEmptyText}>{pip.emptyHome.body}</Text>
            <TouchableOpacity onPress={() => setSheetVisible(true)}>
              <BrandGradient style={styles.pipCta} rounded={14}>
                <Text style={styles.pipCtaText}>{pip.emptyHome.cta}</Text>
              </BrandGradient>
            </TouchableOpacity>
          </View>
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
        )}
      </ScrollView>
      <CaptureSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} initialMode={sheetMode} />
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
  greetingBlock: { alignItems: "center", paddingTop: 8 },
  pipHero: { marginBottom: 12, alignItems: "center" },
  greeting: { fontSize: 30, color: colors.ink, fontWeight: "800", textAlign: "center", lineHeight: 36 },
  headline: { fontSize: 18, fontWeight: "600", color: colors.muted, marginTop: 8, lineHeight: 24, textAlign: "center", paddingHorizontal: 8 },
  // Stacked capture actions (DESIGN-SYSTEM §7.4 / §8) — premium filled tinted pills:
  // soft vertical gradient (lighter top → deeper tint bottom), NO outline, fully pill
  // corners, subtle elevation so they read raised & touchable, INK label + heavy tint
  // icon centred as ONE unit (icon left of text). Icon carries the tint colour.
  captureStack: { marginTop: 24, gap: 14 },
  captureAction: {
    borderRadius: 28,
    shadowColor: "#0F2A33",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 5,
  },
  capturePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    borderRadius: 28,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  captureActionLabel: { fontSize: 20, fontWeight: "800", color: colors.ink, letterSpacing: 0.2 },
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
  pipTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
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
