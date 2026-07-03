import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { getArtistStats } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { PROJECT_STATUS_LABELS, ProjectStatus } from "@/types/database";

const { width: W } = Dimensions.get("window");

export default function StatsScreen() {
  const { session } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    load();
  }, [session]);

  async function load() {
    setLoading(true);
    const s = await getArtistStats(session!.user.id);
    setStats(s);

    // Posts les plus sauvegardés
    const { data } = await supabase
      .from("posts_with_counts")
      .select("id, media_url, thumbnail_url, caption, style_tags, saves_count, likes_count")
      .eq("artist_id", session!.user.id)
      .order("saves_count", { ascending: false })
      .limit(5);
    setTopPosts(data ?? []);
    setLoading(false);
  }

  // Compter les statuts
  const statusCounts: Partial<Record<ProjectStatus, number>> = {};
  (stats?.requests ?? []).forEach((r: any) => {
    statusCounts[r.status as ProjectStatus] = (statusCounts[r.status as ProjectStatus] ?? 0) + 1;
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F5F3EE" }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
          </TouchableOpacity>
          <View>
            <Text style={{ color: "#B8903E", fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>Espace pro</Text>
            <Text style={{ color: "#1A1A1A", fontSize: 24, fontWeight: "800" }}>Statistiques</Text>
          </View>
        </View>
        <Text style={{ color: "#6B6B7A", fontSize: 13 }}>Chiffres calculés en temps réel depuis les vraies interactions.</Text>
      </View>

      {loading ? (
        <View style={{ paddingTop: 60, alignItems: "center" }}>
          <ActivityIndicator color="#B8903E" />
        </View>
      ) : (
        <View style={{ padding: 20, gap: 20 }}>
          {/* Chiffres clés */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <StatCard icon="images-outline" label="Publications" value={stats?.posts_count ?? 0} />
            <StatCard icon="people-outline" label="Abonnés" value={stats?.followers_count ?? 0} />
            <StatCard icon="bookmark-outline" label="Sauvegardes" value={stats?.saves_count ?? 0} gold />
            <StatCard icon="color-palette-outline" label="Demandes reçues" value={stats?.requests_count ?? 0} gold />
          </View>

          {/* Demandes par statut */}
          {stats?.requests_count > 0 && (
            <View>
              <SectionTitle title="Demandes par statut" />
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 14, overflow: "hidden" }}>
                {Object.entries(statusCounts).map(([status, count], i) => (
                  <View key={status} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: i < Object.keys(statusCounts).length - 1 ? 1 : 0, borderBottomColor: "rgba(0,0,0,0.06)" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#1A1A1A", fontSize: 14 }}>{PROJECT_STATUS_LABELS[status as ProjectStatus] ?? status}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ height: 6, width: Math.max(20, ((count as number) / stats.requests_count) * 120), backgroundColor: "#B8903E", borderRadius: 3 }} />
                      <Text style={{ color: "#B8903E", fontWeight: "700", fontSize: 14, width: 24, textAlign: "right" }}>{count as number}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Posts les plus sauvegardés */}
          {topPosts.length > 0 && (
            <View>
              <SectionTitle title="Publications les plus enregistrées" />
              <View style={{ gap: 10 }}>
                {topPosts.map((post, i) => (
                  <TouchableOpacity
                    key={post.id}
                    onPress={() => router.push(`/post/${post.id}`)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12 }}
                  >
                    <Text style={{ color: "#6B6B7A", fontWeight: "700", fontSize: 16, width: 20 }}>#{i + 1}</Text>
                    <Image source={{ uri: post.thumbnail_url ?? post.media_url }} style={{ width: 52, height: 52, borderRadius: 8 }} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#1A1A1A", fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                        {post.caption ?? post.style_tags?.[0] ?? "Sans titre"}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="bookmark" size={12} color="#B8903E" />
                          <Text style={{ color: "#B8903E", fontSize: 12, fontWeight: "600" }}>{post.saves_count}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="heart" size={12} color="#6B6B7A" />
                          <Text style={{ color: "#6B6B7A", fontSize: 12 }}>{post.likes_count}</Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="rgba(0,0,0,0.18)" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* État vide */}
          {stats?.posts_count === 0 && (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Ionicons name="stats-chart-outline" size={48} color="rgba(0,0,0,0.1)" />
              <Text style={{ color: "#1A1A1A", fontSize: 16, fontWeight: "700", marginTop: 16, textAlign: "center" }}>Aucune statistique</Text>
              <Text style={{ color: "#6B6B7A", fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 }}>
                Les statistiques apparaîtront à mesure que ton profil sera découvert et tes publications sauvegardées.
              </Text>
            </View>
          )}
        </View>
      )}
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

function StatCard({ icon, label, value, gold }: { icon: any; label: string; value: number; gold?: boolean }) {
  return (
    <View style={{ width: (W - 52) / 2, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: gold ? "rgba(184,144,62,0.2)" : "rgba(0,0,0,0.06)" }}>
      <Ionicons name={icon} size={20} color={gold ? "#B8903E" : "#6B6B7A"} />
      <Text style={{ color: gold ? "#B8903E" : "#1A1A1A", fontSize: 28, fontWeight: "800", marginTop: 10 }}>{value}</Text>
      <Text style={{ color: "#6B6B7A", fontSize: 13, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={{ color: "#1A1A1A", fontSize: 16, fontWeight: "700", marginBottom: 10 }}>{title}</Text>;
}
