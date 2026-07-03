import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { ArtistLocation, ArtistLocationType } from "@/types/database";

const TYPE_LABELS: Record<ArtistLocationType, { label: string; icon: string; desc: string }> = {
  studio: { label: "Studio", icon: "business-outline", desc: "Adresse fixe où tu travailles" },
  home: { label: "À domicile", icon: "home-outline", desc: "Tu reçois les clients chez toi" },
  guest_spot: { label: "Guest spot", icon: "airplane-outline", desc: "Passage dans un autre studio" },
};

export default function LocationsScreen() {
  const { session } = useAuthStore();
  const router = useRouter();
  const [locations, setLocations] = useState<ArtistLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [type, setType] = useState<ArtistLocationType>("studio");
  const [studioName, setStudioName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [isAddressPublic, setIsAddressPublic] = useState(false);
  const [guestStart, setGuestStart] = useState("");
  const [guestEnd, setGuestEnd] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { if (session) fetchLocations(); }, [session]);

  async function fetchLocations() {
    setLoading(true);
    const { data } = await supabase.from("artist_locations").select("*").eq("artist_id", session!.user.id).order("created_at");
    setLocations(data ?? []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!city.trim()) { Alert.alert("Ville requise"); return; }
    setAdding(true);
    const { error } = await supabase.from("artist_locations").insert({
      artist_id: session!.user.id,
      type,
      studio_name: studioName.trim() || null,
      city: city.trim(),
      address: address.trim() || null,
      is_address_public: isAddressPublic,
      guest_spot_start: guestStart || null,
      guest_spot_end: guestEnd || null,
    });
    setAdding(false);
    if (error) { Alert.alert("Erreur", error.message); return; }
    setShowForm(false);
    resetForm();
    fetchLocations();
  }

  async function handleDelete(id: string) {
    Alert.alert("Supprimer ce lieu ?", "", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        await supabase.from("artist_locations").delete().eq("id", id);
        fetchLocations();
      }},
    ]);
  }

  function resetForm() {
    setType("studio"); setStudioName(""); setCity(""); setAddress("");
    setIsAddressPublic(false); setGuestStart(""); setGuestEnd("");
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE" }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#B8903E", fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>Profil pro</Text>
          <Text style={{ color: "#1A1A1A", fontSize: 20, fontWeight: "800" }}>Mes lieux</Text>
        </View>
        <TouchableOpacity onPress={() => setShowForm((v) => !v)} style={{ backgroundColor: "#B8903E", borderRadius: 10, padding: 8 }}>
          <Ionicons name={showForm ? "close" : "add"} size={20} color="#F5F3EE" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 12 }}>
        {/* Formulaire ajout */}
        {showForm && (
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 8, gap: 12 }}>
            <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 15, marginBottom: 4 }}>Ajouter un lieu</Text>

            {/* Type */}
            <View style={{ gap: 8 }}>
              {(Object.entries(TYPE_LABELS) as [ArtistLocationType, typeof TYPE_LABELS[keyof typeof TYPE_LABELS]][]).map(([key, val]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setType(key)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, backgroundColor: type === key ? "rgba(184,144,62,0.1)" : "#F5F3EE", borderWidth: 1.5, borderColor: type === key ? "#B8903E" : "transparent" }}
                >
                  <Ionicons name={val.icon as any} size={18} color={type === key ? "#B8903E" : "#6B6B7A"} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: type === key ? "#B8903E" : "#1A1A1A", fontWeight: "600", fontSize: 13 }}>{val.label}</Text>
                    <Text style={{ color: "#6B6B7A", fontSize: 11 }}>{val.desc}</Text>
                  </View>
                  {type === key && <Ionicons name="checkmark-circle" size={18} color="#B8903E" />}
                </TouchableOpacity>
              ))}
            </View>

            {type === "studio" && (
              <TextInput value={studioName} onChangeText={setStudioName} placeholder="Nom du studio (optionnel)" placeholderTextColor="rgba(0,0,0,0.2)"
                style={{ backgroundColor: "#F5F3EE", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, color: "#1A1A1A", fontSize: 14 }} />
            )}

            <TextInput value={city} onChangeText={setCity} placeholder="Ville *" placeholderTextColor="rgba(0,0,0,0.2)"
              style={{ backgroundColor: "#F5F3EE", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, color: "#1A1A1A", fontSize: 14 }} />

            <TextInput value={address} onChangeText={setAddress} placeholder="Adresse (optionnel)" placeholderTextColor="rgba(0,0,0,0.2)"
              style={{ backgroundColor: "#F5F3EE", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, color: "#1A1A1A", fontSize: 14 }} />

            {address.trim() !== "" && (
              <TouchableOpacity onPress={() => setIsAddressPublic((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: isAddressPublic ? "#B8903E" : "transparent", borderWidth: 2, borderColor: isAddressPublic ? "#B8903E" : "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" }}>
                  {isAddressPublic && <Ionicons name="checkmark" size={12} color="#FFF" />}
                </View>
                <Text style={{ color: "#6B6B7A", fontSize: 13 }}>Afficher l'adresse sur mon profil</Text>
              </TouchableOpacity>
            )}

            {type === "guest_spot" && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput value={guestStart} onChangeText={setGuestStart} placeholder="Début (JJ/MM/AAAA)" placeholderTextColor="rgba(0,0,0,0.2)"
                  style={{ flex: 1, backgroundColor: "#F5F3EE", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: "#1A1A1A", fontSize: 13 }} />
                <TextInput value={guestEnd} onChangeText={setGuestEnd} placeholder="Fin (JJ/MM/AAAA)" placeholderTextColor="rgba(0,0,0,0.2)"
                  style={{ flex: 1, backgroundColor: "#F5F3EE", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: "#1A1A1A", fontSize: 13 }} />
              </View>
            )}

            <TouchableOpacity onPress={handleAdd} disabled={adding} style={{ backgroundColor: "#B8903E", borderRadius: 12, paddingVertical: 13, alignItems: "center" }}>
              {adding ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#F5F3EE", fontWeight: "700", fontSize: 14 }}>Ajouter ce lieu</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Liste des lieux */}
        {loading ? (
          <ActivityIndicator color="#B8903E" style={{ marginTop: 40 }} />
        ) : locations.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Ionicons name="location-outline" size={48} color="rgba(0,0,0,0.15)" />
            <Text style={{ color: "#6B6B7A", fontSize: 15, marginTop: 12, textAlign: "center" }}>Aucun lieu ajouté</Text>
            <Text style={{ color: "rgba(0,0,0,0.3)", fontSize: 13, textAlign: "center", marginTop: 4 }}>Tes clients verront où tu travailles</Text>
          </View>
        ) : (
          locations.map((loc) => (
            <View key={loc.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(184,144,62,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={TYPE_LABELS[loc.type].icon as any} size={20} color="#B8903E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 14 }}>
                  {loc.studio_name ?? TYPE_LABELS[loc.type].label}
                </Text>
                <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 2 }}>{loc.city}</Text>
                {loc.type === "guest_spot" && loc.guest_spot_start && (
                  <Text style={{ color: "#B8903E", fontSize: 11, marginTop: 2 }}>
                    {loc.guest_spot_start} → {loc.guest_spot_end ?? "?"}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => handleDelete(loc.id)}>
                <Ionicons name="trash-outline" size={20} color="rgba(0,0,0,0.25)" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
