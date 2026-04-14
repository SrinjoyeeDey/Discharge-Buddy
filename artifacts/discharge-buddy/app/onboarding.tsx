import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    image: require("@/assets/images/onboarding1.png"),
    title: "Your Recovery,\nSimplified",
    subtitle:
      "DischargeBuddy turns complex hospital discharge papers into a clear, manageable daily plan.",
  },
  {
    id: "2",
    image: require("@/assets/images/onboarding2.png"),
    title: "Never Miss\nA Dose",
    subtitle:
      "Smart reminders at the right time. Scan your prescription and we create your medicine schedule automatically.",
  },
  {
    id: "3",
    image: require("@/assets/images/onboarding3.png"),
    title: "Caregiver\nSupport",
    subtitle:
      "Family members can monitor your recovery, get alerts, and take action — all from their own device.",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setOnboarded } = useApp();
  const [current, setCurrent] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (current < slides.length - 1) {
      flatRef.current?.scrollToIndex({ index: current + 1, animated: true });
      setCurrent(current + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    setOnboarded(true);
    router.replace("/role-select");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.imageWrapper, { paddingTop: topInset + 20 }]}>
              <Image source={item.image} style={styles.image} resizeMode="contain" />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: bottomInset + 20 }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === current ? colors.primary : colors.border,
                  width: i === current ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={goNext}
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.nextText, { color: colors.primaryForeground }]}>
            {current === slides.length - 1 ? "Get Started" : "Next"}
          </Text>
          <Feather name="arrow-right" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>

        {current < slides.length - 1 && (
          <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: "center",
  },
  imageWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  image: {
    width: width * 0.75,
    height: width * 0.75,
  },
  textContainer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 38,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 16,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 50,
    width: "100%",
  },
  nextText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  skipBtn: {
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
