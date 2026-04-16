import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";

import colors from "@/constants/colors";

const theme = colors.light;
const WHITE = "#ffffff";
const PINK = theme.primary;
const PINK_DARK = "#fb2c67";

export default function EmergencyCardScreen() {
  const insets = useSafeAreaInsets();
  const { user, medicines, patient, setUser } = useApp();
  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const [editing, setEditing] = useState(false);

  const [bloodType, setBloodType] = useState(user?.bloodType ?? "O+");
  const [allergies, setAllergies] = useState(user?.allergies ?? "Penicillin");
  const [ecName, setEcName] = useState(user?.emergencyContactName ?? "Jane Doe");
  const [ecPhone, setEcPhone] = useState(user?.emergencyContactPhone ?? "+1 (555) 911-0000");

  const handleSave = () => {
    if (user) {
      setUser({ ...user, bloodType, allergies, emergencyContactName: ecName, emergencyContactPhone: ecPhone });
    }
    setEditing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff1f4" }}>
      {/* Header */}
      <LinearGradient
        colors={[PINK_DARK, PINK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topInset + 20 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>💖</Text>
            <Text style={styles.headerTitle}>Emergency Card</Text>
          </View>
          <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)} style={styles.editBtn}>
            <Feather name={editing ? "save" : "edit-2"} size={16} color={PINK_DARK} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>Show this to emergency responders</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient identity */}
        <View style={[styles.card, styles.pinkBorder]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconWrap, { backgroundColor: `${PINK}15` }]}>
              <Feather name="user" size={18} color={PINK} />
            </View>
            <Text style={styles.cardTitle}>Patient Information</Text>
          </View>
          <Row label="Name" value={user?.name ?? patient?.name ?? "John Doe"} />
          <Row label="Age" value={`${patient?.age ?? 58} years`} />
          <Row label="Condition" value={patient?.condition ?? "Post-cardiac surgery recovery"} />
          {editing ? (
            <>
              <EditRow label="Blood Type" value={bloodType} onChange={setBloodType} />
              <EditRow label="Known Allergies" value={allergies} onChange={setAllergies} />
            </>
          ) : (
            <>
              <Row label="Blood Type" value={bloodType} highlight />
              <Row label="Known Allergies" value={allergies} danger />
            </>
          )}
        </View>

        {/* Current medicines */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconWrap, { backgroundColor: `${PINK}15` }]}>
              <Feather name="package" size={18} color={PINK} />
            </View>
            <Text style={styles.cardTitle}>Current Medications</Text>
          </View>
          {medicines.map((m, i) => (
            <View key={m.id} style={[styles.medRow, i < medicines.length - 1 && styles.medRowBorder]}>
              <View style={[styles.medDot, { backgroundColor: m.color }]} />
              <View style={styles.medInfo}>
                <Text style={styles.medName}>{m.name} — {m.dosage}</Text>
                <Text style={styles.medFreq}>{m.frequency}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Emergency contact */}
        <View style={[styles.card, styles.pinkBorder]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconWrap, { backgroundColor: `${PINK_DARK}15` }]}>
              <Feather name="phone" size={18} color={PINK_DARK} />
            </View>
            <Text style={styles.cardTitle}>Emergency Contact</Text>
          </View>
          {editing ? (
            <>
              <EditRow label="Name" value={ecName} onChange={setEcName} />
              <EditRow label="Phone" value={ecPhone} onChange={setEcPhone} />
            </>
          ) : (
            <>
              <Row label="Name" value={ecName} />
              <Row label="Phone" value={ecPhone} highlight />
            </>
          )}
        </View>

        {/* Discharge info */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconWrap, { backgroundColor: "#f59e0b15" }]}>
              <Feather name="calendar" size={18} color="#f59e0b" />
            </View>
            <Text style={styles.cardTitle}>Discharge Info</Text>
          </View>
          <Row label="Discharge Date" value={patient?.dischargeDate ? new Date(patient.dischargeDate).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" }) : "—"} />
          <Row label="Recovery Phase" value="Active Recovery" />
        </View>

        {/* Call button */}
        <TouchableOpacity style={styles.callBtn} activeOpacity={0.85}>
          <LinearGradient
            colors={[PINK_DARK, PINK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.callBtnGrad}
          >
            <Feather name="phone" size={20} color={WHITE} />
            <Text style={styles.callBtnText}>Call Emergency Contact</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          🔒 This information is stored only on your device and is not shared without your consent.
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, highlight, danger }: { label: string; value: string; highlight?: boolean; danger?: boolean }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, highlight && rowStyles.highlight, danger && rowStyles.danger]}>
        {value}
      </Text>
    </View>
  );
}

function EditRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={rowStyles.editRow}>
      <Text style={rowStyles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={rowStyles.input}
        placeholderTextColor="#94a3b8"
      />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  editRow: { paddingVertical: 4 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#64748b", flex: 1 },
  value: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#4a0418", flex: 2, textAlign: "right" },
  highlight: { color: PINK },
  danger: { color: PINK_DARK },
  input: {
    borderWidth: 1.5,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 8,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#4a0418",
    marginTop: 4,
    backgroundColor: "#fff1f4",
  },
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  headerEmoji: { fontSize: 22 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: WHITE },
  editBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: WHITE, alignItems: "center", justifyContent: "center",
  },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", textAlign: "center" },

  content: { padding: 16, paddingBottom: 40, gap: 14 },
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#fff1f4",
    shadowColor: "#fb2c67",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  pinkBorder: { borderColor: `${PINK}30` },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#4a0418" },

  medRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  medRowBorder: { borderBottomWidth: 1, borderBottomColor: "#fff1f4" },
  medDot: { width: 10, height: 10, borderRadius: 5 },
  medInfo: { flex: 1 },
  medName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#4a0418" },
  medFreq: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748b" },

  callBtn: { borderRadius: 50, overflow: "hidden", marginTop: 10 },
  callBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16,
  },
  callBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: WHITE },
  footerNote: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: "#94a3b8",
    textAlign: "center", lineHeight: 16, marginTop: 10,
  },
});
