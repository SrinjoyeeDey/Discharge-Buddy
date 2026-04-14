import { Redirect } from "expo-router";
import { useApp } from "@/context/AppContext";

export default function EntryScreen() {
  const { isOnboarded, role } = useApp();

  if (!isOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  if (!role) {
    return <Redirect href="/role-select" />;
  }

  return <Redirect href="/(tabs)" />;
}
