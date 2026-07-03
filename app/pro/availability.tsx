import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { ArtistAvailability, ArtistAvailabilityStatus, AVAILABILITY_STATUS_LABELS } from "@/types/database";

const STATUS_ICONS: Record<ArtistAvailabilityStatus, string> = {
  open: "checkmark-circle-outline",
  waitlist: "time-outline",
  full: "close-circle-outline",
  flash_only: "flash-outline",
  guest_spot_soon: "airplane-outline",
};

const STATUS_COLORS: Record<ArtistAvailabilityStatus, string> = {
  open: "#27AE60",
  waitlist: "#FF8C42",
  full: "#E74C3C",
  flash_only: "#C9A24B",
  guest_spot_soon: "#4B9AC9",
};

export default function AvailabilityScreen() {
  const { session } = useAuthStore();
  const router = useRouter();
  const [availabilities, setAvailabilities] = useState<ArtistAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ArtistAvailabilityStatus>("open");
  const [note, setNote] = useState("");

  useEffect(() => { if (session) fetchAvailabilities(); }, [session]);

  async function fetchAvailabilities() {
    setLoading(true);
    const { data } = await supabase.from("artist_availability").select("*").eq("artist_id", session!.user.id).order("created_at");
    setAvailabilities(data ?? []);
    setLoading(false);
  }

  async function handleAdd() {
    const exists = availabilities.find((a) => a.status === selectedStatus);
    if (exists) { Alert.alert("Statut déjà actif", "Ce statut est déjà dans ta liste."); return; }
    setSaving(true);
    const { error } = await supabase.from("artist_availability").insert({
      artist_id: session!.user.id,
      status: selectedStatus,
      note: note.trim() || null,
    });
    setSaving(false);
    if (error) { Alert.alert("Erreur", error.message); return; }
    setNote("");
    fetchAvailabilities();
  }

  async function handleDelete(id: string) {
    await supabase.from("artist_availability").delete().eq("id", id);
    fetchAvailabilities();
  }

  const activeStatuses = availabilities.map((a) => a.status);

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE" }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#B8903E", fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>Profil pro</Text>
          <Text style={{ color: "#1A1A1A", fontSize: 20, fontWeight: "800" }}>Disponibilités</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Statuts actifs */}
        {loading ? (
          <ActivityIndicator color="#B8903E" />
        ) : availabilities.length > 0 ? (
          <View style={{ gap: 10, marginBottom: 8 }}>
            <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 14 }}>Statuts actifs</Text>
            {availabilities.map((av) => (
              <View key={av.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${STATUS_COLORS[av.status]}18`, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={STATUS_ICONS[av.status] as any} size={18} color={STATUS_COLORS[av.status]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 13 }}>{AVAILABILITY_STATUS_LABELS[av.status]}</Text>
                  {av.note && <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 2 }}>{av.note}</Text>}
                </View>
                <TouchableOpacity onPress={() => handleDelete(av.id)}>
                  <Ionicons name="close-circle-outline" size={22} color="rgba(0,0,0,0.25)" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 20 }}>
            <Text style={{ color: "#6B6B7A", fontSize: 14 }}>Aucun statut actif. Ajoute-en un ci-dessous.</Text>
          </View>
        )}

        {/* Ajouter un statut */}
        <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 14 }}>Ajouter un statut</Text>
        <View style={{ gap: 8 }}>
          {(Object.keys(STATUS_ICONS) as ArtistAvailabilityStatus[]).map((s) => {
            const isActive = activeStatuses.includes(s);
            const isSelected = selectedStatus === s;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => !isActive && setSelectedStatus(s)}
                disabled={isActive}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderRadius: 12, backgroundColor: isActive ? "#F0F0F0" : isSelected ? "rgba(184,144,62,0.1)" : "#FFFFFF", borderWidth: 1.5, borderColor: isSelected && !isActive ? "#B8903E" : "transparent", opacity: isActive ? 0.5 : 1 }}
              >
                <Ionicons name={STATUS_ICONS[s] as any} size={18} color={isActive ? "#999" : STATUS_COLORS[s]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: isActive ? "#999" : "#1A1A1A", fontWeight: "600", fontSize: 13 }}>{AVAILABILITY_STATUS_LABELS[s]}</Text>
                  {isActive && <Text style={{ color: "#27AE60", fontSize: 11 }}>Déjà actif</Text>}
                </View>
                {isSelected && !isActive && <Ionicons name="checkmark-circle" size={18} color="#B8903E" />}
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note optionnelle (ex : re-ouverture en septembre)"
          placeholderTextColor="rgba(0,0,0,0.2)"
          style={{ backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#1A1A1A", fontSize: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" }}
        />

        <TouchableOpacity
          onPress={handleAdd}
          disabled={saving || activeStatuses.includes(selectedStatus)}
          style={{ backgroundColor: activeStatuses.includes(selectedStatus) ? "rgba(0,0,0,0.06)" : "#B8903E", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: activeStatuses.includes(selectedStatus) ? "rgba(0,0,0,0.3)" : "#F5F3EE", fontWeight: "700", fontSize: 15 }}>Activer ce statut</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
