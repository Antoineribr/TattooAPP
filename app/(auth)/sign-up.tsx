import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Link, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signUp() {
    setError("");
    if (!displayName.trim()) { setError("Entre ton prénom ou pseudo"); return; }
    setLoading(true);
    const username = displayName.trim().toLowerCase().replace(/\s+/g, "_") + "_" + Math.random().toString(36).slice(2, 6);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName.trim(), username } },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.replace("/(onboarding)/role");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: "#F5F3EE" }}
    >
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
        {router.canGoBack() && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ position: "absolute", top: 56, left: 20, zIndex: 10, padding: 8 }}
          >
            <Text style={{ color: "#6B6B7A", fontSize: 15 }}>✕ Fermer</Text>
          </TouchableOpacity>
        )}
        <Text style={{ color: "#B8903E", fontSize: 40, fontWeight: "800", letterSpacing: 6, textAlign: "center", marginBottom: 6 }}>INK</Text>
        <Text style={{ color: "#6B6B7A", fontSize: 14, textAlign: "center", marginBottom: 36 }}>Rejoins la communauté</Text>

        {error ? (
          <View style={{ backgroundColor: "rgba(217,53,53,0.08)", borderWidth: 0.5, borderColor: "rgba(217,53,53,0.3)", borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <Text style={{ color: "#D93535", fontSize: 13, textAlign: "center" }}>{error}</Text>
          </View>
        ) : null}

        <View className="gap-3">
          <TextInput
            style={{ backgroundColor: "rgba(255,255,255,0.8)", color: "#1A1A1A", borderRadius: 14, paddingHorizontal: 16, height: 50, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.1)", fontSize: 15 }}
            placeholder="Prénom ou pseudo"
            placeholderTextColor="#6B6B7A"
            value={displayName}
            onChangeText={setDisplayName}
          />
          <TextInput
            style={{ backgroundColor: "rgba(255,255,255,0.8)", color: "#1A1A1A", borderRadius: 14, paddingHorizontal: 16, height: 50, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.1)", fontSize: 15 }}
            placeholder="Email"
            placeholderTextColor="#6B6B7A"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={{ backgroundColor: "rgba(255,255,255,0.8)", color: "#1A1A1A", borderRadius: 14, paddingHorizontal: 16, height: 50, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.1)", fontSize: 15 }}
            placeholder="Mot de passe (8 caractères min)"
            placeholderTextColor="#6B6B7A"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          onPress={signUp}
          disabled={loading}
          style={{ backgroundColor: "#B8903E", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 20 }}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
            {loading ? "Création..." : "Créer mon compte"}
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6 gap-1">
          <Text className="text-muted text-sm">Déjà un compte ?</Text>
          <Link href="/(auth)/sign-in">
            <Text className="text-gold text-sm font-medium"> Se connecter</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
