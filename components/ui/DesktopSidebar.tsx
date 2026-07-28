import { View, Text, Pressable, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useAuthStore } from "@/store/useAuthStore";
import { CLIENT_TABS, ARTIST_TABS } from "@/lib/tabs";

export function DesktopSidebar({ isArtist }: { isArtist: boolean }) {
  const { width } = useWindowDimensions();
  const { session } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const compact = width < 1080;
  const tabs = isArtist ? ARTIST_TABS : CLIENT_TABS;

  return (
    <View
      style={{
        width: compact ? 88 : 238,
        height: "100%",
        flexShrink: 0,
        borderRightWidth: 1,
        borderRightColor: "rgba(255,255,255,0.08)",
        backgroundColor: "#0A0A0C",
        paddingHorizontal: compact ? 14 : 22,
        paddingVertical: 24,
      }}
    >
      <Text
        style={{
          color: "#C9A24B",
          fontSize: compact ? 19 : 24,
          fontWeight: "900",
          letterSpacing: compact ? 3 : 7,
          textAlign: compact ? "center" : "left",
          marginBottom: 34,
        }}
      >
        INK
      </Text>

      <View style={{ gap: 10 }}>
        {tabs.map((tab) => {
          const selected = tab.route === "/" ? pathname === "/" : pathname.startsWith(tab.route);
          return (
            <Pressable
              key={tab.route}
              onPress={() => {
                if (!selected) router.replace(`/(tabs)${tab.route === "/" ? "" : tab.route}` as any);
              }}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              style={{
                height: 50,
                borderRadius: 15,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: compact ? "center" : "flex-start",
                paddingHorizontal: compact ? 0 : 14,
                gap: 13,
                backgroundColor: selected ? "rgba(201,162,75,0.16)" : "transparent",
              }}
            >
              <Ionicons name={(selected ? tab.iconActive : tab.icon) as any} size={23} color={selected ? "#D5AE52" : "rgba(244,241,234,0.62)"} />
              {!compact && (
                <Text style={{ color: selected ? "#F4F1EA" : "rgba(244,241,234,0.62)", fontSize: 15, fontWeight: selected ? "800" : "600" }}>
                  {tab.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />
      <Pressable
        onPress={() => router.push(session ? "/(tabs)/profile" : "/(auth)/sign-in")}
        accessibilityRole="button"
        accessibilityLabel={session ? "Ouvrir mon profil" : "Se connecter"}
        style={{ height: 48, borderRadius: 14, backgroundColor: "#C9A24B", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9 }}
      >
        <Ionicons name={session ? "person" : "log-in-outline"} size={19} color="#0A0A0B" />
        {!compact && (
          <Text style={{ color: "#0A0A0B", fontWeight: "800", fontSize: 14 }}>{session ? "Mon profil" : "Se connecter"}</Text>
        )}
      </Pressable>
    </View>
  );
}
