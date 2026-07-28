import { View, Text, TouchableOpacity, Platform } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTabBarStore } from "@/store/useTabBarStore";
import { CLIENT_TABS, ARTIST_TABS } from "@/lib/tabs";

const GOLD = "#C9A24B";
const OFF = "rgba(0,0,0,0.28)";
const GOLD_FEED = "#C9A24B";
const OFF_FEED = "rgba(255,255,255,0.55)";
const TAB_H = Platform.OS === "ios" ? 78 : 58;
const PB = Platform.OS === "ios" ? 24 : 8;

export function CustomTabBar({ state, navigation, isArtist }: BottomTabBarProps & { isArtist: boolean }) {
  const onFeed = state.routes[state.index]?.name === "index";

  const tabs = isArtist ? ARTIST_TABS : CLIENT_TABS;
  const currentRouteName = state.routes[state.index]?.name;

  return (
    <View nativeID="ink-tabbar" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: TAB_H }}>
      <BlurView intensity={onFeed ? 30 : 95} tint={onFeed ? "dark" : "extraLight"} style={{ flex: 1, borderTopWidth: onFeed ? 0 : 0.5, borderTopColor: "rgba(0,0,0,0.09)" }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingBottom: PB, paddingHorizontal: 4 }}>
          {tabs.map((tab) => {
            const routeName = tab.route === "/" ? "index" : tab.route.slice(1);
            const focused = currentRouteName === routeName;
            const route = state.routes.find((r) => r.name === routeName);
            if (!route) return null;

            function onPress() {
              const event = navigation.emit({ type: "tabPress", target: route!.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route!.name);
            }

            if (tab.isPlus) {
              return (
                <TouchableOpacity
                  key={routeName}
                  onPress={onPress}
                  accessibilityRole="button"
                  accessibilityLabel={tab.label}
                  style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                  activeOpacity={0.8}
                >
                  <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: GOLD, alignItems: "center", justifyContent: "center", shadowColor: GOLD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 8 }}>
                    <Ionicons name="add" size={28} color="#FFF" />
                  </View>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={routeName}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: focused }}
                style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingTop: 8, minHeight: 44 }}
                activeOpacity={0.7}
              >
                <Ionicons name={(focused ? tab.iconActive : tab.icon) as any} size={22} color={focused ? (onFeed ? GOLD_FEED : GOLD) : (onFeed ? OFF_FEED : OFF)} />
                <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: focused ? "700" : "400", color: focused ? GOLD : OFF }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
