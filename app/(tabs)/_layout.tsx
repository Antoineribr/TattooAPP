import { Tabs } from "expo-router";
import { Platform, View, useWindowDimensions } from "react-native";
import { useAuthStore } from "@/store/useAuthStore";
import { CustomTabBar } from "@/components/ui/CustomTabBar";
import { DesktopSidebar } from "@/components/ui/DesktopSidebar";
import { WelcomeIntro } from "@/components/ui/WelcomeIntro";

export default function TabsLayout() {
  const { profile } = useAuthStore();
  const { width } = useWindowDimensions();
  const isArtist = profile?.role === "artist";
  const isDesktopWeb = Platform.OS === "web" && width >= 700;

  return (
    <View style={{ flex: 1, flexDirection: isDesktopWeb ? "row" : "column", backgroundColor: isDesktopWeb ? "#0D0D0F" : "#F5F3EE" }}>
      {isDesktopWeb && <DesktopSidebar isArtist={isArtist} />}
      <View style={{ flex: 1 }}>
        <Tabs
          tabBar={(props) => isDesktopWeb ? null : <CustomTabBar {...props} isArtist={isArtist} />}
          screenOptions={{ headerShown: false }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="search" />
          <Tabs.Screen name="board" />
          <Tabs.Screen name="messages" />
          <Tabs.Screen name="profile" />
          <Tabs.Screen name="publish" />
        </Tabs>
      </View>
      <WelcomeIntro />
    </View>
  );
}
