import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RiskBanner } from "@/components/RiskBanner";
import { SymptomLog, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const COMMON_SYMPTOMS = [
  "Chest pain",
  "Shortness of breath",
  "Dizziness",
  "Nausea",
  "Headache",
  "Fatigue",
  "Swelling",
  "Fever",
  "Irregular heartbeat",
  "Vomiting",
  "Back pain",
  "Confusion",
];

const DANGER_SYMPTOMS = ["Chest pain", "Shortness of breath", "Irregular heartbeat", "Confusion"];

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
        "High Risk Detected",
        "Your symptoms may require immediate attention. Your caregiver has been notified.",
        [{ text: "OK" }]
      );
    }
    setSelected([]);
    setSeverity(3);
    setNotes("");
    setShowForm(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Symptoms</Text>
        <TouchableOpacity
          onPress={() => setShowForm(true)}
          style={[styles.logBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={[styles.logBtnText]}>Log Today</Text>
        </TouchableOpacity>
      </View>

      {showForm ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
            Select Symptoms
          </Text>
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
                      backgroundColor: isSelected
                        ? isDanger
                          ? `${colors.destructive}20`
                          : `${colors.primary}20`
                        : colors.card,
                      borderColor: isSelected
                        ? isDanger
                          ? colors.destructive
                          : colors.primary
                        : colors.border,
                    },
                  ]}
                >
                  {isDanger && (
                    <Feather name="alert-circle" size={12} color={isSelected ? colors.destructive : colors.mutedForeground} />
                  )}
                  <Text
                    style={[
                      styles.symptomText,
                      {
                        color: isSelected
                          ? isDanger
                            ? colors.destructive
                            : colors.primary
                          : colors.foreground,
                      },
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selected.some((s) => DANGER_SYMPTOMS.includes(s)) && (
            <RiskBanner
              level="high"
              message="You've selected a danger symptom. Please contact your doctor or use the emergency button."
            />
          )}

          <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 16 }]}>
            Severity (1–10)
          </Text>
          <View style={styles.severityRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setSeverity(n)}
                style={[
                  styles.severityBtn,
                  {
                    backgroundColor: severity >= n ? colors.primary : colors.muted,
                    borderColor: severity === n ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.severityText,
                    { color: severity >= n ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 16 }]}>
            Additional Notes
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe how you feel..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            style={[
              styles.notesInput,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
            ]}
          />

          <View style={styles.formActions}>
            <TouchableOpacity
              onPress={() => setShowForm(false)}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[{ color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Submit Log</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {symptomLogs.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="activity" size={48} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No Symptoms Logged</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Tap "Log Today" to record your symptoms
              </Text>
            </View>
          ) : (
            symptomLogs.map((log) => (
              <View key={log.id} style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.logCardHeader}>
                  <Text style={[styles.logDate, { color: colors.foreground }]}>
                    {new Date(log.date).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  <View
                    style={[
                      styles.riskBadge,
                      {
                        backgroundColor:
                          log.riskLevel === "high"
                            ? `${colors.destructive}20`
                            : log.riskLevel === "medium"
                            ? `${colors.warning}20`
                            : `${colors.success}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.riskText,
                        {
                          color:
                            log.riskLevel === "high"
                              ? colors.destructive
                              : log.riskLevel === "medium"
                              ? colors.warning
                              : colors.success,
                        },
                      ]}
                    >
                      {log.riskLevel.toUpperCase()} RISK
                    </Text>
                  </View>
                </View>
                <View style={styles.symptomsList}>
                  {log.symptoms.map((s) => (
                    <View key={s} style={[styles.symptomTag, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.symptomTagText, { color: colors.foreground }]}>{s}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.severityLabel, { color: colors.mutedForeground }]}>
                  Severity: {log.severity}/10
                </Text>
                {log.notes ? (
                  <Text style={[styles.noteText, { color: colors.mutedForeground }]}>{log.notes}</Text>
                ) : null}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
  },
  logBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  sectionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  symptomsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  symptomChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  symptomText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  severityRow: { flexDirection: "row", gap: 6 },
  severityBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  severityText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  notesInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
  },
  formActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  logCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  logCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logDate: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  riskText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  symptomsList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  symptomTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  symptomTagText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  severityLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  noteText: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
});
