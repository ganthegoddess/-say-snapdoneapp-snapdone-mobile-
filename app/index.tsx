import { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuthStore } from "../src/stores/authStore";

export default function IndexScreen() {
  const token = useAuthStore((state) => state.token);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure splash/loading feels intentional
    const timer = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !ready) {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>SnapDone</Text>
        <ActivityIndicator size="large" color="#0891B2" style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/onboarding" />;
  }

  // Authenticated — go to tabs
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    fontSize: 36,
    fontWeight: "800",
    color: "#0891B2",
  },
});