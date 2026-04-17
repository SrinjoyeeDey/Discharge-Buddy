import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Medicine, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const MEDICINE_COLORS = ["#0891b2", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

const API_URL = "http://10.0.2.2:8000";

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, addMedicine, isProcessingPrescription, addPrescription } = useApp();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [image, setImage] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Partial<Medicine>[] | null>(null);
  const [processing, setProcessing] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    setProcessing(true);
    setExtracted(null);
    await addPrescription(uri);
    
    try {
      // 1. Upload to OCR engine
      const formData = new FormData();
      const filename = uri.split('/').pop() || "prescription.jpg";
      formData.append("image", {
        uri,
        name: filename,
        type: "image/jpeg"
      } as any);

      const ocrRes = await fetch(`${API_URL}/ocr/extract`, {
        method: "POST",
        body: formData,
      });
      const ocrData = await ocrRes.json();
      if (!ocrRes.ok) throw new Error(ocrData.detail || "OCR Extraction Failed");

      // 2. Process with fuzzy matching engine
      // Warning: In offline mode, user?.id might be missing or backend might not have token validation wired up for this endpoint yet
      const processRes = await fetch(`${API_URL}/prescriptions/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer offline" },
        body: JSON.stringify({
          patient_id: user?.id || "offline",
          extracted_text: ocrData.normalized_text
        })
      });
      const processData = await processRes.json();
      if (!processRes.ok) throw new Error(processData.detail || "Processing Failed");

      // Map backend response to Medicine parts
      const meds = processData.medicines.map((m: any) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        times: m.times,
        instructions: m.instructions,
        simplifiedInstructions: m.simplified_instructions
      }));
      setExtracted(meds);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error(err);
      alert(`Error scanning prescription: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleAddAll = () => {
    if (!extracted) return;
    extracted.forEach((med, i) => {
      addMedicine({
        id: `${Date.now()}_${i}`,
        name: med.name ?? "Unknown",
        dosage: med.dosage ?? "",
        frequency: med.frequency ?? "",
        times: med.times ?? ["08:00"],
        instructions: med.instructions ?? "",
        simplifiedInstructions: med.simplifiedInstructions ?? "",
        startDate: new Date().toISOString(),
        color: MEDICINE_COLORS[i % MEDICINE_COLORS.length],
      });
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 12, paddingBottom: bottomInset + 40, paddingHorizontal: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Scan Prescription</Text>
        <View style={{ width: 22 }} />
      </View>

      {!image ? (
        <View style={styles.uploadArea}>
          <View style={[styles.uploadBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="file-text" size={48} color={colors.primary} />
            <Text style={[styles.uploadTitle, { color: colors.foreground }]}>Upload Prescription</Text>
            <Text style={[styles.uploadSubtitle, { color: colors.mutedForeground }]}>
              Take a photo or upload from gallery. We'll extract your medicines automatically.
            </Text>
          </View>

          <TouchableOpacity
            onPress={takePhoto}
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="camera" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={pickImage}
            style={[styles.actionBtnOutline, { borderColor: colors.primary }]}
          >
            <Feather name="image" size={20} color={colors.primary} />
            <Text style={[styles.actionBtnOutlineText, { color: colors.primary }]}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.resultArea}>
          <View style={[styles.imagePreview, { borderColor: colors.border }]}>
            <Image source={{ uri: image }} style={styles.previewImg} resizeMode="cover" />
          </View>

          {processing ? (
            <View style={styles.processingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.processingText, { color: colors.foreground }]}>Analyzing Prescription...</Text>
              <Text style={[styles.processingSubtext, { color: colors.mutedForeground }]}>
                Extracting medicine names, dosages, and instructions
              </Text>
            </View>
          ) : extracted ? (
            <View style={styles.extractedSection}>
              <View style={styles.extractedHeader}>
                <Feather name="check-circle" size={20} color={colors.success} />
                <Text style={[styles.extractedTitle, { color: colors.foreground }]}>
                  {extracted.length} Medicines Found
                </Text>
              </View>

              {extracted.map((med, i) => (
                <View key={i} style={[styles.medExtractCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: MEDICINE_COLORS[i % MEDICINE_COLORS.length] }]}>
                  <Text style={[styles.medExtractName, { color: colors.foreground }]}>{med.name}</Text>
                  <Text style={[styles.medExtractDosage, { color: colors.mutedForeground }]}>
                    {med.dosage} · {med.frequency}
                  </Text>
                  <Text style={[styles.medExtractInstructions, { color: colors.mutedForeground }]}>
                    {med.simplifiedInstructions}
                  </Text>
                </View>
              ))}

              <TouchableOpacity
                onPress={handleAddAll}
                style={[styles.addAllBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="plus-circle" size={18} color="#fff" />
                <Text style={styles.addAllText}>Add All to My Schedule</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setImage(null); setExtracted(null); }}
                style={[styles.retryBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.retryText, { color: colors.mutedForeground }]}>Scan Another</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  uploadArea: { gap: 14 },
  uploadBox: {
    alignItems: "center",
    padding: 40,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: "dashed",
    gap: 14,
    marginBottom: 8,
  },
  uploadTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  uploadSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  actionBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  actionBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  actionBtnOutlineText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  resultArea: { gap: 20 },
  imagePreview: { borderRadius: 16, overflow: "hidden", borderWidth: 1 },
  previewImg: { width: "100%", height: 200 },
  processingBox: { alignItems: "center", padding: 32, gap: 14 },
  processingText: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  processingSubtext: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  extractedSection: { gap: 12 },
  extractedHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  extractedTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  medExtractCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 4,
  },
  medExtractName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  medExtractDosage: { fontSize: 13, fontFamily: "Inter_400Regular" },
  medExtractInstructions: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  addAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  addAllText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  retryBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  retryText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
