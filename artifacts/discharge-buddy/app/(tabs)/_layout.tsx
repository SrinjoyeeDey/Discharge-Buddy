import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import { FloatingTabBar } from "@/components/FloatingTabBar";
import { Sidebar } from "@/components/Sidebar";
import { useColors } from "@/hooks/useColors";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

function tabIcon(name: FeatherName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Feather name={name} size={size} color={color} />
  );
}

export default function TabLayout() {
  const colors = useColors();

  return (
    <>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: tabIcon("home"),
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: "Schedule",
            tabBarIcon: tabIcon("calendar"),
          }}
        />
        <Tabs.Screen
          name="medicines"
          options={{
            title: "Medicines",
            tabBarIcon: tabIcon("package"),
          }}
        />
        <Tabs.Screen
          name="symptoms"
          options={{
            title: "Activity",
            tabBarIcon: tabIcon("activity"),
          }}
        />
        <Tabs.Screen
          name="followups"
          options={{
            title: "Follow-ups",
            tabBarIcon: tabIcon("clipboard"),
          }}
        />
      </Tabs>
      <Sidebar />
    </>
  );
}
