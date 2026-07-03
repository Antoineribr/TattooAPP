import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, TextInput, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

const ADMIN_EMAILS = ["antoine.ribeiro02@gmail.com"];
const GOLD = "#B8903E";

type UserRow = {
  id: string;
  display_name: string;
  username: string;
  role: "client" | "artist" | null;
  city: string | null;
  avatar_url: string | null;
  accepts_projects: boolean | null;
  created_at: string;
};

type Stats = {
  total_users: number;
  total_artists: number;
  total_clients: number;
  total_posts: number;
  total_conversations: number;
  total_project_requests: number;
};

export default function AdminScreen() {
  const { session } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<"stats" | "artists" | "clients" | "reports">("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email ?? "");

  const load = useCallback(async () => {
    if (!isAdmin) return;
    const [
      { count: cu }, { count: ca }, { count: cc },
      { count: cp }, { count: cv }, { count: cpr },
      { data: profilesData },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "artist"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client"),
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase.from("conversations").select("*", { count: "exact", head: true }),
      supabase.from("project_requests").select("*", { count: "exact", head: true }),
      supabase.from("profiles")
        .select("id, display_name, username, role, city, avatar_url, accepts_projects, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setStats({ total_users: cu ?? 0, total_artists: ca ?? 0, total_clients: cc ?? 0, total_posts: cp ?? 0, total_conversations: cv ?? 0, total_project_requests: cpr ?? 0 });
    setUsers((profilesData as UserRow[]) ?? []);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function toggleRole(user: UserRow) {
    const newRole = user.role === "artist" ? "client" : "artist";
    Alert.alert("Changer le rôle", `Passer ${user.display_name} en ${newRole === "artist" ? "Tatoueur·se" : "Client·e"} ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Confirmer", onPress: async () => {
        await supabase.from("profiles").update({ role: newRole }).eq("id", user.id);
        setUsers((p) => p.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
      }},
    ]);
  }

  async function toggleProjects(user: UserRow) {
    const next = !user.accepts_projects;
    await supabase.from("profiles").update({ accepts_projects: next }).eq("id", user.id);
    setUsers((p) => p.map((u) => u.id === user.id ? { ...u, accepts_projects: next } : u));
  }

  async function deleteUser(user: UserRow) {
    Alert.alert("Supprimer", `Supprimer définitivement ${user.display_name} ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        await supabase.from("profiles").delete().eq("id", user.id);
        setUsers((p) => p.filter((u) => u.id !== user.id));
      }},
    ]);
  }

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F3EE", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Ionicons name="lock-closed" size={52} color="rgba(0,0,0,0.15)" />
        <Text style={{ color: "#1A1A1A", fontSize: 20, fontWeight: "800", marginTop: 20 }}>Accès restreint</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 24, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filtered = users.filter((u) =>
    !search || u.display_name?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase())
  );
  const list = tab === "artists" ? filtered.filter((u) => u.role === "artist") : tab === "clients" ? filtered.filter((u) => u.role !== "artist") : [];

  return (
    <View style={{ flex: 1, backgroundColor: "#F0EDE6" }}>
      <BlurView intensity={90} tint="extraLight" style={{ paddingTop: 56, paddingBottom: 12, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: "rgba(0,0,0,0.08)" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
          </TouchableOpacity>
          <View>
            <Text style={{ color: GOLD, fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>Administration</Text>
            <Text style={{ color: "#1A1A1A", fontSize: 22, fontWeight: "800" }}>INK Admin</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {(["stats", "artists", "clients", "reports"] as const).map((key) => (
            <TouchableOpacity key={key} onPress={() => setTab(key)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: tab === key ? "#1A1A1A" : "rgba(0,0,0,0.06)" }}>
              <Text style={{ color: tab === key ? "#FFF" : "#6B6B7A", fontWeight: "700", fontSize: 13 }}>
                {key === "stats" ? "Dashboard" : key === "artists" ? "Tatoueurs" : key === "clients" ? "Clients" : "Signalements"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BlurView>

      {loading ? <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={GOLD} size="large" /></View> : (
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}>
          {tab === "stats" && stats && (
            <View style={{ padding: 16, gap: 12 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {[
                  { icon: "people", label: "Membres", value: stats.total_users, color: GOLD },
                  { icon: "color-palette", label: "Tatoueurs", value: stats.total_artists, color: GOLD },
                  { icon: "person", label: "Clients", value: stats.total_clients, color: "#6B6B7A" },
                  { icon: "images", label: "Posts", value: stats.total_posts, color: "#6B6B7A" },
                  { icon: "chatbubbles", label: "Conversations", value: stats.total_conversations, color: "#6B6B7A" },
                  { icon: "color-palette-outline", label: "Projets", value: stats.total_project_requests, color: GOLD },
                ].map((s) => (
                  <View key={s.label} style={{ flex: 1, minWidth: "45%", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)" }}>
                    <Ionicons name={s.icon as any} size={18} color={s.color} />
                    <Text style={{ color: "#1A1A1A", fontSize: 26, fontWeight: "800", marginTop: 8 }}>{s.value}</Text>
                    <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 2 }}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {stats.total_users > 0 && (
                <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)" }}>
                  <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 15, marginBottom: 12 }}>Répartition</Text>
                  <View style={{ height: 10, borderRadius: 5, overflow: "hidden", flexDirection: "row" }}>
                    <View style={{ flex: stats.total_artists, backgroundColor: GOLD }} />
                    <View style={{ flex: stats.total_clients, backgroundColor: "rgba(0,0,0,0.1)" }} />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                    <Text style={{ color: GOLD, fontSize: 12, fontWeight: "600" }}>{stats.total_artists} tatoueurs ({Math.round(stats.total_artists / stats.total_users * 100)}%)</Text>
                    <Text style={{ color: "#6B6B7A", fontSize: 12 }}>{stats.total_clients} clients</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {(tab === "artists" || tab === "clients") && (
            <View style={{ padding: 16, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, gap: 8, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.08)" }}>
                <Ionicons name="search" size={16} color="#6B6B7A" />
                <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher…" placeholderTextColor="#9A9AA5" style={{ flex: 1, color: "#1A1A1A", fontSize: 15 }} />
              </View>
              <Text style={{ color: "#6B6B7A", fontSize: 12 }}>{list.length} {tab === "artists" ? "tatoueur·se·s" : "client·e·s"}</Text>

              {list.map((user) => (
                <View key={user.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(184,144,62,0.15)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: GOLD, fontWeight: "800", fontSize: 18 }}>{(user.display_name ?? "?")[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 15 }}>{user.display_name}</Text>
                      <Text style={{ color: "#6B6B7A", fontSize: 12 }}>@{user.username}{user.city ? ` · ${user.city}` : ""}</Text>
                    </View>
                    <View style={{ gap: 4, alignItems: "flex-end" }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: user.role === "artist" ? "rgba(184,144,62,0.12)" : "rgba(0,0,0,0.05)" }}>
                        <Text style={{ color: user.role === "artist" ? GOLD : "#6B6B7A", fontSize: 11, fontWeight: "700" }}>{user.role === "artist" ? "Artiste" : "Client"}</Text>
                      </View>
                      {user.role === "artist" && (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: user.accepts_projects ? "rgba(46,139,87,0.1)" : "rgba(217,53,53,0.08)" }}>
                          <Text style={{ color: user.accepts_projects ? "#2E8B57" : "#D93535", fontSize: 10, fontWeight: "600" }}>{user.accepts_projects ? "Ouvert" : "Fermé"}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: "rgba(0,0,0,0.06)" }}>
                    <TouchableOpacity onPress={() => router.push(`/profile/${user.id}` as any)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.04)", borderRadius: 10, paddingVertical: 8 }}>
                      <Ionicons name="eye-outline" size={14} color="#6B6B7A" />
                      <Text style={{ color: "#6B6B7A", fontSize: 12, fontWeight: "600" }}>Voir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleRole(user)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(184,144,62,0.08)", borderRadius: 10, paddingVertical: 8 }}>
                      <Ionicons name="swap-horizontal-outline" size={14} color={GOLD} />
                      <Text style={{ color: GOLD, fontSize: 12, fontWeight: "600" }}>→ {user.role === "artist" ? "Client" : "Artiste"}</Text>
                    </TouchableOpacity>
                    {user.role === "artist" && (
                      <TouchableOpacity onPress={() => toggleProjects(user)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: user.accepts_projects ? "rgba(217,53,53,0.06)" : "rgba(46,139,87,0.08)", borderRadius: 10, paddingVertical: 8 }}>
                        <Ionicons name={user.accepts_projects ? "pause-outline" : "checkmark-outline"} size={14} color={user.accepts_projects ? "#D93535" : "#2E8B57"} />
                        <Text style={{ color: user.accepts_projects ? "#D93535" : "#2E8B57", fontSize: 12, fontWeight: "600" }}>{user.accepts_projects ? "Fermer" : "Ouvrir"}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => deleteUser(user)} style={{ width: 36, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(217,53,53,0.06)", borderRadius: 10 }}>
                      <Ionicons name="trash-outline" size={15} color="#D93535" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
          {tab === "reports" && <ReportsTab />}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </View>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    setLoading(true);
    const { data } = await supabase
      .from("reports")
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey(id, display_name, username),
        reported_user:profiles!reports_reported_user_id_fkey(id, display_name, username)
      `)
      .order("created_at", { ascending: false });
    setReports(data ?? []);
    setLoading(false);
  }

  async function markResolved(id: string) {
    await supabase.from("reports").update({ resolved: true }).eq("id", id);
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, resolved: true } : r));
  }

  if (loading) return <ActivityIndicator color="#B8903E" style={{ marginTop: 40 }} />;

  const pending = reports.filter((r) => !r.resolved);
  const resolved = reports.filter((r) => r.resolved);

  return (
    <View style={{ padding: 16, gap: 10 }}>
      <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 14 }}>{pending.length} signalement{pending.length > 1 ? "s" : ""} en attente</Text>
      {pending.map((r) => (
        <View key={r.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(231,76,60,0.15)" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <View style={{ backgroundColor: "rgba(231,76,60,0.1)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: "#E74C3C", fontSize: 12, fontWeight: "700" }}>{r.reason}</Text>
            </View>
            <Text style={{ color: "#6B6B7A", fontSize: 11 }}>{new Date(r.created_at).toLocaleDateString("fr-FR")}</Text>
          </View>
          <Text style={{ color: "#6B6B7A", fontSize: 13 }}>
            <Text style={{ fontWeight: "600", color: "#1A1A1A" }}>@{r.reporter?.username ?? "?"}</Text>
            {" → "}
            {r.reported_user ? <Text style={{ fontWeight: "600", color: "#1A1A1A" }}>@{r.reported_user.username}</Text> : "publication"}
          </Text>
          {r.note && <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 6, fontStyle: "italic" }}>"{r.note}"</Text>}
          <TouchableOpacity
            onPress={() => markResolved(r.id)}
            style={{ marginTop: 10, backgroundColor: "rgba(39,174,96,0.1)", borderRadius: 10, paddingVertical: 8, alignItems: "center" }}
          >
            <Text style={{ color: "#27AE60", fontWeight: "700", fontSize: 13 }}>Marquer résolu</Text>
          </TouchableOpacity>
        </View>
      ))}

      {resolved.length > 0 && (
        <>
          <Text style={{ color: "#6B6B7A", fontWeight: "600", fontSize: 13, marginTop: 8 }}>{resolved.length} résolu{resolved.length > 1 ? "s" : ""}</Text>
          {resolved.map((r) => (
            <View key={r.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, opacity: 0.5 }}>
              <Text style={{ color: "#6B6B7A", fontSize: 12 }}>{r.reason} · @{r.reporter?.username}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}
