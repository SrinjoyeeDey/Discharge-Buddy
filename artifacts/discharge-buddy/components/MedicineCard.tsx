import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { DoseLog, Medicine } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  medicine: Medicine;
  dose?: DoseLog;
  onTake?: (doseId: string) => void;
  onSnooze?: (doseId: string) => void;
  compact?: boolean;
}

export function MedicineCard({ medicine, dose, onTake, onSnooze, compact }: Props) {
  const colors = useColors();

  const handleTake = () => {
    if (dose && onTake) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onTake(dose.id);
    }
  };

  const handleSnooze = () => {
    if (dose && onSnooze) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSnooze(dose.id);
    }
  };

  const getStatusColor = () => {
    if (!dose) return colors.muted;
    if (dose.status === "taken") return colors.success;
    if (dose.status === "missed") return colors.destructive;
    if (dose.status === "snoozed") return colors.warning;
    return colors.primary;
  };

  const getStatusLabel = () => {
    if (!dose) return "Scheduled";
    if (dose.status === "taken") return "Taken";
    if (dose.status === "missed") return "Missed";
    if (dose.status === "snoozed") return "Snoozed";
    return "Pending";
  };

  const statusColor = getStatusColor();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: medicine.color },
      ]}
    >
      <View style={styles.left}>
        <View style={[styles.colorDot, { backgroundColor: medicine.color }]} />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]}>{medicine.name}</Text>
          <Text style={[styles.dosage, { color: colors.mutedForeground }]}>
            {medicine.dosage} · {dose?.scheduledTime ?? medicine.times[0]}
          </Text>
          {!compact && (
            <Text style={[styles.instructions, { color: colors.mutedForeground }]} numberOfLines={2}>
              {medicine.simplifiedInstructions}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.right}>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel()}</Text>
        </View>

        {dose?.status === "pending" && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleSnooze} style={[styles.actionBtn, { backgroundColor: `${colors.warning}15` }]}>
              <Feather name="clock" size={16} color={colors.warning} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleTake} style={[styles.actionBtn, { backgroundColor: `${colors.success}15` }]}>
              <Feather name="check" size={16} color={colors.success} />
            </TouchableOpacity>
          </View>
        )}

        {dose?.status === "taken" && (
          <Feather name="check-circle" size={20} color={colors.success} style={{ marginTop: 6 }} />
        )}
        {dose?.status === "missed" && (
          <Feather name="x-circle" size={20} color={colors.destructive} style={{ marginTop: 6 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 10,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  dosage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  instructions: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
    marginLeft: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  actions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    padding: 7,
    borderRadius: 8,
  },
});
