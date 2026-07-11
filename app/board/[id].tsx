import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { getBoardItems } from "@/lib/api";
import { BoardItem } from "@/types/database";

const { width: W } = Dimensions.get("window");
const COL = (W - 3) / 3;

export default function BoardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [items, setItems] = useState<BoardItem[]>([]);
  const [boardName, setBoardName] = useState("Board");
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: board } = await supabase.from("boards").select("name").eq("id", id).single();
      if (board) setBoardName((board as any).name);
      const data = await getBoardItems(id);
      setItems(data as BoardItem[]);
      setLoading(false);
    })();
  }, [id]));

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE" }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: "#1A1A1A", fontSize: 20, fontWeight: "800" }}>{boardName}</Text>
        <Text style={{ color: "#6B6B7A", fontSize: 13 }}>{items.length} inspiration{items.length !== 1 ? "s" : ""}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#B8903E" />
        </View>
      ) : !items.length ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Ionicons name="bookmark-outline" size={52} color="rgba(0,0,0,0.1)" />
          <Text style={{ color: "#1A1A1A", fontSize: 17, fontWeight: "700", marginTop: 16, textAlign: "center" }}>Board vide</Text>
          <Text style={{ color: "#6B6B7A", fontSize: 14, marginTop: 8, textAlign: "center" }}>
            Sauvegarde des publications dans ce board depuis le feed.
          </Text>
          <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={{ marginTop: 20, backgroundColor: "#B8903E", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: "#F5F3EE", fontWeight: "700" }}>Explorer le feed</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={3}
          contentContainerStyle={{ gap: 1.5 }}
          columnWrapperStyle={{ gap: 1.5 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/post/${item.post_id}`)}>
              <Image
                source={{ uri: (item.post as any)?.thumbnail_url ?? (item.post as any)?.media_url }}
                style={{ width: COL, height: COL }}
                contentFit="cover"
              />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
