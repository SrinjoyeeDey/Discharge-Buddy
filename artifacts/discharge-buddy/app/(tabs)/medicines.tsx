import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MedicineCard } from "@/components/MedicineCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const TIME_SLOTS = [
  { label: "Morning", range: ["06:00", "12:00"], icon: "sun" as const },
  { label: "Afternoon", range: ["12:00", "17:00"], icon: "cloud" as const },
  { label: "Evening", range: ["17:00", "21:00"], icon: "sunset" as const },
  { label: "Night", range: ["21:00", "24:00"], icon: "moon" as const },
];

export default function MedicinesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { medicines, todayDoses, updateDoseStatus } = useApp();
  const [activeTab, setActiveTab] = useState<"today" | "all">("today");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const getDosesForSlot = (range: string[]) => {
    return todayDoses.filter((dose) => {
      const [h, m] = dose.scheduledTime.split(":").map(Number);
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      return timeStr >= range[0] && timeStr < range[1];
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Medicines</Text>
        <TouchableOpacity onPress={() => router.push("/scan")} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Feather name="camera" size={16} color="#fff" />
          <Text style={[styles.addBtnText, { color: "#fff" }]}>Scan Rx</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.muted }]}>
        {(["today", "all"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? "#fff" : colors.mutedForeground }]}>
              {tab === "today" ? "Today's Schedule" : "All Medicines"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "today" ? (
          TIME_SLOTS.map((slot) => {
            const doses = getDosesForSlot(slot.range);
            if (doses.length === 0) return null;
            return (
              <View key={slot.label} style={styles.slotSection}>
                <View style={styles.slotHeader}>
                  <Feather name={slot.icon} size={16} color={colors.primary} />
                  <Text style={[styles.slotLabel, { color: colors.foreground }]}>{slot.label}</Text>
                  <Text style={[styles.slotCount, { color: colors.mutedForeground }]}>
                    {doses.filter((d) => d.status === "taken").length}/{doses.length}
                  </Text>
                </View>
                {doses.map((dose) => {
                  const med = medicines.find((m) => m.id === dose.medicineId);
                  if (!med) return null;
                  return (
                    <MedicineCard
                      key={dose.id}
                      medicine={med}
                      dose={dose}
                      onTake={(id) => updateDoseStatus(id, "taken")}
                      onSnooze={(id) => updateDoseStatus(id, "snoozed")}
                    />
                  );
                })}
              </View>
            );
          })
        ) : (
          medicines.map((med) => (
            <MedicineCard key={med.id} medicine={med} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
  },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  slotSection: { marginBottom: 20 },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  slotLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  slotCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
