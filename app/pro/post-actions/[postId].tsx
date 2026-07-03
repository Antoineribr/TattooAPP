import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { Post, PostStatus } from "@/types/database";

const STATUS_INFO: Record<PostStatus, { label: string; color: string; icon: string }> = {
  published: { label: "Publié", color: "#27AE60", icon: "checkmark-circle" },
  draft: { label: "Brouillon", color: "#6B6B7A", icon: "document-outline" },
  paused: { label: "En pause", color: "#FF8C42", icon: "pause-circle" },
  deleted: { label: "Supprimé", color: "#E74C3C", icon: "trash" },
};

export default function PostActionsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { session } = useAuthStore();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { if (postId) fetchPost(); }, [postId]);

  async function fetchPost() {
    const { data } = await supabase.from("posts").select("*").eq("id", postId).single();
    setPost(data);
    setLoading(false);
  }

  async function changeStatus(status: PostStatus) {
    setUpdating(true);
    const { error } = await supabase.from("posts").update({ status }).eq("id", postId);
    setUpdating(false);
    if (error) { Alert.alert("Erreur", error.message); return; }
    setPost((p) => p ? { ...p, status } : p);
  }

  async function handleDelete() {
    Alert.alert(
      "Supprimer cette publication ?",
      "Le contenu sera définitivement retiré du feed.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await changeStatus("deleted");
            router.back();
          },
        },
      ]
    );
  }

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color="#B8903E" />
    </View>
  );

  if (!post) return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#6B6B7A" }}>Publication introuvable</Text>
    </View>
  );

  const statusInfo = STATUS_INFO[post.status];

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE" }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: "#1A1A1A", fontSize: 18, fontWeight: "800" }}>Gérer la publication</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Aperçu */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden" }}>
          <Image source={{ uri: post.thumbnail_url ?? post.media_url }} style={{ width: "100%", height: 220 }} contentFit="cover" />
          <View style={{ padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: `${statusInfo.color}18`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                <Ionicons name={statusInfo.icon as any} size={13} color={statusInfo.color} />
                <Text style={{ color: statusInfo.color, fontSize: 12, fontWeight: "700" }}>{statusInfo.label}</Text>
              </View>
              {post.creation_type && (
                <View style={{ backgroundColor: "rgba(184,144,62,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                  <Text style={{ color: "#B8903E", fontSize: 12, fontWeight: "600" }}>
                    {post.creation_type === "flash" ? "Flash" : "Sur mesure"}
                  </Text>
                </View>
              )}
            </View>
            {post.caption && <Text style={{ color: "#6B6B7A", fontSize: 13, lineHeight: 19 }} numberOfLines={2}>{post.caption}</Text>}
            <Text style={{ color: "rgba(0,0,0,0.3)", fontSize: 11, marginTop: 6 }}>
              {new Date(post.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 14 }}>Actions</Text>

        {post.status === "published" && (
          <ActionBtn
            icon="pause-circle-outline"
            label="Mettre en pause"
            desc="Retire temporairement du feed sans supprimer"
            color="#FF8C42"
            onPress={() => changeStatus("paused")}
            loading={updating}
          />
        )}

        {(post.status === "paused" || post.status === "draft") && (
          <ActionBtn
            icon="checkmark-circle-outline"
            label="Republier"
            desc="Remettre cette publication dans le feed"
            color="#27AE60"
            onPress={() => changeStatus("published")}
            loading={updating}
          />
        )}

        {post.status !== "deleted" && (
          <ActionBtn
            icon="trash-outline"
            label="Supprimer définitivement"
            desc="Cette action est irréversible"
            color="#E74C3C"
            onPress={handleDelete}
            loading={updating}
          />
        )}
      </ScrollView>
    </View>
  );
}

function ActionBtn({ icon, label, desc, color, onPress, loading }: {
  icon: string; label: string; desc: string; color: string; onPress: () => void; loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16 }}
    >
      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: `${color}18`, alignItems: "center", justifyContent: "center" }}>
        {loading ? <ActivityIndicator color={color} size="small" /> : <Ionicons name={icon as any} size={22} color={color} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 14 }}>{label}</Text>
        <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 2 }}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="rgba(0,0,0,0.2)" />
    </TouchableOpacity>
  );
}
