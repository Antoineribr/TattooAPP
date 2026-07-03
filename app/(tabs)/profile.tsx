import { View, Text, TouchableOpacity, ScrollView, Alert, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar } from "@/components/ui/Avatar";
import { Image } from "expo-image";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";

const GOLD = "#B8903E";
const BG = "#F5F3EE";
const ADMIN_EMAIL = "antoine.ribeiro02@gmail.com";

// ─── PROFIL CLIENT ──────────────────────────────────────────────────────────
function ClientProfile() {
  const { session, profile, clear } = useAuthStore();
  const router = useRouter();
  const [followedArtists, setFollowedArtists] = useState<any[]>([]);
  const [projectCount, setProjectCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const uid = session.user.id;
    const [{ data: follows }, { count: pc }, { count: sc }] = await Promise.all([
      supabase.from("follows").select("artist_id, profiles!follows_artist_id_fkey(id, display_name, avatar_url, city, style_tags)").eq("follower_id", uid).limit(10),
      supabase.from("project_requests").select("id", { count: "exact", head: true }).eq("client_id", uid),
      supabase.from("saves").select("id", { count: "exact", head: true }).eq("user_id", uid),
    ]);
    setFollowedArtists((follows ?? []).map((f: any) => f.profiles).filter(Boolean));
    setProjectCount(pc ?? 0);
    setSavedCount(sc ?? 0);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleLogout() {
    Alert.alert("Déconnexion", "Tu veux vraiment te déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnexion", style: "destructive", onPress: async () => { await supabase.auth.signOut(); clear(); } },
    ]);
  }

  const styles = profile?.style_tags ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={GOLD} />}>
      {/* Hero client */}
      <View style={{ backgroundColor: "#FFF", paddingTop: 64, paddingBottom: 24, paddingHorizontal: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Avatar uri={profile?.avatar_url} name={profile?.display_name ?? ""} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#1A1A1A", fontSize: 22, fontWeight: "800" }}>{profile?.display_name}</Text>
            <Text style={{ color: "#6B6B7A", fontSize: 14 }}>@{profile?.username}</Text>
            {profile?.city && <Text style={{ color: "#9A9AA5", fontSize: 13, marginTop: 2 }}>📍 {profile.city}</Text>}
          </View>
          <TouchableOpacity onPress={() => router.push("/edit/profile" as any)} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="pencil-outline" size={18} color="#6B6B7A" />
          </TouchableOpacity>
        </View>

        {/* Stats rapides */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(184,144,62,0.08)", borderRadius: 14, padding: 14, alignItems: "center" }}>
            <Text style={{ color: GOLD, fontSize: 22, fontWeight: "800" }}>{projectCount}</Text>
            <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 2 }}>Projets</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.04)", borderRadius: 14, padding: 14, alignItems: "center" }}>
            <Text style={{ color: "#1A1A1A", fontSize: 22, fontWeight: "800" }}>{savedCount}</Text>
            <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 2 }}>Sauvegardés</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.04)", borderRadius: 14, padding: 14, alignItems: "center" }}>
            <Text style={{ color: "#1A1A1A", fontSize: 22, fontWeight: "800" }}>{followedArtists.length}</Text>
            <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 2 }}>Artistes</Text>
          </View>
        </View>

        {/* Styles préférés */}
        {styles.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
            {styles.map((s: string) => (
              <View key={s} style={{ backgroundColor: "rgba(184,144,62,0.1)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: GOLD, fontSize: 12, fontWeight: "600" }}>{s}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Artistes suivis */}
      {followedArtists.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 14 }}>
            <Text style={{ color: "#1A1A1A", fontSize: 17, fontWeight: "800" }}>Mes tatoueurs</Text>
            <Text style={{ color: GOLD, fontSize: 13, fontWeight: "600" }}>{followedArtists.length}</Text>
          </View>
          <FlatList
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            data={followedArtists}
            keyExtractor={(a) => a.id}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => router.push(`/profile/${item.id}` as any)} style={{ alignItems: "center", width: 80 }}>
                <Avatar uri={item.avatar_url} name={item.display_name} size={56} />
                <Text style={{ color: "#1A1A1A", fontSize: 12, fontWeight: "600", marginTop: 6, textAlign: "center" }} numberOfLines={1}>{item.display_name}</Text>
                {item.city && <Text style={{ color: "#9A9AA5", fontSize: 10, textAlign: "center" }} numberOfLines={1}>{item.city}</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Raccourcis */}
      <View style={{ margin: 20, backgroundColor: "#FFF", borderRadius: 20, overflow: "hidden", borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)" }}>
        {[
          { icon: "bookmark-outline", label: "Mes boards", sub: "Inspirations sauvegardées", route: "/(tabs)/board" },
          { icon: "chatbubble-outline", label: "Mes projets", sub: "Conversations et statuts", route: "/(tabs)/messages" },
          { icon: "notifications-outline", label: "Notifications", sub: "Activité sur mon compte", route: "/notifications" },
        ].map((item, i) => (
          <TouchableOpacity key={item.route} onPress={() => router.push(item.route as any)} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16, borderTopWidth: i === 0 ? 0 : 0.5, borderTopColor: "rgba(0,0,0,0.06)" }}>
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(184,144,62,0.1)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={item.icon as any} size={19} color={GOLD} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#1A1A1A", fontWeight: "600", fontSize: 15 }}>{item.label}</Text>
              <Text style={{ color: "#9A9AA5", fontSize: 12 }}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#C0C0C8" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Compte */}
      <View style={{ marginHorizontal: 20, backgroundColor: "#FFF", borderRadius: 20, overflow: "hidden", borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)", marginBottom: 100 }}>
        <TouchableOpacity onPress={() => router.push("/edit/profile" as any)} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: "rgba(0,0,0,0.06)" }}>
          <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="person-outline" size={19} color="#6B6B7A" />
          </View>
          <Text style={{ flex: 1, color: "#1A1A1A", fontWeight: "600", fontSize: 15 }}>Modifier le profil</Text>
          <Ionicons name="chevron-forward" size={16} color="#C0C0C8" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16 }}>
          <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(217,53,53,0.08)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="log-out-outline" size={19} color="#D93535" />
          </View>
          <Text style={{ flex: 1, color: "#D93535", fontWeight: "600", fontSize: 15 }}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── PROFIL ARTISTE ─────────────────────────────────────────────────────────
function ArtistProfile() {
  const { session, profile, clear, setProfile } = useAuthStore();
  const router = useRouter();
  const isAdmin = session?.user?.email === ADMIN_EMAIL;
  const [postCount, setPostCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const uid = session.user.id;
    const [{ count: pc }, { count: fc }, { count: prc }, { data: posts }] = await Promise.all([
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("artist_id", uid),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("artist_id", uid),
      supabase.from("project_requests").select("id", { count: "exact", head: true }).eq("artist_id", uid).eq("status", "new"),
      supabase.from("posts").select("id, thumbnail_url, likes_count, saves_count").eq("artist_id", uid).order("created_at", { ascending: false }).limit(6),
    ]);
    setPostCount(pc ?? 0);
    setFollowerCount(fc ?? 0);
    setPendingCount(prc ?? 0);
    setRecentPosts(posts ?? []);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleLogout() {
    Alert.alert("Déconnexion", "", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnexion", style: "destructive", onPress: async () => { await supabase.auth.signOut(); clear(); } },
    ]);
  }

  async function toggleAccepts() {
    const next = !profile?.accepts_projects;
    await supabase.from("profiles").update({ accepts_projects: next }).eq("id", session!.user.id);
    setProfile({ ...profile!, accepts_projects: next });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={GOLD} />}>
      {/* Hero artiste */}
      <View style={{ backgroundColor: "#1A1A1A", paddingTop: 64, paddingBottom: 28, paddingHorizontal: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
          <Avatar uri={profile?.avatar_url} name={profile?.display_name ?? ""} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#F5F3EE", fontSize: 22, fontWeight: "800" }}>{profile?.display_name}</Text>
            <Text style={{ color: "rgba(245,243,238,0.5)", fontSize: 14 }}>@{profile?.username}</Text>
            {profile?.city && <Text style={{ color: "rgba(245,243,238,0.5)", fontSize: 13, marginTop: 2 }}>📍 {profile.city}</Text>}
          </View>
          <View style={{ gap: 8 }}>
            <TouchableOpacity onPress={() => router.push("/edit/profile" as any)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="pencil-outline" size={17} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push(`/profile/${session!.user.id}` as any)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="eye-outline" size={17} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Statut disponibilité */}
        <TouchableOpacity onPress={toggleAccepts} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20, backgroundColor: profile?.accepts_projects ? "rgba(46,139,87,0.2)" : "rgba(217,53,53,0.15)", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: profile?.accepts_projects ? "rgba(46,139,87,0.3)" : "rgba(217,53,53,0.25)" }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: profile?.accepts_projects ? "#2E8B57" : "#D93535" }} />
          <Text style={{ color: profile?.accepts_projects ? "#5CB87A" : "#E87070", fontWeight: "700", fontSize: 14, flex: 1 }}>
            {profile?.accepts_projects ? "Ouvert aux projets" : "Fermé aux projets"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Modifier →</Text>
        </TouchableOpacity>

        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          {[
            { label: "Publications", value: postCount },
            { label: "Abonnés", value: followerCount },
            { label: "Demandes", value: pendingCount, gold: true },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14, padding: 12, alignItems: "center" }}>
              <Text style={{ color: s.gold ? GOLD : "#F5F3EE", fontSize: 22, fontWeight: "800" }}>{s.value}</Text>
              <Text style={{ color: "rgba(245,243,238,0.4)", fontSize: 11, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Nouvelles demandes — bandeau urgent */}
      {pendingCount > 0 && (
        <TouchableOpacity onPress={() => router.push("/(tabs)/messages" as any)} style={{ margin: 16, borderRadius: 16, backgroundColor: "rgba(184,144,62,0.1)", borderWidth: 1, borderColor: "rgba(184,144,62,0.25)", padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "800" }}>{pendingCount}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#1A1A1A", fontWeight: "800", fontSize: 15 }}>Nouvelle{pendingCount > 1 ? "s" : ""} demande{pendingCount > 1 ? "s" : ""}</Text>
            <Text style={{ color: "#6B6B7A", fontSize: 13 }}>Client{pendingCount > 1 ? "s" : ""} en attente de ta réponse</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={GOLD} />
        </TouchableOpacity>
      )}

      {/* Publications récentes */}
      {recentPosts.length > 0 && (
        <View style={{ marginHorizontal: 16, marginTop: pendingCount > 0 ? 0 : 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ color: "#1A1A1A", fontSize: 17, fontWeight: "800" }}>Publications récentes</Text>
            <TouchableOpacity onPress={() => router.push(`/profile/${session?.user.id}` as any)}>
              <Text style={{ color: GOLD, fontSize: 13, fontWeight: "600" }}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3 }}>
            {recentPosts.map((p) => (
              <TouchableOpacity key={p.id} onPress={() => router.push(`/post/${p.id}` as any)} style={{ width: "32%", aspectRatio: 1 }}>
                <Image source={{ uri: p.thumbnail_url }} style={{ flex: 1, borderRadius: 10 }} contentFit="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Actions pro */}
      <View style={{ margin: 16, backgroundColor: "#FFF", borderRadius: 20, overflow: "hidden", borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)" }}>
        {[
          { icon: "bar-chart-outline", label: "Statistiques", sub: "Vues, abonnés, projets", route: "/stats", gold: true },
          { icon: "calendar-outline", label: "Configurer mon profil", sub: "Bio, tarifs, disponibilité", route: "/edit/profile" },
          { icon: "notifications-outline", label: "Notifications", sub: "Activité et demandes", route: "/notifications" },
        ].map((item, i) => (
          <TouchableOpacity key={item.route} onPress={() => router.push(item.route as any)} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16, borderTopWidth: i === 0 ? 0 : 0.5, borderTopColor: "rgba(0,0,0,0.06)" }}>
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: item.gold ? "rgba(184,144,62,0.12)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={item.icon as any} size={19} color={item.gold ? GOLD : "#6B6B7A"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#1A1A1A", fontWeight: "600", fontSize: 15 }}>{item.label}</Text>
              <Text style={{ color: "#9A9AA5", fontSize: 12 }}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#C0C0C8" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Admin + Déco */}
      <View style={{ marginHorizontal: 16, backgroundColor: "#FFF", borderRadius: 20, overflow: "hidden", borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)", marginBottom: 100 }}>
        {isAdmin && (
          <TouchableOpacity onPress={() => router.push("/admin" as any)} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: "rgba(0,0,0,0.06)" }}>
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(184,144,62,0.12)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="shield-checkmark-outline" size={19} color={GOLD} />
            </View>
            <Text style={{ flex: 1, color: "#1A1A1A", fontWeight: "600", fontSize: 15 }}>Administration</Text>
            <Ionicons name="chevron-forward" size={16} color="#C0C0C8" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleLogout} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16 }}>
          <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(217,53,53,0.08)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="log-out-outline" size={19} color="#D93535" />
          </View>
          <Text style={{ flex: 1, color: "#D93535", fontWeight: "600", fontSize: 15 }}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── NON CONNECTÉ ────────────────────────────────────────────────────────────
function GuestProfile() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ paddingTop: 64, paddingHorizontal: 24, paddingBottom: 24 }}>
        <Text style={{ color: GOLD, fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>Bienvenue</Text>
        <Text style={{ color: "#1A1A1A", fontSize: 26, fontWeight: "800", marginTop: 4 }}>Mon compte</Text>
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(184,144,62,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1.5, borderColor: "rgba(184,144,62,0.2)" }}>
          <Ionicons name="person-outline" size={36} color={GOLD} />
        </View>
        <Text style={{ color: "#1A1A1A", fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 10 }}>Rejoins INK</Text>
        <Text style={{ color: "#6B6B7A", fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 32 }}>
          Crée un compte pour sauvegarder tes inspirations, suivre des artistes et lancer tes projets.
        </Text>
        <TouchableOpacity onPress={() => router.push("/(auth)/sign-up" as any)} style={{ backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, width: "100%", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 16 }}>Créer un compte</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/(auth)/sign-in" as any)} style={{ paddingVertical: 14, width: "100%", alignItems: "center" }}>
          <Text style={{ color: "#6B6B7A", fontSize: 15 }}>Déjà un compte ? <Text style={{ color: GOLD, fontWeight: "700" }}>Se connecter</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────
export default function MyProfileScreen() {
  const { session, profile } = useAuthStore();
  if (!session || !profile) return <GuestProfile />;
  return profile.role === "artist" ? <ArtistProfile /> : <ClientProfile />;
}
