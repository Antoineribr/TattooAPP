import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export default function RoleScreen() {
  const { session, setProfile } = useAuthStore();
  const router = useRouter();
  const [selected, setSelected] = useState<"client" | "artist" | null>(null);
  const [loading, setLoading] = useState(false);

  async function chooseRole(role: "client" | "artist") {
    if (!session) return;
    setSelected(role);
    setLoading(true);
    await supabase.from("profiles").update({ role }).eq("id", session.user.id);
    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (data) setProfile(data as any);
    setLoading(false);

    if (role === "client") router.replace("/(onboarding)/styles");
    else router.replace("/(onboarding)/artist-setup");
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE" }}>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
        <Text style={{ color: "#B8903E", fontSize: 12, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Bienvenue sur INK</Text>
        <Text style={{ color: "#1A1A1A", fontSize: 30, fontWeight: "800", marginBottom: 8 }}>Qui es-tu ?</Text>
        <Text style={{ color: "#6B6B7A", fontSize: 16, lineHeight: 24, marginBottom: 40 }}>
          Choisis ton profil pour personnaliser ton expérience.
        </Text>

        <TouchableOpacity
          onPress={() => chooseRole("client")}
          style={{
            backgroundColor: selected === "client" ? "rgba(184,144,62,0.12)" : "#FFFFFF",
            borderRadius: 16, padding: 20, marginBottom: 14,
            borderWidth: 1.5, borderColor: selected === "client" ? "#B8903E" : "transparent",
            flexDirection: "row", alignItems: "center", gap: 16,
          }}
        >
          <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="search-outline" size={24} color="#B8903E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#1A1A1A", fontWeight: "800", fontSize: 17 }}>Je cherche un tatoueur</Text>
            <Text style={{ color: "#6B6B7A", fontSize: 13, marginTop: 3 }}>Inspiration, découverte et projets</Text>
          </View>
          {selected === "client" && <Ionicons name="checkmark-circle" size={24} color="#B8903E" />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => chooseRole("artist")}
          style={{
            backgroundColor: selected === "artist" ? "rgba(184,144,62,0.12)" : "#FFFFFF",
            borderRadius: 16, padding: 20, marginBottom: 14,
            borderWidth: 1.5, borderColor: selected === "artist" ? "#B8903E" : "transparent",
            flexDirection: "row", alignItems: "center", gap: 16,
          }}
        >
          <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="color-palette-outline" size={24} color="#B8903E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#1A1A1A", fontWeight: "800", fontSize: 17 }}>Je suis tatoueur·se</Text>
            <Text style={{ color: "#6B6B7A", fontSize: 13, marginTop: 3 }}>Partage ton travail et reçois des demandes</Text>
          </View>
          {selected === "artist" && <Ionicons name="checkmark-circle" size={24} color="#B8903E" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}
