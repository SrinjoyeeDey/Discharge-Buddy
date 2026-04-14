import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdherenceRing } from "@/components/AdherenceRing";
import { EmergencyButton } from "@/components/EmergencyButton";
import { MedicineCard } from "@/components/MedicineCard";
import { RiskBanner } from "@/components/RiskBanner";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { role, user, todayDoses, medicines, followUps, updateDoseStatus } = useApp();

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const taken = todayDoses.filter((d) => d.status === "taken").length;
  const total = todayDoses.length;
  const missed = todayDoses.filter((d) => d.status === "missed").length;

  const getRiskLevel = () => {
    if (missed >= 2) return "high";
    if (missed === 1) return "medium";
    return "low";
  };

  const getRiskMessage = () => {
    if (missed >= 2) return `You missed ${missed} doses today. Please contact your doctor or caregiver immediately.`;
    if (missed === 1) return "You missed 1 dose today. Try to maintain your schedule for better recovery.";
    return "Great job! You're staying on track with your medications today.";
  };

  const upcomingFollowUp = followUps.find((f) => !f.completed);
  const nextDose = todayDoses.find((d) => d.status === "pending");

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  if (role === "caregiver") {
    return <CaregiverHome colors={colors} topInset={topInset} />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 12, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greeting()}</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>{user?.name ?? "Patient"}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/emergency")}
          style={[styles.emergencyChip, { backgroundColor: `${colors.emergency}15` }]}
        >
          <Feather name="alert-triangle" size={14} color={colors.emergency} />
          <Text style={[styles.emergencyChipText, { color: colors.emergency }]}>SOS</Text>
        </TouchableOpacity>
      </View>

      <RiskBanner level={getRiskLevel()} message={getRiskMessage()} />

      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AdherenceRing taken={taken} total={total} size={100} />
        <View style={styles.statsDivider} />
        <View style={styles.statsRight}>
          <StatItem label="Taken" value={taken} color={colors.success} />
          <StatItem label="Missed" value={missed} color={colors.destructive} />
          <StatItem label="Pending" value={total - taken - missed} color={colors.warning} />
        </View>
      </View>

      {nextDose && (
        <View style={[styles.nextDoseCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
          <View style={styles.nextDoseHeader}>
            <Feather name="clock" size={16} color={colors.primary} />
            <Text style={[styles.nextDoseLabel, { color: colors.primary }]}>Next Dose</Text>
          </View>
          <Text style={[styles.nextDoseMed, { color: colors.foreground }]}>
            {nextDose.medicineName} at {nextDose.scheduledTime}
          </Text>
        </View>
      )}

      {upcomingFollowUp && (
        <TouchableOpacity
          style={[styles.followupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/(tabs)/followups")}
        >
          <View style={styles.followupLeft}>
            <Feather name="calendar" size={20} color={colors.accent} />
            <View>
              <Text style={[styles.followupTitle, { color: colors.foreground }]}>{upcomingFollowUp.title}</Text>
              <Text style={[styles.followupDate, { color: colors.mutedForeground }]}>
                {new Date(upcomingFollowUp.dateTime).toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Schedule</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/medicines")}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
        </TouchableOpacity>
      </View>

      {todayDoses.slice(0, 4).map((dose) => {
        const med = medicines.find((m) => m.id === dose.medicineId);
        if (!med) return null;
        return (
          <MedicineCard
            key={dose.id}
            medicine={med}
            dose={dose}
            onTake={(id) => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              updateDoseStatus(id, "taken");
            }}
            onSnooze={(id) => updateDoseStatus(id, "snoozed")}
            compact
          />
        );
      })}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
      </View>

      <View style={styles.quickActions}>
        <QuickAction icon="camera" label="Scan Rx" color={colors.primary} onPress={() => router.push("/scan")} colors={colors} />
        <QuickAction icon="activity" label="Symptoms" color={colors.warning} onPress={() => router.push("/(tabs)/symptoms")} colors={colors} />
        <QuickAction icon="message-circle" label="AI Help" color={colors.accent} onPress={() => router.push("/chat")} colors={colors} />
        <QuickAction icon="share-2" label="Share Data" color={colors.success} onPress={() => {}} colors={colors} />
      </View>

      <View style={styles.emergencySection}>
        <EmergencyButton />
      </View>
    </ScrollView>
  );
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color, onPress, colors }: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.75}
    >
      <View style={[styles.qaIcon, { backgroundColor: `${color}15` }]}>
        <Feather name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.qaLabel, { color: colors.foreground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function CaregiverHome({ colors, topInset }: { colors: ReturnType<typeof useColors>; topInset: number }) {
  const { linkedPatients } = useApp();
  const patient = linkedPatients[0];

  return (
    <ScrollView
      style={[{ backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 12, paddingBottom: 100, paddingHorizontal: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.name, { color: colors.foreground, marginBottom: 4 }]}>Caregiver Dashboard</Text>
      <Text style={[styles.greeting, { color: colors.mutedForeground, marginBottom: 20 }]}>
        Monitoring {patient?.name ?? "your patient"}
      </Text>

      <RiskBanner level="medium" message="John missed 1 dose of Metformin today. Consider sending a reminder." />

      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AdherenceRing taken={3} total={5} size={100} />
        <View style={styles.statsDivider} />
        <View style={styles.statsRight}>
          <StatItem label="Taken" value={3} color={colors.success} />
          <StatItem label="Missed" value={1} color={colors.destructive} />
          <StatItem label="Pending" value={1} color={colors.warning} />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12, marginTop: 20 }]}>
        Patient Status
      </Text>

      <View style={[styles.patientCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.patientRow}>
          <Feather name="user" size={18} color={colors.primary} />
          <Text style={[styles.patientName, { color: colors.foreground }]}>{patient?.name}</Text>
          <View style={[styles.activeBadge, { backgroundColor: `${colors.success}20` }]}>
            <Text style={[{ color: colors.success, fontSize: 11, fontFamily: "Inter_600SemiBold" }]}>Active</Text>
          </View>
        </View>
        <Text style={[{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 }]}>
          {patient?.condition}
        </Text>
        <Text style={[{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }]}>
          Discharged {patient ? new Date(patient.dischargeDate).toLocaleDateString() : ""}
        </Text>

        <View style={styles.caregiverActions}>
          <TouchableOpacity style={[styles.careBtn, { backgroundColor: `${colors.primary}15` }]}>
            <Feather name="phone" size={16} color={colors.primary} />
            <Text style={[styles.careBtnText, { color: colors.primary }]}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.careBtn, { backgroundColor: `${colors.warning}15` }]}>
            <Feather name="bell" size={16} color={colors.warning} />
            <Text style={[styles.careBtnText, { color: colors.warning }]}>Remind</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.careBtn, { backgroundColor: `${colors.destructive}15` }]}>
            <Feather name="alert-triangle" size={16} color={colors.destructive} />
            <Text style={[styles.careBtnText, { color: colors.destructive }]}>Emergency</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12, marginTop: 20 }]}>
        Recent Activity
      </Text>

      {[
        { action: "Took Lisinopril 10mg", time: "8:03 AM", icon: "check-circle" as const, color: colors.success },
        { action: "Took Metformin 500mg", time: "8:05 AM", icon: "check-circle" as const, color: colors.success },
        { action: "Logged symptom: mild headache", time: "10:30 AM", icon: "activity" as const, color: colors.warning },
        { action: "Missed Aspirin 81mg", time: "8:00 PM", icon: "x-circle" as const, color: colors.destructive },
      ].map((item, i) => (
        <View key={i} style={[styles.activityItem, { borderBottomColor: colors.border }]}>
          <Feather name={item.icon} size={16} color={item.color} />
          <View style={{ flex: 1 }}>
            <Text style={[{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_500Medium" }]}>{item.action}</Text>
          </View>
          <Text style={[{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }]}>{item.time}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 2 },
  name: { fontSize: 22, fontFamily: "Inter_700Bold" },
  emergencyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 50,
  },
  emergencyChipText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    gap: 16,
  },
  statsDivider: { width: 1, height: 60, backgroundColor: "#e5e5e5" },
  statsRight: { flex: 1, gap: 8 },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  nextDoseCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    gap: 6,
  },
  nextDoseHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  nextDoseLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  nextDoseMed: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  followupCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  followupLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  followupTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  followupDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  quickActionBtn: {
    width: "47%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  qaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  qaLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emergencySection: { alignItems: "center", marginBottom: 16 },
  patientCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  patientRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  patientName: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  caregiverActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  careBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  careBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
