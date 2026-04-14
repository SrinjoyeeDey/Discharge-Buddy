import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import { FloatingTabBar } from "@/components/FloatingTabBar";
import { Sidebar } from "@/components/Sidebar";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

function tabIcon(name: FeatherName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Feather name={name} size={size} color={color} />
  );
}

export default function TabLayout() {
  return (
    <>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home") }} />
        <Tabs.Screen name="medicines" options={{ title: "Medicines", tabBarIcon: tabIcon("package") }} />
        <Tabs.Screen name="symptoms" options={{ title: "Activity", tabBarIcon: tabIcon("activity") }} />
        <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: tabIcon("award") }} />
        {/* Hidden from tab bar - accessible via links */}
        <Tabs.Screen name="followups" options={{ href: null }} />
        <Tabs.Screen name="schedule" options={{ href: null }} />
      </Tabs>
      <Sidebar />
    </>
  );
}
