import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, SectionList,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/ui/Avatar";
import { StatusChip } from "@/components/ui/StatusChip";
import { ProjectStatus } from "@/types/database";

const GOLD = "#B8903E";
const BG = "#F5F3EE";

interface ConvRow {
  id: string;
  other_id: string;
  other_name: string;
  other_avatar: string | null;
  other_role: string;
  last_body: string | null;
  last_at: string | null;
  project_status: ProjectStatus | null;
  project_thumb: string | null;
  project_style: string | null;
  unread: boolean;
}

function fmtTime(ts: string | null) {
  if (!ts) return "";
  const d = new Date(ts), now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diff === 1) return "Hier";
  if (diff < 7) return d.toLocaleDateString("fr-FR", { weekday: "short" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ─── CARD ARTISTE (vue client) ─────────────────────────────────────────────
// Met l'image du tatouage en avant, status bien visible
function ProjectCard({ item, onPress }: { item: ConvRow; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 18, overflow: "hidden", backgroundColor: "#FFF", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.06)" }}>
      <View style={{ flexDirection: "row" }}>
        {/* Image tatouage de référence */}
        {item.project_thumb ? (
          <Image source={{ uri: item.project_thumb }} style={{ width: 90, height: 90 }} contentFit="cover" />
        ) : (
          <View style={{ width: 90, height: 90, backgroundColor: "rgba(184,144,62,0.08)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="color-palette-outline" size={26} color="rgba(184,144,62,0.4)" />
          </View>
        )}
        <View style={{ flex: 1, padding: 14, justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Avatar uri={item.other_avatar} name={item.other_name} size={26} />
              <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 14 }} numberOfLines={1}>{item.other_name}</Text>
            </View>
            {item.unread && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GOLD }} />}
          </View>
          {item.project_status && <StatusChip status={item.project_status} small />}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: "#6B6B7A", fontSize: 12 }} numberOfLines={1}>{item.last_body ?? "Nouvelle conversation"}</Text>
            <Text style={{ color: "#9A9AA5", fontSize: 11 }}>{fmtTime(item.last_at)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── ROW SIMPLE (vue artiste) ─────────────────────────────────────────────
function ConvRow({ item, onPress }: { item: ConvRow; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: item.unread ? "rgba(184,144,62,0.04)" : "transparent", borderBottomWidth: 0.5, borderBottomColor: "rgba(0,0,0,0.06)" }}>
      <View style={{ position: "relative" }}>
        <Avatar uri={item.other_avatar} name={item.other_name} size={50} />
        {item.unread && <View style={{ position: "absolute", top: 1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: GOLD, borderWidth: 2, borderColor: BG }} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <Text style={{ color: "#1A1A1A", fontWeight: item.unread ? "800" : "600", fontSize: 15 }} numberOfLines={1}>{item.other_name}</Text>
          {item.project_status && <StatusChip status={item.project_status} small />}
        </View>
        <Text style={{ color: "#6B6B7A", fontSize: 13 }} numberOfLines={1}>{item.last_body ?? "—"}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Text style={{ color: "#9A9AA5", fontSize: 11 }}>{fmtTime(item.last_at)}</Text>
        {item.project_thumb && <Image source={{ uri: item.project_thumb }} style={{ width: 34, height: 34, borderRadius: 6 }} contentFit="cover" />}
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const { session, profile } = useAuthStore();
  const router = useRouter();
  const isArtist = profile?.role === "artist";
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const uid = session.user.id;
    const { data } = await supabase
      .from("conversations")
      .select(`id, client_id, artist_id, last_message_at,
        client:profiles!conversations_client_id_fkey(id,display_name,avatar_url,role),
        artist:profiles!conversations_artist_id_fkey(id,display_name,avatar_url,role),
        project_request:project_requests(status, post:posts_with_counts(thumbnail_url,style_tags))`)
      .or(`client_id.eq.${uid},artist_id.eq.${uid}`)
      .order("last_message_at", { ascending: false });

    if (!data) { setLoading(false); setRefreshing(false); return; }

    const ids = (data as any[]).map((c) => c.id);
    const { data: lastMsgs } = await supabase
      .from("messages").select("conversation_id, body, created_at, sender_id, read_at")
      .in("conversation_id", ids).order("created_at", { ascending: false });

    const lastMap: Record<string, any> = {};
    (lastMsgs ?? []).forEach((m: any) => { if (!lastMap[m.conversation_id]) lastMap[m.conversation_id] = m; });

    setConvs((data as any[]).map((c) => {
      const isClient = c.client_id === uid;
      const other = isClient ? c.artist : c.client;
      const last = lastMap[c.id];
      const req = c.project_request;
      return {
        id: c.id, other_id: other?.id, other_name: other?.display_name ?? "?",
        other_avatar: other?.avatar_url ?? null, other_role: other?.role ?? "client",
        last_body: last?.body ?? null, last_at: last?.created_at ?? null,
        project_status: req?.status ?? null, project_thumb: req?.post?.thumbnail_url ?? null,
        project_style: req?.post?.style_tags?.[0] ?? null,
        unread: last && last.sender_id !== uid && !last.read_at,
      };
    }));
    setLoading(false); setRefreshing(false);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    if (!session) return;
    const channelName = `msgs_tab_${Date.now()}`;
    const sub = supabase.channel(channelName).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, load).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [session]);

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 24 }}>
          <Text style={{ color: "#1A1A1A", fontSize: 24, fontWeight: "800" }}>Messages</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Ionicons name="chatbubbles-outline" size={52} color="rgba(0,0,0,0.1)" />
          <Text style={{ color: "#1A1A1A", fontSize: 18, fontWeight: "700", marginTop: 16, textAlign: "center" }}>Connecte-toi</Text>
          <Text style={{ color: "#6B6B7A", fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 }}>Pour contacter des tatoueurs et suivre tes projets.</Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")} style={{ marginTop: 20, backgroundColor: GOLD, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13 }}>
            <Text style={{ color: "#FFF", fontWeight: "700" }}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── VUE CLIENT ──────────────────────────────────────────────────────────────
  if (!isArtist) {
    const pending = convs.filter((c) => c.project_status && !["done", "archived"].includes(c.project_status));
    const done = convs.filter((c) => c.project_status && ["done", "archived"].includes(c.project_status));
    const other = convs.filter((c) => !c.project_status);

    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 8 }}>
          <Text style={{ color: GOLD, fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>Espace client</Text>
          <Text style={{ color: "#1A1A1A", fontSize: 26, fontWeight: "800", marginTop: 4 }}>Mes projets</Text>
          {convs.length > 0 && <Text style={{ color: "#6B6B7A", fontSize: 13, marginTop: 2 }}>{convs.filter(c => c.unread).length > 0 ? `${convs.filter(c => c.unread).length} non lu${convs.filter(c => c.unread).length > 1 ? "s" : ""}` : `${convs.length} conversation${convs.length > 1 ? "s" : ""}`}</Text>}
        </View>

        {loading ? (
          <View style={{ padding: 16, gap: 12 }}>
            {[0,1,2].map(i => <SkeletonCard key={i} />)}
          </View>
        ) : !convs.length ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(184,144,62,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Ionicons name="color-palette-outline" size={36} color="rgba(184,144,62,0.4)" />
            </View>
            <Text style={{ color: "#1A1A1A", fontSize: 18, fontWeight: "700", textAlign: "center" }}>Aucun projet en cours</Text>
            <Text style={{ color: "#6B6B7A", fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 }}>
              Trouve un tatoueur qui te correspond et lance ta première demande de projet.
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(tabs)" as any)} style={{ marginTop: 24, backgroundColor: GOLD, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="search-outline" size={16} color="#FFF" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 15 }}>Explorer les tatoueurs</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={[]}
            keyExtractor={() => ""}
            ListHeaderComponent={() => (
              <>
                {pending.length > 0 && (
                  <View style={{ paddingTop: 16 }}>
                    <Text style={{ color: "#1A1A1A", fontSize: 13, fontWeight: "700", paddingHorizontal: 20, marginBottom: 12, letterSpacing: 0.3 }}>EN COURS · {pending.length}</Text>
                    {pending.map(item => <ProjectCard key={item.id} item={item} onPress={() => router.push(`/chat/${item.id}` as any)} />)}
                  </View>
                )}
                {other.length > 0 && (
                  <View style={{ paddingTop: 8 }}>
                    <Text style={{ color: "#1A1A1A", fontSize: 13, fontWeight: "700", paddingHorizontal: 20, marginBottom: 12, letterSpacing: 0.3 }}>CONVERSATIONS</Text>
                    {other.map(item => <ProjectCard key={item.id} item={item} onPress={() => router.push(`/chat/${item.id}` as any)} />)}
                  </View>
                )}
                {done.length > 0 && (
                  <View style={{ paddingTop: 8 }}>
                    <Text style={{ color: "#9A9AA5", fontSize: 13, fontWeight: "700", paddingHorizontal: 20, marginBottom: 12, letterSpacing: 0.3 }}>TERMINÉS · {done.length}</Text>
                    {done.map(item => <ProjectCard key={item.id} item={item} onPress={() => router.push(`/chat/${item.id}` as any)} />)}
                  </View>
                )}
                <View style={{ height: 100 }} />
              </>
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GOLD} />}
            renderItem={() => null}
          />
        )}
      </View>
    );
  }

  // ── VUE ARTISTE ─────────────────────────────────────────────────────────────
  const newRequests = convs.filter((c) => c.project_status === "new");
  const active = convs.filter((c) => c.project_status && c.project_status !== "new" && !["done", "archived"].includes(c.project_status));
  const archived = convs.filter((c) => !c.project_status || ["done", "archived"].includes(c.project_status));
  const unreadCount = convs.filter(c => c.unread).length;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header artiste */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ color: GOLD, fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>Espace pro</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
          <Text style={{ color: "#1A1A1A", fontSize: 26, fontWeight: "800" }}>Boîte de réception</Text>
          {unreadCount > 0 && (
            <View style={{ backgroundColor: GOLD, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "800" }}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 16, gap: 10 }}>
          {[0,1,2].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : !convs.length ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(184,144,62,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Ionicons name="mail-outline" size={36} color="rgba(184,144,62,0.35)" />
          </View>
          <Text style={{ color: "#1A1A1A", fontSize: 18, fontWeight: "700", textAlign: "center" }}>Aucun message reçu</Text>
          <Text style={{ color: "#6B6B7A", fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 }}>
            Tes clients te contacteront ici depuis ton profil ou le feed. Assure-toi que ton profil est complet.
          </Text>
          <TouchableOpacity onPress={() => router.push("/edit/profile" as any)} style={{ marginTop: 24, borderWidth: 1.5, borderColor: GOLD, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13 }}>
            <Text style={{ color: GOLD, fontWeight: "700" }}>Compléter mon profil</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[]}
          keyExtractor={() => ""}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GOLD} />}
          ListHeaderComponent={() => (
            <>
              {/* Nouvelles demandes — bandeau doré */}
              {newRequests.length > 0 && (
                <View style={{ margin: 16, borderRadius: 18, overflow: "hidden", backgroundColor: "rgba(184,144,62,0.08)", borderWidth: 1, borderColor: "rgba(184,144,62,0.2)" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
                    <View style={{ backgroundColor: GOLD, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800" }}>{newRequests.length} NOUVEAU{newRequests.length > 1 ? "X" : ""}</Text>
                    </View>
                    <Text style={{ color: "#B8903E", fontWeight: "600", fontSize: 13 }}>Demandes de projet</Text>
                  </View>
                  {newRequests.map((item, i) => (
                    <View key={item.id} style={i > 0 ? { borderTopWidth: 0.5, borderTopColor: "rgba(184,144,62,0.15)" } : undefined}>
                      <ConvRow item={item} onPress={() => router.push(`/chat/${item.id}` as any)} />
                    </View>
                  ))}
                </View>
              )}

              {/* En cours */}
              {active.length > 0 && (
                <View>
                  <Text style={{ color: "#1A1A1A", fontSize: 12, fontWeight: "700", letterSpacing: 1, paddingHorizontal: 20, paddingVertical: 10 }}>EN COURS · {active.length}</Text>
                  {active.map(item => <ConvRow key={item.id} item={item} onPress={() => router.push(`/chat/${item.id}` as any)} />)}
                </View>
              )}

              {/* Archivés */}
              {archived.length > 0 && (
                <View>
                  <Text style={{ color: "#9A9AA5", fontSize: 12, fontWeight: "700", letterSpacing: 1, paddingHorizontal: 20, paddingVertical: 10 }}>ARCHIVÉS · {archived.length}</Text>
                  {archived.map(item => <ConvRow key={item.id} item={item} onPress={() => router.push(`/chat/${item.id}` as any)} />)}
                </View>
              )}
              <View style={{ height: 100 }} />
            </>
          )}
          renderItem={() => null}
        />
      )}
    </View>
  );
}
