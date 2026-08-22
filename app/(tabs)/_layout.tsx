import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { BrandGradient } from "../../src/components/ui/BrandGradient";
import { colors } from "../../src/constants/colors";
import { useSubscription } from "../../src/hooks/useSubscription";

interface TabIconProps {
  focused: boolean;
  icon: string;
}
/** Active tab gets the signature gradient pill behind it — the "snap" moment. */
function TabIcon({ focused, icon }: TabIconProps) {
  if (!focused) {
    return <Text style={styles.inactive}>{icon}</Text>;
  }
  return (
    <BrandGradient style={styles.activePill} rounded={9999}>
      <Text style={styles.activeText}>{icon}</Text>
    </BrandGradient>
  );
}

/** Small amber "PRO" badge so the paid family tier is obvious without a dead tap. */

/**
 * 4-tab IA (owner-decided, Aug 20):
 *   Home / Memory Vault / Household / Settings
 * Calendar, Lists and Tasks are removed as tabs — the underlying data model
 * stays internal as memory TYPES; the user never files/organizes.
 * The Household tab carries a "PRO" amber badge while the user is on Free.
 */
export default function TabLayout() {
  const { data: sub } = useSubscription();
  const isFree = !sub?.plan_type;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🏠" />,
        }}
      />
      <Tabs.Screen
        name="actions"
        options={{
          title: "Memory Vault",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🧠" />,
        }}
      />
      <Tabs.Screen
        name="household"
        options={{
          title: "Household",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="👨‍👩‍👧‍👦" />,
          tabBarBadge: isFree ? "PRO" : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.accent.warm,
            color: "#FFFFFF",
            fontSize: 8,
            fontWeight: "800",
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="⚙️" />,
        }}
      />
      {/* Removed as tabs (underlying routes remain for deep links): calendar, lists */}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activePill: {
    width: 40,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  activeText: { fontSize: 18, color: "#FFFFFF" },
  inactive: { fontSize: 18, color: colors.text.muted, padding: 4 },
});
