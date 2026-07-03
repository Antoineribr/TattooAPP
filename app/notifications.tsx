import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar } from "@/components/ui/Avatar";

type Notif = {
  id: string;
  type: "like" | "follow" | "save" | "project_request" | "project_status" | "message";
  actor_id: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: { display_name: string; avatar_url: string | null };
};

const NOTIF_ICON: Record<string, { name: any; color: string }> = {
  like: { name: "heart", color: "#FF4466" },
  follow: { name: "person-add", color: "#B8903E" },
  save: { name: "bookmark", color: "#B8903E" },
  project_request: { name: "color-palette", color: "#B8903E" },
  project_status: { name: "refresh-circle", color: "#4488FF" },
  message: { name: "chatbubble", color: "#44CC88" },
};

const NOTIF_TEXT: Record<string, string> = {
  like: "a aimé ta publication",
  follow: "a commencé à te suivre",
  save: "a enregistré ta publication",
  project_request: "t'a envoyé une demande de projet",
  project_status: "a mis à jour le statut de ton projet",
  message: "t'a envoyé un message",
};

export default function NotificationsScreen() {
  const { session } = useAuthStore();
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("notifications")
      .select("*, actor:actor_id(display_name, avatar_url)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifs((data as any[]) ?? []);
    // Marquer tout comme lu
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", session.user.id).eq("is_read", false);
  }, [session]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function handlePress(n: Notif) {
    if (n.type === "follow") router.push(`/profile/${n.actor_id}`);
    else if (n.type === "project_request" || n.type === "message") router.push("/(tabs)/messages");
    else if (n.reference_id) router.push(`/post/${n.reference_id}`);
  }

  function timeAgo(date: string) {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
    return `${Math.floor(diff / 86400)} j`;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE" }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={{ color: "#1A1A1A", fontSize: 22, fontWeight: "800" }}>Notifications</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#B8903E" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B8903E" />}
        >
          {notifs.length === 0 && (
            <View style={{ alignItems: "center", paddingTop: 80 }}>
              <Ionicons name="notifications-outline" size={52} color="rgba(0,0,0,0.1)" />
              <Text style={{ color: "#1A1A1A", fontSize: 17, fontWeight: "700", marginTop: 16 }}>Aucune notification</Text>
              <Text style={{ color: "#6B6B7A", fontSize: 14, marginTop: 6, textAlign: "center", paddingHorizontal: 40 }}>
                Les likes, abonnements et messages apparaîtront ici.
              </Text>
            </View>
          )}
          {notifs.map((n) => {
            const ico = NOTIF_ICON[n.type] ?? { name: "notifications", color: "#6B6B7A" };
            return (
              <TouchableOpacity
                key={n.id}
                onPress={() => handlePress(n)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 14,
                  paddingHorizontal: 20, paddingVertical: 14,
                  borderBottomWidth: 1, borderBottomColor: "#EDE9E1",
                  backgroundColor: n.is_read ? "transparent" : "rgba(201,162,75,0.05)",
                }}
              >
                {/* Avatar + icône */}
                <View style={{ position: "relative" }}>
                  <Avatar uri={(n.actor as any)?.avatar_url} name={(n.actor as any)?.display_name ?? "?"} size={46} />
                  <View style={{ position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: ico.color, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#F5F3EE" }}>
                    <Ionicons name={ico.name} size={10} color="#fff" />
                  </View>
                </View>
                {/* Texte */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 20 }}>
                    <Text style={{ fontWeight: "700" }}>{(n.actor as any)?.display_name ?? "Quelqu'un"}</Text>
                    {" "}{NOTIF_TEXT[n.type] ?? "a fait une action"}
                  </Text>
                  <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 2 }}>{timeAgo(n.created_at)}</Text>
                </View>
                {!n.is_read && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#B8903E" }} />
                )}
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </View>
  );
}
