import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { Sidebar } from "@/components/Sidebar";
import { useColors } from "@/hooks/useColors";

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#0891b2",
          tabBarInactiveTintColor: colors.mutedForeground,
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : colors.tabBarBackground,
            borderTopWidth: isWeb ? 1 : 0,
            borderTopColor: colors.border,
            elevation: 0,
            ...(isWeb ? { height: 84 } : {}),
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : isWeb ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBarBackground }]} />
            ) : null,
          tabBarLabelStyle: {
            fontFamily: "Inter_500Medium",
            fontSize: 11,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: "Schedule",
            tabBarIcon: ({ color }) => <Feather name="calendar" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="medicines"
          options={{
            title: "Medicines",
            tabBarIcon: ({ color }) => <Feather name="package" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="symptoms"
          options={{
            title: "Activity",
            tabBarIcon: ({ color }) => <Feather name="activity" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="followups"
          options={{
            title: "Follow-ups",
            tabBarIcon: ({ color }) => <Feather name="clipboard" size={22} color={color} />,
          }}
        />
      </Tabs>
      <Sidebar />
    </>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}
