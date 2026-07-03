import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, Modal, Pressable,
  FlatList, TextInput, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { getBoards, createBoard, addToBoard, removeFromBoard } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Board } from "@/types/database";

interface Props {
  visible: boolean;
  postId: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function BoardPicker({ visible, postId, onClose, onSaved }: Props) {
  const { session } = useAuthStore();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (visible && session) load();
  }, [visible]);

  async function load() {
    setLoading(true);
    const data = await getBoards(session!.user.id);
    setBoards(data as Board[]);

    // Quel board contient déjà ce post ?
    const { data: items } = await supabase
      .from("board_items")
      .select("board_id")
      .eq("post_id", postId)
      .in("board_id", (data as Board[]).map((b) => b.id));
    const map: Record<string, boolean> = {};
    (items ?? []).forEach((i: any) => { map[i.board_id] = true; });
    setSaved(map);
    setLoading(false);
  }

  async function toggle(board: Board) {
    const isSaved = !!saved[board.id];
    setSaved((prev) => ({ ...prev, [board.id]: !isSaved }));
    if (isSaved) {
      await removeFromBoard(board.id, postId);
    } else {
      await addToBoard(board.id, postId);
      onSaved?.();
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !session) return;
    setCreating(true);
    try {
      const board = await createBoard(session.user.id, newName.trim());
      await addToBoard(board.id, postId);
      setBoards((prev) => [...prev, board as Board]);
      setSaved((prev) => ({ ...prev, [board.id]: true }));
      setNewName("");
      onSaved?.();
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    }
    setCreating(false);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={onClose} />
      <View style={{ backgroundColor: "#EDE9E1", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        {/* Handle */}
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.1)", alignSelf: "center", marginTop: 12 }} />

        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ color: "#1A1A1A", fontSize: 18, fontWeight: "800" }}>Enregistrer dans…</Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <ActivityIndicator color="#B8903E" />
          </View>
        ) : (
          <FlatList
            data={boards}
            keyExtractor={(b) => b.id}
            style={{ maxHeight: 300 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => toggle(item)}
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)", gap: 12 }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.06)",
                  alignItems: "center", justifyContent: "center",
                  borderWidth: saved[item.id] ? 2 : 1,
                  borderColor: saved[item.id] ? "#B8903E" : "rgba(0,0,0,0.1)",
                }}>
                  <Ionicons name={saved[item.id] ? "bookmark" : "bookmark-outline"} size={20} color={saved[item.id] ? "#B8903E" : "#6B6B7A"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#1A1A1A", fontWeight: "600", fontSize: 15 }}>{item.name}</Text>
                  <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 1 }}>
                    {(item as any).board_items?.[0]?.count ?? 0} inspirations
                  </Text>
                </View>
                {saved[item.id] && <Ionicons name="checkmark-circle" size={22} color="#B8903E" />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ color: "#6B6B7A", fontSize: 14, paddingVertical: 16 }}>Aucun board — crée-en un !</Text>
            }
          />
        )}

        {/* Créer un nouveau board */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Nouveau board…"
              placeholderTextColor="rgba(0,0,0,0.18)"
              onSubmitEditing={handleCreate}
              returnKeyType="done"
              style={{
                flex: 1, backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 12,
                paddingHorizontal: 14, paddingVertical: 12, color: "#1A1A1A", fontSize: 14,
                borderWidth: 1, borderColor: "rgba(0,0,0,0.1)",
              }}
            />
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!newName.trim() || creating}
              style={{
                backgroundColor: newName.trim() ? "#B8903E" : "rgba(0,0,0,0.06)",
                borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center",
              }}
            >
              {creating ? <ActivityIndicator size="small" color="#F5F3EE" /> : <Ionicons name="add" size={22} color={newName.trim() ? "#F5F3EE" : "rgba(0,0,0,0.18)"} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
