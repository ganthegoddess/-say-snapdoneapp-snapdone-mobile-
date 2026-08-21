import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../src/constants/colors";

/**
 * 4-tab IA (owner-decided, Aug 20):
 *   Home / Memory Vault / Household / Settings
 * Calendar, Lists and Tasks are removed as tabs — the underlying data model
 * stays internal as memory TYPES; the user never files/organizes.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
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
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="actions"
        options={{
          title: "Memory Vault",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🧠</Text>,
        }}
      />
      <Tabs.Screen
        name="household"
        options={{
          title: "Household",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👨‍👩‍👧‍👦</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
        }}
      />
      {/* Removed as tabs (underlying routes remain for deep links): calendar, lists */}
    </Tabs>
  );
}
