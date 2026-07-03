import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

type Props = {
  visible: boolean;
  artistId: string;
  artistName: string;
  projectRequestId?: string | null;
  onClose: () => void;
  onSubmitted: () => void;
};

export function ReviewSheet({ visible, artistId, artistName, projectRequestId, onClose, onSubmitted }: Props) {
  const { session } = useAuthStore();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!session || rating === 0) return;
    setLoading(true);
    const { error } = await supabase.from("reviews").insert({
      client_id: session.user.id,
      artist_id: artistId,
      project_request_id: projectRequestId ?? null,
      rating,
      body: body.trim() || null,
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") Alert.alert("Déjà fait", "Tu as déjà laissé un avis pour ce projet.");
      else Alert.alert("Erreur", error.message);
      return;
    }
    setRating(0);
    setBody("");
    onSubmitted();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ backgroundColor: "#F5F3EE", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === "ios" ? 44 : 28 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.1)", alignSelf: "center", marginBottom: 20 }} />
          <Text style={{ color: "#1A1A1A", fontSize: 20, fontWeight: "800", marginBottom: 4 }}>Laisser un avis</Text>
          <Text style={{ color: "#6B6B7A", fontSize: 14, marginBottom: 24 }}>Pour {artistName}</Text>

          {/* Étoiles */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 24 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} onPress={() => setRating(s)} hitSlop={8}>
                <Ionicons name={s <= rating ? "star" : "star-outline"} size={38} color={s <= rating ? "#B8903E" : "rgba(0,0,0,0.15)"} />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Décris ton expérience… (facultatif)"
            placeholderTextColor="#6B6B7A"
            multiline
            numberOfLines={4}
            style={{ backgroundColor: "#FFFFFF", color: "#1A1A1A", borderRadius: 14, padding: 14, fontSize: 15, minHeight: 100, textAlignVertical: "top", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", marginBottom: 16 }}
          />

          <TouchableOpacity
            onPress={submit}
            disabled={rating === 0 || loading}
            style={{ backgroundColor: rating > 0 ? "#B8903E" : "rgba(0,0,0,0.08)", borderRadius: 14, paddingVertical: 16, alignItems: "center" }}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <Text style={{ color: rating > 0 ? "#FFF" : "rgba(0,0,0,0.2)", fontWeight: "800", fontSize: 15 }}>
                {rating === 0 ? "Sélectionne une note" : "Publier l'avis"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
