import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Link, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.replace("/(tabs)");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: "#F5F3EE" }}
    >
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
        {/* Toujours proposer une sortie : retour arrière si possible, sinon feed */}
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          style={{ position: "absolute", top: 56, left: 20, zIndex: 10, padding: 8 }}
        >
          <Text style={{ color: "#6B6B7A", fontSize: 15 }}>✕ Fermer</Text>
        </TouchableOpacity>
        <Text style={{ color: "#B8903E", fontSize: 40, fontWeight: "800", letterSpacing: 6, textAlign: "center", marginBottom: 6 }}>INK</Text>
        <Text style={{ color: "#6B6B7A", fontSize: 14, textAlign: "center", marginBottom: 36 }}>Découvre les meilleurs tatoueurs</Text>

        {error ? (
          <View style={{ backgroundColor: "rgba(217,53,53,0.08)", borderWidth: 0.5, borderColor: "rgba(217,53,53,0.3)", borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <Text style={{ color: "#D93535", fontSize: 13, textAlign: "center" }}>{error}</Text>
          </View>
        ) : null}

        <View className="gap-3">
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
            placeholder="Mot de passe"
            placeholderTextColor="#6B6B7A"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          onPress={signIn}
          disabled={loading}
          style={{ backgroundColor: "#B8903E", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 20 }}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
            {loading ? "Connexion..." : "Se connecter"}
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6 gap-1">
          <Text className="text-muted text-sm">Pas encore de compte ?</Text>
          <Link href="/(auth)/sign-up">
            <Text className="text-gold text-sm font-medium"> Créer un compte</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
