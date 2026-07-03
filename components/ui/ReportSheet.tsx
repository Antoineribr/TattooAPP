import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { REPORT_REASONS } from "@/lib/config";

interface Props {
  visible: boolean;
  onClose: () => void;
  reportedUserId?: string;
  reportedPostId?: string;
}

export function ReportSheet({ visible, onClose, reportedUserId, reportedPostId }: Props) {
  const { session } = useAuthStore();
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!selectedReason) { Alert.alert("Sélectionne une raison"); return; }
    if (!session) return;
    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: session.user.id,
      reported_user_id: reportedUserId ?? null,
      reported_post_id: reportedPostId ?? null,
      reason: selectedReason,
      note: note.trim() || null,
    });
    setSubmitting(false);
    if (error) { Alert.alert("Erreur", error.message); return; }
    Alert.alert("Signalement envoyé", "Merci, notre équipe va examiner ce contenu.", [
      { text: "OK", onPress: () => { setSelectedReason(""); setNote(""); onClose(); } },
    ]);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }} onPress={onClose} />
      <View style={{ backgroundColor: "#F5F3EE", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 48 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.12)", alignSelf: "center", marginTop: 14, marginBottom: 20 }} />
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: "#1A1A1A", fontSize: 18, fontWeight: "800", marginBottom: 16 }}>Signaler</Text>

          <View style={{ gap: 8, marginBottom: 16 }}>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                onPress={() => setSelectedReason(r.value)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 12, backgroundColor: selectedReason === r.value ? "rgba(184,144,62,0.1)" : "#FFFFFF", borderWidth: 1.5, borderColor: selectedReason === r.value ? "#B8903E" : "transparent" }}
              >
                <Text style={{ flex: 1, color: selectedReason === r.value ? "#B8903E" : "#1A1A1A", fontSize: 14, fontWeight: selectedReason === r.value ? "700" : "500" }}>{r.label}</Text>
                {selectedReason === r.value && <Ionicons name="checkmark-circle" size={18} color="#B8903E" />}
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Détails supplémentaires (optionnel)"
            placeholderTextColor="rgba(0,0,0,0.2)"
            multiline
            style={{ backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: "#1A1A1A", fontSize: 14, minHeight: 70, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", marginBottom: 14, textAlignVertical: "top" }}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || !selectedReason}
            style={{ backgroundColor: selectedReason ? "#E74C3C" : "rgba(0,0,0,0.06)", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
          >
            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: selectedReason ? "#FFF" : "rgba(0,0,0,0.2)", fontWeight: "800", fontSize: 15 }}>Envoyer le signalement</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
