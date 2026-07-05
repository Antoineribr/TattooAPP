import { useEffect, useState } from "react";
import {
  Alert, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { toggleLike, toggleSave, toggleFollow } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { PostWithCounts, SIZE_LABELS, SizeCategory } from "@/types/database";
import { Avatar } from "@/components/ui/Avatar";
import { AuthPrompt } from "@/components/ui/AuthPrompt";
import { BoardPicker } from "@/components/ui/BoardPicker";

const { width: W } = Dimensions.get("window");

const AVAILABILITY_LABELS: Record<string, string> = {
  flash_available: "⚡ Flash disponible",
  flash_done: "✓ Flash déjà tatoué",
  custom: "✏️ Personnalisable",
  commission: "🎨 Projet sur mesure",
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const router = useRouter();

  const [post, setPost] = useState<PostWithCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [authPrompt, setAuthPrompt] = useState<"save" | "follow" | "project" | null>(null);
  const [showBoardPicker, setShowBoardPicker] = useState(false);

  useEffect(() => { if (id) load(); }, [id]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("posts_with_counts").select("*").eq("id", id).single();
    if (data) {
      let p = data as PostWithCounts;
      if (session) {
        const [{ data: liked }, { data: saved }, { data: followed }] = await Promise.all([
          supabase.from("likes").select("id").eq("post_id", id).eq("user_id", session.user.id).single(),
          supabase.from("saves").select("id").eq("post_id", id).eq("user_id", session.user.id).single(),
          supabase.from("follows").select("id").eq("artist_id", p.artist_id).eq("follower_id", session.user.id).single(),
        ]);
        p = { ...p, is_liked: !!liked, is_saved: !!saved, is_following: !!followed };
      }
      setPost(p);
    }
    setLoading(false);
  }

  async function handleLike() {
    if (!session || !post) { setAuthPrompt(null); return; }
    const was = post.is_liked ?? false;
    setPost((prev) => prev ? { ...prev, is_liked: !was, likes_count: prev.likes_count + (was ? -1 : 1) } : prev);
    await toggleLike(post.id, session.user.id, was);
  }

  async function handleSave() {
    if (!session || !post) { setAuthPrompt("save"); return; }
    if (post.is_saved) {
      setPost((prev) => prev ? { ...prev, is_saved: false } : prev);
      await toggleSave(post.id, session.user.id, true);
    } else {
      setShowBoardPicker(true);
      setPost((prev) => prev ? { ...prev, is_saved: true } : prev);
    }
  }

  async function handleFollow() {
    if (!session || !post) { setAuthPrompt("follow"); return; }
    const was = post.is_following ?? false;
    setPost((prev) => prev ? { ...prev, is_following: !was } : prev);
    await toggleFollow(post.artist_id, session.user.id, was);
  }

  function handleProject() {
    if (!session || !post) { setAuthPrompt("project"); return; }
    router.push({
      pathname: "/project/request",
      params: { artistId: post.artist_id, artistName: post.display_name, postId: post.id, postImage: post.thumbnail_url ?? post.media_url },
    });
  }

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0B", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color="#C9A24B" />
    </View>
  );
  if (!post) return null;

  const allMedias = [post.media_url, ...(post.media_urls ?? [])].filter(Boolean);
  const price = post.price_type === "on_quote" ? "Sur devis" :
    post.price_type === "fixed" ? `${post.price_min}€` :
    `${post.price_min}€ – ${post.price_max}€`;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0A0A0B" }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#F4F1EA" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          hitSlop={12}
          onPress={() => Alert.alert("Signaler", "Pourquoi veux-tu signaler cette publication ?", [
            { text: "Contenu inapproprié", onPress: () => Alert.alert("Signalement envoyé", "Merci, nous allons examiner cette publication.") },
            { text: "Spam ou arnaque", onPress: () => Alert.alert("Signalement envoyé", "Merci, nous allons examiner cette publication.") },
            { text: "Harcèlement", onPress: () => Alert.alert("Signalement envoyé", "Merci, nous allons examiner cette publication.") },
            { text: "Annuler", style: "cancel" },
          ])}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="rgba(244,241,234,0.55)" />
        </TouchableOpacity>
      </View>

      {/* Media */}
      {allMedias.length === 1 ? (
        <Image source={{ uri: allMedias[0] }} style={{ width: W, height: W }} contentFit="cover" />
      ) : (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {allMedias.map((uri, i) => (
            <Image key={i} source={{ uri }} style={{ width: W, height: W }} contentFit="cover" />
          ))}
        </ScrollView>
      )}

      {/* Contenu */}
      <View style={{ padding: 20 }}>
        {/* Artiste */}
        <TouchableOpacity
          onPress={() => router.push(`/profile/${post.artist_id}`)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}
        >
          <Avatar uri={post.avatar_url} name={post.display_name} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#F4F1EA", fontWeight: "700", fontSize: 16 }}>{post.display_name}</Text>
            {post.artist_city && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                <Ionicons name="location-outline" size={12} color="rgba(244,241,234,0.55)" />
                <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 13 }}>{post.artist_city}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={handleFollow} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: post.is_following ? "transparent" : "#C9A24B", borderWidth: 1, borderColor: "#C9A24B" }}>
            <Text style={{ color: post.is_following ? "#C9A24B" : "#0A0A0B", fontWeight: "700", fontSize: 13 }}>
              {post.is_following ? "Abonné·e" : "Suivre"}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Titre & caption */}
        {post.title && <Text style={{ color: "#F4F1EA", fontSize: 20, fontWeight: "800", marginBottom: 6 }}>{post.title}</Text>}
        {post.caption && <Text style={{ color: "rgba(244,241,234,0.7)", fontSize: 15, lineHeight: 22, marginBottom: 16 }}>{post.caption}</Text>}

        {/* Infos tatouage */}
        <View style={{ backgroundColor: "#17171A", borderRadius: 14, padding: 16, gap: 12, marginBottom: 16, borderWidth: 1, borderColor: "rgba(244,241,234,0.08)" }}>
          {post.availability_type && (
            <InfoRow icon="information-circle-outline" value={AVAILABILITY_LABELS[post.availability_type] ?? post.availability_type} gold />
          )}
          {post.body_placement && <InfoRow icon="body-outline" value={post.body_placement} />}
          {post.size_category && <InfoRow icon="resize-outline" value={SIZE_LABELS[post.size_category as SizeCategory] ?? post.size_category} />}
          {post.duration_minutes && <InfoRow icon="time-outline" value={`${post.duration_minutes < 60 ? post.duration_minutes + " min" : Math.round(post.duration_minutes / 60) + "h"}`} />}
          {(post.price_min || post.price_type === "on_quote") && <InfoRow icon="pricetag-outline" value={price} />}
        </View>

        {/* Tags styles */}
        {post.style_tags?.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {post.style_tags.map((t) => (
              <View key={t} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: "rgba(244,241,234,0.06)", borderWidth: 0.5, borderColor: "rgba(244,241,234,0.15)" }}>
                <Text style={{ color: "rgba(244,241,234,0.8)", fontSize: 13 }}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          <TouchableOpacity onPress={handleLike} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#17171A", borderRadius: 12, paddingVertical: 13, borderWidth: 1, borderColor: post.is_liked ? "#C9A24B" : "rgba(244,241,234,0.12)" }}>
            <Ionicons name={post.is_liked ? "heart" : "heart-outline"} size={18} color={post.is_liked ? "#C9A24B" : "#F4F1EA"} />
            <Text style={{ color: post.is_liked ? "#C9A24B" : "#F4F1EA", fontWeight: "600" }}>J'aime</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#17171A", borderRadius: 12, paddingVertical: 13, borderWidth: 1, borderColor: post.is_saved ? "#C9A24B" : "rgba(244,241,234,0.12)" }}>
            <Ionicons name={post.is_saved ? "bookmark" : "bookmark-outline"} size={18} color={post.is_saved ? "#C9A24B" : "#F4F1EA"} />
            <Text style={{ color: post.is_saved ? "#C9A24B" : "#F4F1EA", fontWeight: "600" }}>Sauver</Text>
          </TouchableOpacity>
        </View>

        {/* CTA principal */}
        <TouchableOpacity
          onPress={handleProject}
          style={{ backgroundColor: "#C9A24B", borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10 }}
        >
          <Ionicons name="color-palette-outline" size={20} color="#0A0A0B" />
          <Text style={{ color: "#0A0A0B", fontWeight: "800", fontSize: 16 }}>Demander un projet</Text>
        </TouchableOpacity>

        {/* Voir profil */}
        <TouchableOpacity
          onPress={() => router.push(`/profile/${post.artist_id}`)}
          style={{ marginTop: 12, paddingVertical: 14, alignItems: "center", borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(244,241,234,0.15)" }}
        >
          <Text style={{ color: "#F4F1EA", fontWeight: "600" }}>Voir le profil</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {authPrompt && <AuthPrompt visible context={authPrompt} onClose={() => setAuthPrompt(null)} />}
      <BoardPicker visible={showBoardPicker} postId={post.id} onClose={() => setShowBoardPicker(false)} onSaved={() => setShowBoardPicker(false)} />

      {/* Pas de commentaires publics : INK privilégie la mise en relation directe.
          Le contact se fait via message privé ou demande de projet. */}
    </ScrollView>
  );
}

function InfoRow({ icon, value, gold }: { icon: any; value: string; gold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Ionicons name={icon} size={16} color={gold ? "#C9A24B" : "rgba(244,241,234,0.55)"} />
      <Text style={{ color: gold ? "#C9A24B" : "#F4F1EA", fontSize: 14, fontWeight: gold ? "700" : "400" }}>{value}</Text>
    </View>
  );
}
