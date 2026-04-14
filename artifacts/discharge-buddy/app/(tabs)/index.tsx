import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getLevel, useApp } from "@/context/AppContext";
import { useSidebar } from "@/context/SidebarContext";

const { width } = Dimensions.get("window");

const TEAL = "#0891b2";
const TEAL_DARK = "#0c4a6e";
const WHITE = "#ffffff";

// ─── Circular Progress Chart ─────────────────────────────────────────────────
function CircularProgress({ pct, size = 120 }: { pct: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      {/* Track */}
      <Circle
        cx={cx} cy={cy} r={r}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={stroke}
        fill="none"
      />
      {/* Progress */}
      <Circle
        cx={cx} cy={cy} r={r}
        stroke="#c8f6ff"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${cx},${cy}`}
      />
      {/* Center label */}
      <SvgText
        x={cx} y={cy - 8}
        textAnchor="middle"
        fill={WHITE}
        fontSize="22"
        fontWeight="bold"
      >
        {pct}%
      </SvgText>
      <SvgText
        x={cx} y={cy + 12}
        textAnchor="middle"
        fill="rgba(255,255,255,0.7)"
        fontSize="10"
      >
        adherence
      </SvgText>
    </Svg>
  );
}

// ─── Weekly Bar Chart ─────────────────────────────────────────────────────────
function WeeklyBars({ taken = 0, total = 0 }: { taken: number; total: number }) {
  const today = new Date();
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const todayIdx = (today.getDay() + 6) % 7; // Mon=0
  const barW = 22;
  const barH = 70;
  const gap = (width - 36 - days.length * barW) / (days.length - 1);
  const chartW = width - 36;

  const randomVals = [85, 100, 70, 90, 100, taken > 0 ? Math.round((taken / (total || 1)) * 100) : 60, 0];

  return (
    <Svg width={chartW} height={barH + 28}>
      {days.map((d, i) => {
        const pct = i <= todayIdx ? randomVals[i] / 100 : 0;
        const h = Math.round(pct * barH);
        const x = i * (barW + gap);
        const y = barH - h;
        const isToday = i === todayIdx;
        return (
          <G key={i}>
            {/* Track bar */}
            <Rect
              x={x} y={0}
              width={barW} height={barH}
              rx={barW / 2} ry={barW / 2}
              fill="rgba(255,255,255,0.12)"
            />
            {/* Fill bar */}
            {pct > 0 && (
              <Rect
                x={x} y={y}
                width={barW} height={h}
                rx={barW / 2} ry={barW / 2}
                fill={isToday ? "#c8f6ff" : "rgba(255,255,255,0.55)"}
              />
            )}
            {/* Day label */}
            <SvgText
              x={x + barW / 2} y={barH + 18}
              textAnchor="middle"
              fill={isToday ? "#c8f6ff" : "rgba(255,255,255,0.55)"}
              fontSize="11"
              fontWeight={isToday ? "bold" : "normal"}
            >
              {d}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { role } = useApp();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  if (role === "caregiver") return <CaregiverDashboard topInset={topInset} />;
  return <PatientDashboard topInset={topInset} />;
}

// ─── Patient Dashboard ────────────────────────────────────────────────────────
function PatientDashboard({ topInset }: { topInset: number }) {
  const { user, todayDoses, medicines, followUps, updateDoseStatus } = useApp();
  const { open: openSidebar } = useSidebar();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const taken = todayDoses.filter(d => d.status === "taken").length;
  const total = todayDoses.length;
  const missed = todayDoses.filter(d => d.status === "missed").length;
  const pending = todayDoses.filter(d => d.status === "pending").length;
  const adherencePct = total > 0 ? Math.round((taken / total) * 100) : 0;

  const upcomingFollowUp = followUps.find(f => !f.completed);
  const [showAll, setShowAll] = useState(false);

  const recentActivity = todayDoses.slice(0, showAll ? undefined : 4).map(dose => ({
    dose,
    med: medicines.find(m => m.id === dose.medicineId),
  }));

  const getRiskColor = () => missed >= 2 ? "#ef4444" : missed === 1 ? "#f59e0b" : "#10b981";
  const getRiskLabel = () => missed >= 2 ? "High Risk" : missed === 1 ? "Moderate" : "On Track";
  const firstName = (user?.name ?? "Patient").split(" ")[0];

  return (
    <View style={{ flex: 1, backgroundColor: WHITE }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 90 }}
      >
        {/* ── Dark teal header ── */}
        <View style={[styles.headerBg, { paddingTop: topInset + 12 }]}>
          {/* Top row */}
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}>
              <Feather name="menu" size={22} color={WHITE} />
            </TouchableOpacity>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Feather name="user" size={18} color={TEAL} />
              </View>
              <View>
                <Text style={styles.helloText}>Hello,</Text>
                <Text style={styles.nameText}>{firstName}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/notifications")}
              style={styles.iconBtn}
            >
              <Feather name="bell" size={20} color={WHITE} />
              <View style={styles.bellDot} />
            </TouchableOpacity>
          </View>

          {/* Charts row */}
          <View style={styles.chartsRow}>
            {/* Circular */}
            <CircularProgress pct={adherencePct} size={120} />

            {/* Right stats */}
            <View style={styles.chartStats}>
              <Text style={styles.statLabel}>Recovery Status</Text>
              <View style={[styles.riskPill, { backgroundColor: `${getRiskColor()}25` }]}>
                <View style={[styles.riskDot, { backgroundColor: getRiskColor() }]} />
                <Text style={[styles.riskText, { color: getRiskColor() }]}>{getRiskLabel()}</Text>
              </View>
              <Text style={styles.statSub}>{taken}/{total} doses today</Text>
              <Text style={styles.statSub2}>{missed} missed · {pending} pending</Text>
            </View>
          </View>

          {/* Weekly bar chart */}
          <View style={styles.weeklyChart}>
            <Text style={styles.weeklyLabel}>This Week</Text>
            <WeeklyBars taken={taken} total={total} />
          </View>

          {/* Action buttons */}
          <View style={styles.actionBtns}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/(tabs)/medicines")}>
              <Feather name="check-square" size={15} color={TEAL_DARK} />
              <Text style={styles.actionBtnText}>Track Dose</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/scan")}>
              <Feather name="camera" size={15} color={TEAL_DARK} />
              <Text style={styles.actionBtnText}>Scan Rx</Text>
            </TouchableOpacity>
          </View>

          {/* Filter pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {["All Doses", "Morning", "Afternoon", "Night"].map((label, i) => (
              <TouchableOpacity key={i} style={[styles.filterPill, i === 0 && styles.filterPillActive]}>
                <Text style={[styles.filterPillText, i === 0 && styles.filterPillTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── White content area ── */}
        <View style={styles.whiteArea}>
          {/* Quick action circles */}
          <View style={styles.quickRow}>
            {[
              { icon: "activity" as const, label: "Symptoms", color: "#f59e0b", route: "/(tabs)/symptoms" },
              { icon: "calendar" as const, label: "Schedule", color: "#8b5cf6", route: "/(tabs)/schedule" },
              { icon: "message-circle" as const, label: "AI Help", color: TEAL, route: "/chat" },
              { icon: "alert-triangle" as const, label: "Emergency", color: "#ef4444", route: "/emergency" },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(item.route as any);
                }}
              >
                <View style={[styles.quickCircle, { backgroundColor: `${item.color}15`, borderColor: `${item.color}30` }]}>
                  <Feather name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={styles.quickLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Upcoming follow-up */}
          {upcomingFollowUp && (
            <TouchableOpacity onPress={() => router.push("/(tabs)/followups")} style={styles.followupBanner}>
              <View style={styles.followupLeft}>
                <View style={[styles.followupIcon, { backgroundColor: `${TEAL}20` }]}>
                  <Feather name="calendar" size={18} color={TEAL} />
                </View>
                <View>
                  <Text style={styles.followupTitle}>{upcomingFollowUp.title}</Text>
                  <Text style={styles.followupDate}>
                    {new Date(upcomingFollowUp.dateTime).toLocaleDateString("en", {
                      weekday: "short", month: "short", day: "numeric",
                    })} · {upcomingFollowUp.doctorName}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={TEAL} />
            </TouchableOpacity>
          )}

          {/* Recent doses */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Doses</Text>
            <TouchableOpacity onPress={() => setShowAll(!showAll)}>
              <Text style={[styles.seeAll, { color: TEAL }]}>{showAll ? "Show less" : "See all"}</Text>
            </TouchableOpacity>
          </View>

          {recentActivity.map(({ dose, med }) => {
            if (!med) return null;
            const statusColor =
              dose.status === "taken" ? "#10b981"
              : dose.status === "missed" ? "#ef4444"
              : dose.status === "snoozed" ? "#f59e0b"
              : TEAL;
            const statusIcon =
              dose.status === "taken" ? "check-circle" as const
              : dose.status === "missed" ? "x-circle" as const
              : "clock" as const;
            return (
              <View key={dose.id} style={styles.activityRow}>
                <View style={[styles.activityIcon, { backgroundColor: `${med.color}15` }]}>
                  <Feather name="package" size={18} color={med.color} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityName}>{dose.medicineName}</Text>
                  <Text style={styles.activitySub}>{med.dosage} · {dose.scheduledTime}</Text>
                </View>
                <View style={styles.activityRight}>
                  <Feather name={statusIcon} size={20} color={statusColor} />
                  {dose.status === "pending" && (
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        updateDoseStatus(dose.id, "taken");
                      }}
                      style={[styles.takeBtn, { backgroundColor: `${TEAL}15` }]}
                    >
                      <Text style={[styles.takeBtnText, { color: TEAL }]}>Take</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {[
              { label: "Taken Today", value: taken, color: "#10b981", icon: "check-circle" as const },
              { label: "Missed", value: missed, color: "#ef4444", icon: "x-circle" as const },
              { label: "Pending", value: pending, color: TEAL, icon: "clock" as const },
              { label: "Total Meds", value: medicines.length, color: "#8b5cf6", icon: "package" as const },
            ].map((item, i) => (
              <View key={i} style={[styles.statCard, { borderColor: `${item.color}30`, backgroundColor: `${item.color}08` }]}>
                <Feather name={item.icon} size={20} color={item.color} />
                <Text style={[styles.statCardValue, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.statCardLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Caregiver Dashboard ──────────────────────────────────────────────────────
function CaregiverDashboard({ topInset }: { topInset: number }) {
  const { user, linkedPatients } = useApp();
  const { open: openSidebar } = useSidebar();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const patient = linkedPatients[0];

  const ACTIVITY = [
    { icon: "check-circle" as const, text: "Took Lisinopril 10mg", time: "8:03 AM", color: "#10b981" },
    { icon: "check-circle" as const, text: "Took Metformin 500mg", time: "8:05 AM", color: "#10b981" },
    { icon: "activity" as const, text: "Logged: mild headache", time: "10:30 AM", color: "#f59e0b" },
    { icon: "x-circle" as const, text: "Missed Aspirin 81mg", time: "8:00 PM", color: "#ef4444" },
    { icon: "clock" as const, text: "Atorvastatin pending", time: "9:00 PM", color: TEAL },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: WHITE }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 90 }}
      >
        <View style={[styles.headerBg, { paddingTop: topInset + 12 }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}>
              <Feather name="menu" size={22} color={WHITE} />
            </TouchableOpacity>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Feather name="users" size={18} color={TEAL} />
              </View>
              <View>
                <Text style={styles.helloText}>Caregiver,</Text>
                <Text style={styles.nameText}>{(user?.name ?? "Caregiver").split(" ")[0]}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push("/notifications")} style={styles.iconBtn}>
              <Feather name="bell" size={20} color={WHITE} />
              <View style={styles.bellDot} />
            </TouchableOpacity>
          </View>

          {/* Circular chart */}
          <View style={styles.chartsRow}>
            <CircularProgress pct={60} size={120} />
            <View style={styles.chartStats}>
              <Text style={styles.statLabel}>Patient Adherence</Text>
              <Text style={styles.nameText}>{patient?.name ?? "No Patient"}</Text>
              <Text style={styles.statSub}>{patient?.condition ?? ""}</Text>
              <Text style={styles.statSub2}>3 taken · 1 missed</Text>
            </View>
          </View>

          <View style={styles.weeklyChart}>
            <Text style={styles.weeklyLabel}>Patient — This Week</Text>
            <WeeklyBars taken={3} total={5} />
          </View>

          <View style={styles.actionBtns}>
            <TouchableOpacity style={styles.actionBtn}>
              <Feather name="phone" size={15} color={TEAL_DARK} />
              <Text style={styles.actionBtnText}>Call Patient</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#fecaca" }]}>
              <Feather name="alert-triangle" size={15} color="#ef4444" />
              <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>Emergency</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {["Today", "This Week", "All Time"].map((label, i) => (
              <TouchableOpacity key={i} style={[styles.filterPill, i === 0 && styles.filterPillActive]}>
                <Text style={[styles.filterPillText, i === 0 && styles.filterPillTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.whiteArea}>
          <View style={styles.quickRow}>
            {[
              { icon: "eye" as const, label: "Monitor", color: TEAL },
              { icon: "bell" as const, label: "Remind", color: "#f59e0b" },
              { icon: "message-circle" as const, label: "Message", color: "#8b5cf6" },
              { icon: "alert-triangle" as const, label: "Alert", color: "#ef4444" },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.quickItem}>
                <View style={[styles.quickCircle, { backgroundColor: `${item.color}15`, borderColor: `${item.color}30` }]}>
                  <Feather name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={styles.quickLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Patient Activity</Text>
            <Text style={[styles.seeAll, { color: TEAL }]}>See all</Text>
          </View>

          {ACTIVITY.map((item, i) => (
            <View key={i} style={styles.activityRow}>
              <View style={[styles.activityIcon, { backgroundColor: `${item.color}15` }]}>
                <Feather name={item.icon} size={18} color={item.color} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityName}>{item.text}</Text>
                <Text style={styles.activitySub}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBg: {
    backgroundColor: TEAL_DARK,
    paddingHorizontal: 18,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },
  helloText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  nameText: {
    color: WHITE,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fbbf24",
    top: 9,
    right: 9,
    borderWidth: 1.5,
    borderColor: TEAL_DARK,
  },

  // Charts
  chartsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
  },
  chartStats: {
    flex: 1,
    gap: 6,
  },
  statLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  riskPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 50,
    alignSelf: "flex-start",
  },
  riskDot: { width: 7, height: 7, borderRadius: 4 },
  riskText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  statSub2: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },

  weeklyChart: {
    marginBottom: 20,
    gap: 10,
  },
  weeklyLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },

  actionBtns: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#c8f6ff",
    paddingVertical: 11,
    borderRadius: 12,
  },
  actionBtnText: {
    color: TEAL_DARK,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  filterScroll: { marginBottom: 20 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginRight: 8,
  },
  filterPillActive: { backgroundColor: "#c8f6ff", borderColor: "transparent" },
  filterPillText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  filterPillTextActive: {
    color: TEAL_DARK,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  whiteArea: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -2,
    paddingHorizontal: 18,
    paddingTop: 24,
  },

  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  quickItem: { alignItems: "center", gap: 8, flex: 1 },
  quickCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  quickLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#475569",
    textAlign: "center",
  },

  followupBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0f9ff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  followupLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  followupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  followupTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#0f172a",
    marginBottom: 2,
  },
  followupDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#0f172a",
  },
  seeAll: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  activityInfo: { flex: 1 },
  activityName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#0f172a",
    marginBottom: 2,
  },
  activitySub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
  },
  activityRight: { alignItems: "flex-end", gap: 4 },
  takeBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  takeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 20,
  },
  statCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  statCardValue: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  statCardLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
  },
});
