import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, SectionList, ActivityIndicator, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { getProjectRequests, getOrCreateConversation } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar } from "@/components/ui/Avatar";
import {
  ProjectRequest, ProjectStatus, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS,
  SIZE_LABELS, SizeCategory,
} from "@/types/database";

const GOLD = "#B8903E";

// Ordre d'affichage : ce qui demande une action d'abord
const STATUS_ORDER: ProjectStatus[] = [
  "new", "awaiting_reply", "in_discussion", "quote_sent",
  "deposit_requested", "confirmed", "done", "archived",
];

function RequestCard({ req, onPress }: { req: ProjectRequest; onPress: () => void }) {
  const budget = req.budget_min || req.budget_max
    ? `${req.budget_min ?? "?"}–${req.budget_max ?? "?"}€`
    : null;
  const refImage = req.media?.[0]?.url ?? req.post?.thumbnail_url ?? req.post?.media_url ?? null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}
      style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Avatar uri={req.client?.avatar_url ?? null} name={req.client?.display_name ?? "?"} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 14 }}>{req.client?.display_name ?? "Client"}</Text>
          <Text style={{ color: "#9A9AA5", fontSize: 11 }}>
            {new Date(req.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            {req.city ? ` · ${req.city}` : ""}
          </Text>
        </View>
        {refImage && <Image source={{ uri: refImage }} style={{ width: 44, height: 44, borderRadius: 8 }} contentFit="cover" />}
      </View>

      {req.description && (
        <Text style={{ color: "#6B6B7A", fontSize: 13, lineHeight: 19, marginBottom: 10 }} numberOfLines={2}>
          {req.description}
        </Text>
      )}

      {/* Les infos qui font gagner du temps : budget, taille, emplacement, couleur */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {budget && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(184,144,62,0.1)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Ionicons name="pricetag-outline" size={11} color={GOLD} />
            <Text style={{ color: GOLD, fontSize: 12, fontWeight: "700" }}>{budget}</Text>
          </View>
        )}
        {req.body_placement && (
          <View style={{ backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: "#6B6B7A", fontSize: 12 }}>{req.body_placement}</Text>
          </View>
        )}
        {req.size_category && (
          <View style={{ backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: "#6B6B7A", fontSize: 12 }}>{SIZE_LABELS[req.size_category as SizeCategory]}</Text>
          </View>
        )}
        {req.color_preference && req.color_preference !== "any" && (
          <View style={{ backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: "#6B6B7A", fontSize: 12 }}>{req.color_preference === "black_grey" ? "Noir & gris" : "Couleur"}</Text>
          </View>
        )}
        {req.desired_style && (
          <View style={{ backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: "#6B6B7A", fontSize: 12 }}>{req.desired_style}</Text>
          </View>
        )}
        {req.desired_date && (
          <View style={{ backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: "#6B6B7A", fontSize: 12 }}>{req.desired_date}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ProRequestsScreen() {
  const { session } = useAuthStore();
  const router = useRouter();
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const data = await getProjectRequests(session.user.id, "artist");
    setRequests(data as any[]);
    setLoading(false);
    setRefreshing(false);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function openRequest(req: ProjectRequest) {
    // La conversation existe déjà (créée à l'envoi de la demande)
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("client_id", req.client_id)
      .eq("artist_id", req.artist_id)
      .maybeSingle();
    const convId = conv?.id ?? await getOrCreateConversation(req.client_id, req.artist_id, req.id);
    router.push(`/chat/${convId}`);
  }

  const sections = STATUS_ORDER
    .map((status) => ({
      status,
      title: PROJECT_STATUS_LABELS[status],
      color: PROJECT_STATUS_COLORS[status],
      data: requests.filter((r) => r.status === status),
    }))
    .filter((s) => s.data.length > 0);

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE" }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: GOLD, fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>Espace pro</Text>
          <Text style={{ color: "#1A1A1A", fontSize: 20, fontWeight: "800" }}>Mes demandes</Text>
        </View>
        <Text style={{ color: "#6B6B7A", fontSize: 13, fontWeight: "600" }}>{requests.length}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={GOLD} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GOLD} />}
          renderSectionHeader={({ section }) => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: (section as any).color }} />
              <Text style={{ color: "#1A1A1A", fontWeight: "800", fontSize: 14 }}>{(section as any).title}</Text>
              <Text style={{ color: "#9A9AA5", fontSize: 13 }}>· {(section as any).data.length}</Text>
            </View>
          )}
          renderItem={({ item }) => <RequestCard req={item} onPress={() => openRequest(item)} />}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 80, paddingHorizontal: 32 }}>
              <Ionicons name="color-palette-outline" size={52} color="rgba(0,0,0,0.1)" />
              <Text style={{ color: "#1A1A1A", fontSize: 17, fontWeight: "700", marginTop: 16 }}>Aucune demande pour l'instant</Text>
              <Text style={{ color: "#6B6B7A", fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 }}>
                Les demandes de projets envoyées par les clients arriveront ici, qualifiées avec budget, taille et emplacement.
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}
