import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Polygon, Stop, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RiskBanner } from "@/components/RiskBanner";
import { SymptomLog, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const PINK = "#e91e8c";
const PURPLE = "#8b5cf6";

const COMMON_SYMPTOMS = [
  "Chest pain", "Shortness of breath", "Dizziness", "Nausea",
  "Headache", "Fatigue", "Swelling", "Fever",
  "Irregular heartbeat", "Vomiting", "Back pain", "Confusion",
];
const DANGER_SYMPTOMS = ["Chest pain", "Shortness of breath", "Irregular heartbeat", "Confusion"];

// ── Trend Chart ───────────────────────────────────────────────────────────────
function TrendChart({ logs }: { logs: SymptomLog[] }) {
  const chartW = width - 32;
  const chartH = 120;
  const paddingLeft = 28;
  const paddingBottom = 24;
  const plotW = chartW - paddingLeft - 10;
  const plotH = chartH - paddingBottom - 10;

  // Build last-7-days data
  const days: { label: string; severity: number | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString("en", { weekday: "narrow" });
    const log = logs.find((l) => l.date.startsWith(key));
    days.push({ label: dayLabel, severity: log?.severity ?? null });
  }

  const hasData = days.some((d) => d.severity !== null);

  // Compute SVG path
  const points: { x: number; y: number }[] = [];
  days.forEach((d, i) => {
    if (d.severity !== null) {
      const x = paddingLeft + (i / 6) * plotW;
      const y = 10 + plotH - (d.severity / 10) * plotH;
      points.push({ x, y });
    }
  });

  let pathD = "";
  let polyPoints = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
    polyPoints = [
      `${points[0].x},${10 + plotH}`,
      ...points.map((p) => `${p.x},${p.y}`),
      `${points[points.length - 1].x},${10 + plotH}`,
    ].join(" ");
  }

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.header}>
        <Text style={chartStyles.title}>Symptom Trend</Text>
        <Text style={chartStyles.sub}>Last 7 days</Text>
      </View>
      {!hasData ? (
        <View style={chartStyles.empty}>
          <Text style={chartStyles.emptyText}>Log symptoms to see your trend</Text>
        </View>
      ) : (
        <Svg width={chartW} height={chartH}>
          <Defs>
            <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={PINK} stopOpacity="0.25" />
              <Stop offset="1" stopColor={PINK} stopOpacity="0.02" />
            </SvgGradient>
          </Defs>

          {/* Grid lines */}
          {[2, 5, 8].map((v) => {
            const y = 10 + plotH - (v / 10) * plotH;
            return (
              <Line key={v} x1={paddingLeft} y1={y} x2={chartW - 10} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            );
          })}

          {/* Y-axis labels */}
          {[2, 5, 8].map((v) => {
            const y = 10 + plotH - (v / 10) * plotH;
            return (
              <SvgText key={v} x={paddingLeft - 4} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="9">
                {v}
              </SvgText>
            );
          })}

          {/* Area fill */}
          {points.length > 1 && <Polygon points={polyPoints} fill="url(#areaGrad)" />}

          {/* Line */}
          {points.length > 1 && (
            <Path d={pathD} stroke={PINK} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Data points */}
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={4} fill={PINK} stroke="#fff" strokeWidth={2} />
          ))}

          {/* X-axis labels */}
          {days.map((d, i) => {
            const x = paddingLeft + (i / 6) * plotW;
            return (
              <SvgText key={i} x={x} y={chartH - 4} textAnchor="middle" fill="#94a3b8" fontSize="9">
                {d.label}
              </SvgText>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0f172a" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#94a3b8" },
  empty: { height: 80, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#94a3b8" },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SymptomsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { symptomLogs, addSymptomLog } = useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const [severity, setSeverity] = useState(3);
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const toggleSymptom = (s: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const getRisk = (): SymptomLog["riskLevel"] => {
    const hasDanger = selected.some((s) => DANGER_SYMPTOMS.includes(s));
    if (hasDanger || severity >= 8) return "high";
    if (severity >= 5) return "medium";
    return "low";
  };

  const handleSubmit = () => {
    if (selected.length === 0) {
      Alert.alert("Select Symptoms", "Please select at least one symptom.");
      return;
    }
    const risk = getRisk();
    const log: SymptomLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      symptoms: selected,
      severity,
      notes,
      riskLevel: risk,
    };
    addSymptomLog(log);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (risk === "high") {
      Alert.alert(
        "⚠️ High Risk Detected",
        "Your symptoms may require immediate attention. Your caregiver has been notified.",
        [{ text: "OK" }]
      );
    }
    setSelected([]);
    setSeverity(3);
    setNotes("");
    setShowForm(false);
  };

  const severityColor = severity >= 8 ? "#ef4444" : severity >= 5 ? "#f59e0b" : "#10b981";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Symptoms</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {symptomLogs.length} logs · Track your recovery
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowForm(true)}
          style={[styles.logBtn, { backgroundColor: PINK }]}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.logBtnText}>Log Today</Text>
        </TouchableOpacity>
      </View>

      {showForm ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Severity preview */}
          <View style={[styles.severityPreview, { backgroundColor: `${severityColor}15`, borderColor: `${severityColor}30` }]}>
            <Text style={styles.severityEmoji}>
              {severity >= 8 ? "🚨" : severity >= 5 ? "⚠️" : "✅"}
            </Text>
            <View>
              <Text style={[styles.severityPreviewText, { color: severityColor }]}>
                Severity {severity}/10 — {severity >= 8 ? "High Risk" : severity >= 5 ? "Moderate" : "Low Risk"}
              </Text>
              <Text style={[styles.severityPreviewSub, { color: colors.mutedForeground }]}>
                {severity >= 8 ? "Please contact your doctor" : severity >= 5 ? "Monitor closely" : "Feeling manageable"}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Select Symptoms</Text>
          <View style={styles.symptomsGrid}>
            {COMMON_SYMPTOMS.map((s) => {
              const isSelected = selected.includes(s);
              const isDanger = DANGER_SYMPTOMS.includes(s);
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => toggleSymptom(s)}
                  style={[
                    styles.symptomChip,
                    {
                      backgroundColor: isSelected ? (isDanger ? "#fef2f2" : `${PINK}15`) : colors.card,
                      borderColor: isSelected ? (isDanger ? "#ef4444" : PINK) : colors.border,
                    },
                  ]}
                >
                  {isDanger && (
                    <Feather name="alert-circle" size={12} color={isSelected ? "#ef4444" : colors.mutedForeground} />
                  )}
                  <Text style={[styles.symptomText, { color: isSelected ? (isDanger ? "#ef4444" : PINK) : colors.foreground }]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selected.some((s) => DANGER_SYMPTOMS.includes(s)) && (
            <RiskBanner level="high" message="You've selected a danger symptom. Please contact your doctor or use the emergency button." />
          )}

          <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 16 }]}>Severity (1–10)</Text>
          <View style={styles.severityRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
              const c = n >= 8 ? "#ef4444" : n >= 5 ? "#f59e0b" : "#10b981";
              return (
                <TouchableOpacity
                  key={n}
                  onPress={() => setSeverity(n)}
                  style={[
                    styles.severityBtn,
                    { backgroundColor: severity >= n ? c : colors.muted, borderColor: severity === n ? c : colors.border },
                  ]}
                >
                  <Text style={[styles.severityText, { color: severity >= n ? "#fff" : colors.mutedForeground }]}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 16 }]}>Additional Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe how you feel..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            style={[styles.notesInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          />

          <View style={styles.formActions}>
            <TouchableOpacity onPress={() => setShowForm(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSubmit} style={[styles.submitBtn, { backgroundColor: PINK }]}>
              <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Submit  +15 XP</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Trend chart always visible */}
          <TrendChart logs={symptomLogs} />

          {symptomLogs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No Symptoms Logged</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Tap "Log Today" to record your first symptom
              </Text>
            </View>
          ) : (
            symptomLogs.map((log) => (
              <View key={log.id} style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.logCardHeader}>
                  <Text style={[styles.logDate, { color: colors.foreground }]}>
                    {new Date(log.date).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  <View style={[
                    styles.riskBadge,
                    {
                      backgroundColor: log.riskLevel === "high" ? "#fef2f2"
                        : log.riskLevel === "medium" ? "#fffbeb" : "#f0fdf4",
                    },
                  ]}>
                    <Text style={[
                      styles.riskText,
                      {
                        color: log.riskLevel === "high" ? "#ef4444"
                          : log.riskLevel === "medium" ? "#f59e0b" : "#10b981",
                      },
                    ]}>
                      {log.riskLevel === "high" ? "🚨" : log.riskLevel === "medium" ? "⚠️" : "✅"} {log.riskLevel.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.symptomsList}>
                  {log.symptoms.map((s) => (
                    <View key={s} style={[styles.symptomTag, { backgroundColor: `${PINK}12` }]}>
                      <Text style={[styles.symptomTagText, { color: PINK }]}>{s}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.severityBarRow}>
                  <Text style={[styles.severityLabel, { color: colors.mutedForeground }]}>Severity</Text>
                  <View style={styles.severityMini}>
                    {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                      <View
                        key={n}
                        style={[
                          styles.severityDot,
                          {
                            backgroundColor: n <= log.severity
                              ? (log.severity >= 8 ? "#ef4444" : log.severity >= 5 ? "#f59e0b" : "#10b981")
                              : "#e2e8f0",
                          }
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.severityNum, { color: colors.foreground }]}>{log.severity}/10</Text>
                </View>
                {log.notes ? <Text style={[styles.noteText, { color: colors.mutedForeground }]}>{log.notes}</Text> : null}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  logBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50 },
  logBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  severityPreview: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
    borderRadius: 14, borderWidth: 1, marginBottom: 16,
  },
  severityEmoji: { fontSize: 28 },
  severityPreviewText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  severityPreviewSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  symptomsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  symptomChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 50, borderWidth: 1.5,
  },
  symptomText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  severityRow: { flexDirection: "row", gap: 5 },
  severityBtn: { flex: 1, aspectRatio: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  severityText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  notesInput: {
    borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 14,
    fontFamily: "Inter_400Regular", minHeight: 80, textAlignVertical: "top",
  },
  formActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 1 },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  empty: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  logCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12, gap: 10 },
  logCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logDate: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  riskText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  symptomsList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  symptomTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  symptomTagText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  severityBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  severityLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  severityMini: { flex: 1, flexDirection: "row", gap: 3 },
  severityDot: { flex: 1, height: 6, borderRadius: 3 },
  severityNum: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 28, textAlign: "right" },
  noteText: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
});
