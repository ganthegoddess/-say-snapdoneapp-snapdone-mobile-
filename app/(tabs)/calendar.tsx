import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { colors } from "../../src/constants/colors";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS = Array.from({ length: 30 }, (_, i) => i + 1);
const START_OFFSET = 2;

const DEMO_EVENTS: Record<number, { title: string; time: string }[]> = {
  12: [{ title: "Dentist Appointment", time: "3:00 PM" }],
  15: [{ title: "Electric Bill Due", time: "All day" }],
  20: [{ title: "Flight to Chicago", time: "8:00 AM" }],
  22: [{ title: "Team Standup", time: "10:00 AM" }],
};

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState<number | null>(12);
  const events = selectedDate ? DEMO_EVENTS[selectedDate] || [] : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity>
          <Text style={styles.arrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>April 2026</Text>
        <TouchableOpacity>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekday}>{day}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: START_OFFSET }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.dayCell} />
        ))}
        {DAYS.map((day) => {
          const hasEvents = !!DEMO_EVENTS[day];
          const isSelected = day === selectedDate;
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayCell, isSelected && styles.daySelected]}
              onPress={() => setSelectedDate(day)}
            >
              <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
              {hasEvents && <View style={[styles.dot, isSelected && styles.dotSelected]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.eventsSection}>
        <Text style={styles.eventsTitle}>
          {selectedDate ? `April ${selectedDate}` : "Select a date"}
        </Text>
        {events.length === 0 ? (
          <View style={styles.noEvents}>
            <Text style={styles.noEventsText}>No events this day</Text>
          </View>
        ) : (
          events.map((event, i) => (
            <View key={i} style={styles.eventCard}>
              <View style={[styles.eventDot, { backgroundColor: colors.brand.primary }]} />
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventTime}>{event.time}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 8,
  },
  arrow: { fontSize: 22, color: colors.brand.primary, fontWeight: "600", padding: 8 },
  monthTitle: { fontSize: 20, fontWeight: "700", color: colors.deep },
  weekdayRow: {
    flexDirection: "row", paddingHorizontal: 16, marginBottom: 8,
  },
  weekday: {
    flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600",
    color: colors.text.muted, paddingVertical: 8,
  },
  grid: {
    flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12,
  },
  dayCell: {
    width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center",
    padding: 4,
  },
  daySelected: {
    backgroundColor: colors.brand.primary, borderRadius: 24,
  },
  dayText: { fontSize: 15, fontWeight: "500", color: colors.deep },
  dayTextSelected: { color: colors.white, fontWeight: "700" },
  dot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: colors.brand.primary, marginTop: 2,
  },
  dotSelected: { backgroundColor: colors.white },
  eventsSection: {
    flex: 1, paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8,
  },
  eventsTitle: { fontSize: 17, fontWeight: "700", color: colors.deep, marginBottom: 12 },
  noEvents: { alignItems: "center", paddingTop: 24 },
  noEventsText: { fontSize: 15, color: colors.text.muted },
  eventCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.white, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  eventDot: { width: 4, height: 40, borderRadius: 2 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: "600", color: colors.deep },
  eventTime: { fontSize: 13, color: colors.text.muted, marginTop: 2 },
});