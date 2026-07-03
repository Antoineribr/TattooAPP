import { Tabs } from "expo-router";
import { useAuthStore } from "@/store/useAuthStore";
import { CustomTabBar } from "@/components/ui/CustomTabBar";

export default function TabsLayout() {
  const { profile } = useAuthStore();
  const isArtist = profile?.role === "artist";

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} isArtist={isArtist} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="board" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="publish" />
    </Tabs>
  );
}
