import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export default function RoleScreen() {
  const { session, setProfile } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");

  async function refreshProfile() {
    const { data } = await supabase.from("profiles").select("*").eq("id", session!.user.id).single();
    if (data) setProfile(data as any);
  }

  async function chooseClient() {
    if (!session) return;
    setLoading(true);
    await supabase.from("profiles").update({ role: "client" }).eq("id", session.user.id);
    await refreshProfile();
    setLoading(false);
    router.replace("/(onboarding)/styles");
  }

  async function submitInviteCode() {
    if (!session || !inviteCode.trim()) return;
    setInviteError("");
    setLoading(true);
    const { data: ok, error } = await supabase.rpc("claim_artist_invite", { invite_code: inviteCode });
    setLoading(false);
    if (error || !ok) {
      setInviteError("Code invalide ou expiré. Vérifie le code reçu ou contacte-nous.");
      return;
    }
    await refreshProfile();
    router.replace("/(onboarding)/artist-setup");
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
          onPress={chooseClient}
          disabled={loading}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16, padding: 20, marginBottom: 14,
            borderWidth: 1.5, borderColor: "transparent",
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
          {loading && !showInvite ? <ActivityIndicator color="#B8903E" /> : <Ionicons name="chevron-forward" size={20} color="rgba(0,0,0,0.2)" />}
        </TouchableOpacity>

        {/* Tatoueur : uniquement sur invitation — qualité du réseau garantie */}
        <TouchableOpacity
          onPress={() => setShowInvite((v) => !v)}
          style={{
            backgroundColor: showInvite ? "rgba(184,144,62,0.12)" : "#FFFFFF",
            borderRadius: 16, padding: 20,
            borderWidth: 1.5, borderColor: showInvite ? "#B8903E" : "transparent",
            flexDirection: "row", alignItems: "center", gap: 16,
          }}
        >
          <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="color-palette-outline" size={24} color="#B8903E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#1A1A1A", fontWeight: "800", fontSize: 17 }}>Je suis tatoueur·se</Text>
            <Text style={{ color: "#6B6B7A", fontSize: 13, marginTop: 3 }}>Accès sur invitation avec un code</Text>
          </View>
          <Ionicons name={showInvite ? "chevron-up" : "chevron-forward"} size={20} color="rgba(0,0,0,0.2)" />
        </TouchableOpacity>

        {showInvite && (
          <View style={{ marginTop: 14 }}>
            <TextInput
              value={inviteCode}
              onChangeText={(t) => { setInviteCode(t); setInviteError(""); }}
              placeholder="Code d'invitation (ex : A1B2C3D4)"
              placeholderTextColor="rgba(0,0,0,0.2)"
              autoCapitalize="characters"
              autoCorrect={false}
              style={{ backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: "#1A1A1A", fontSize: 16, letterSpacing: 2, fontWeight: "700", borderWidth: 1, borderColor: inviteError ? "#D93535" : "rgba(0,0,0,0.1)", textAlign: "center" }}
            />
            {inviteError ? (
              <Text style={{ color: "#D93535", fontSize: 13, marginTop: 8, textAlign: "center" }}>{inviteError}</Text>
            ) : (
              <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 8, textAlign: "center" }}>
                INK est sur invitation pour les artistes : chaque profil est vérifié.
              </Text>
            )}
            <TouchableOpacity
              onPress={submitInviteCode}
              disabled={loading || !inviteCode.trim()}
              style={{ marginTop: 12, backgroundColor: inviteCode.trim() ? "#B8903E" : "rgba(0,0,0,0.06)", borderRadius: 14, paddingVertical: 15, alignItems: "center" }}
            >
              {loading ? <ActivityIndicator color="#F5F3EE" /> : (
                <Text style={{ color: inviteCode.trim() ? "#F5F3EE" : "rgba(0,0,0,0.2)", fontWeight: "800", fontSize: 15 }}>Activer mon compte artiste</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
