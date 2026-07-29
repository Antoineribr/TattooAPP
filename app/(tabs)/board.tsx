import { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  TextInput, Alert, Modal, Pressable, RefreshControl,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { getBoards, createBoard, renameBoard, deleteBoard } from "@/lib/api";
import { Board } from "@/types/database";
import { AuthPrompt } from "@/components/ui/AuthPrompt";

export default function BoardScreen() {
  const { width: W } = useWindowDimensions();
  const { session } = useAuthStore();
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const data = await getBoards(session.user.id);
    // Enrichir avec cover (premier item de chaque board)
    const enriched = await Promise.all(
      (data as Board[]).map(async (b) => {
        const { data: items } = await supabase
          .from("board_items")
          .select("post:posts_with_counts(thumbnail_url, media_url)")
          .eq("board_id", b.id)
          .order("created_at", { ascending: false })
          .limit(1);
        const cover = (items?.[0] as any)?.post?.thumbnail_url ?? (items?.[0] as any)?.post?.media_url ?? null;
        const { count } = await supabase.from("board_items").select("id", { count: "exact", head: true }).eq("board_id", b.id);
        return { ...b, cover_url: cover, items_count: count ?? 0 };
      })
    );
    setBoards(enriched as Board[]);
    setLoading(false);
    setRefreshing(false);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleCreate() {
    if (!newName.trim() || !session) return;
    setCreating(true);
    try {
      await createBoard(session.user.id, newName.trim());
      setNewName("");
      setShowCreate(false);
      load();
    } catch (e: any) { Alert.alert("Erreur", e.message); }
    setCreating(false);
  }

  async function handleBoardOptions(board: Board) {
    Alert.alert(board.name, "Que veux-tu faire ?", [
      {
        text: "Renommer", onPress: () => {
          Alert.prompt("Renommer le board", "", async (name) => {
            if (name?.trim()) { await renameBoard(board.id, name.trim()); load(); }
          }, "plain-text", board.name);
        }
      },
      { text: "Supprimer", style: "destructive", onPress: () => confirmDelete(board) },
      { text: "Annuler", style: "cancel" },
    ]);
  }

  function confirmDelete(board: Board) {
    Alert.alert("Supprimer ce board ?", `"${board.name}" sera supprimé définitivement.`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => { await deleteBoard(board.id); load(); } },
    ]);
  }

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0A0B" }}>
        <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 24 }}>
          <Text style={{ color: "#C9A24B", fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>Mon board</Text>
          <Text style={{ color: "#F4F1EA", fontSize: 24, fontWeight: "800", marginTop: 4 }}>Inspirations</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Ionicons name="bookmark-outline" size={52} color="rgba(244,241,234,0.15)" />
          <Text style={{ color: "#F4F1EA", fontSize: 18, fontWeight: "700", marginTop: 16, textAlign: "center" }}>Sauvegarde tes inspirations</Text>
          <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 21 }}>
            Crée un compte pour construire tes planches d'idées et retrouver tes tatouages favoris.
          </Text>
          <TouchableOpacity onPress={() => setShowAuth(true)} style={{ marginTop: 24, backgroundColor: "#C9A24B", borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}>
            <Text style={{ color: "#0A0A0B", fontWeight: "700", fontSize: 15 }}>Créer un compte</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAuth(true)} style={{ marginTop: 12, paddingVertical: 10 }}>
            <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 14 }}>Se connecter</Text>
          </TouchableOpacity>
        </View>
        <AuthPrompt visible={showAuth} context="save" onClose={() => setShowAuth(false)} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0B" }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <View>
          <Text style={{ color: "#C9A24B", fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>Mes boards</Text>
          <Text style={{ color: "#F4F1EA", fontSize: 24, fontWeight: "800", marginTop: 2 }}>Inspirations</Text>
        </View>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={{ backgroundColor: "#C9A24B", borderRadius: 12, padding: 10, marginBottom: 4 }}>
          <Ionicons name="add" size={20} color="#0A0A0B" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#C9A24B" />
        </View>
      ) : (
        <FlatList
          data={boards}
          keyExtractor={(b) => b.id}
          numColumns={2}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#C9A24B" />}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 100 }}
          columnWrapperStyle={{ gap: 12 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 20 }}>
              <Ionicons name="albums-outline" size={52} color="rgba(244,241,234,0.15)" />
              <Text style={{ color: "#F4F1EA", fontSize: 17, fontWeight: "700", marginTop: 16, textAlign: "center" }}>Aucun board</Text>
              <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 }}>
                Crée ton premier board pour organiser tes inspirations tattoo.
              </Text>
              <TouchableOpacity onPress={() => setShowCreate(true)} style={{ marginTop: 20, backgroundColor: "#C9A24B", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
                <Text style={{ color: "#0A0A0B", fontWeight: "700" }}>Créer un board</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/board/${item.id}`)}
              onLongPress={() => handleBoardOptions(item)}
              activeOpacity={0.85}
              style={{ flex: 1 }}
            >
              <View style={{ borderRadius: 14, overflow: "hidden", backgroundColor: "#17171A" }}>
                {item.cover_url ? (
                  <Image source={{ uri: item.cover_url }} style={{ width: "100%", height: (W - 44) / 2 }} contentFit="cover" />
                ) : (
                  <View style={{ width: "100%", height: (W - 44) / 2, backgroundColor: "rgba(244,241,234,0.06)", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="bookmark-outline" size={36} color="rgba(244,241,234,0.18)" />
                  </View>
                )}
                <View style={{ padding: 12 }}>
                  <Text style={{ color: "#F4F1EA", fontWeight: "700", fontSize: 14 }} numberOfLines={1}>{item.name}</Text>
                  <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 12, marginTop: 2 }}>
                    {(item as any).items_count ?? 0} inspiration{((item as any).items_count ?? 0) !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal création */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={() => setShowCreate(false)} />
        <View style={{ backgroundColor: "#17171A", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(244,241,234,0.15)", alignSelf: "center", marginBottom: 20 }} />
          <Text style={{ color: "#F4F1EA", fontSize: 18, fontWeight: "800", marginBottom: 16 }}>Nouveau board</Text>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Ex : Bras gauche, Fine line, Idées…"
            placeholderTextColor="rgba(244,241,234,0.28)"
            accessibilityLabel="Nom du board"
            autoFocus
            onSubmitEditing={handleCreate}
            style={{ backgroundColor: "rgba(244,241,234,0.06)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#F4F1EA", fontSize: 15, borderWidth: 1, borderColor: "rgba(244,241,234,0.1)", marginBottom: 16 }}
          />
          <TouchableOpacity onPress={handleCreate} disabled={!newName.trim() || creating} style={{ backgroundColor: newName.trim() ? "#C9A24B" : "rgba(244,241,234,0.06)", borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
            {creating ? <ActivityIndicator color="#0A0A0B" /> : <Text style={{ color: newName.trim() ? "#0A0A0B" : "rgba(244,241,234,0.18)", fontWeight: "700", fontSize: 15 }}>Créer le board</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
