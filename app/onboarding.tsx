import { useState, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { colors } from "../src/constants/colors";
import { Button } from "../src/components/ui/Button";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PAGES = [
  {
    icon: "📸",
    title: "Snap a photo. Get it done.",
    subtitle: "Any receipt, flyer, or note. Just snap it — we'll read it for you.",
  },
  {
    icon: "🤖",
    title: "AI reads it instantly.",
    subtitle: "Dates, amounts, names, items — extracted automatically by AI.",
  },
  {
    icon: "✅",
    title: "Actions appear. You relax.",
    subtitle: "Calendar events, reminders, lists appear. Tap to confirm and you're done.",
  },
];

export default function OnboardingScreen() {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  const handleNext = () => {
    if (currentPage < PAGES.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentPage + 1) * SCREEN_WIDTH, animated: true });
    } else {
      router.replace("/(auth)/sign-up");
    }
  };

  const handleSkip = () => {
    router.replace("/(auth)/sign-up");
  };

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity onPress={handleSkip} style={styles.skip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {PAGES.map((page, index) => (
          <View key={index} style={[styles.page, { width: SCREEN_WIDTH }]}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.pageIcon}>{page.icon}</Text>
              </View>
            </View>
            <Text style={styles.title}>{page.title}</Text>
            <Text style={styles.subtitle}>{page.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {PAGES.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, currentPage === index && styles.dotActive]}
          />
        ))}
      </View>

      {/* Continue button */}
      <View style={styles.footer}>
        <Button
          title={currentPage === PAGES.length - 1 ? "Get Started" : "Continue"}
          onPress={handleNext}
          size="lg"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  skip: {
    position: "absolute",
    top: 56,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 15,
    color: colors.text.muted,
    fontWeight: "600",
  },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.brand.light,
    alignItems: "center",
    justifyContent: "center",
  },
  pageIcon: {
    fontSize: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.deep,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.muted,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.brand.primary,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
});