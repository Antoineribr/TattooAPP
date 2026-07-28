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
      style={{ flex: 1, backgroundColor: "#0A0A0B" }}
    >
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          style={{ position: "absolute", top: 56, left: 20, zIndex: 10, padding: 8 }}
        >
          <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 15 }}>✕ Fermer</Text>
        </TouchableOpacity>
        <Text style={{ color: "#C9A24B", fontSize: 40, fontWeight: "800", letterSpacing: 6, textAlign: "center", marginBottom: 6 }}>INK</Text>
        <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 14, textAlign: "center", marginBottom: 36 }}>Découvre les meilleurs tatoueurs</Text>

        {error ? (
          <View style={{ backgroundColor: "rgba(217,53,53,0.12)", borderWidth: 0.5, borderColor: "rgba(217,53,53,0.3)", borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <Text style={{ color: "#E55353", fontSize: 13, textAlign: "center" }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ gap: 12 }}>
          <TextInput
            style={{ backgroundColor: "rgba(244,241,234,0.08)", color: "#F4F1EA", borderRadius: 14, paddingHorizontal: 16, height: 50, borderWidth: 0.5, borderColor: "rgba(244,241,234,0.12)", fontSize: 15 }}
            placeholder="Email"
            placeholderTextColor="rgba(244,241,234,0.28)"
            accessibilityLabel="Adresse email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={{ backgroundColor: "rgba(244,241,234,0.08)", color: "#F4F1EA", borderRadius: 14, paddingHorizontal: 16, height: 50, borderWidth: 0.5, borderColor: "rgba(244,241,234,0.12)", fontSize: 15 }}
            placeholder="Mot de passe"
            placeholderTextColor="rgba(244,241,234,0.28)"
            accessibilityLabel="Mot de passe"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          onPress={signIn}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Se connecter"
          style={{ backgroundColor: "#C9A24B", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 20 }}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#0A0A0B", fontWeight: "700", fontSize: 16 }}>
            {loading ? "Connexion..." : "Se connecter"}
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24, gap: 4 }}>
          <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 14 }}>Pas encore de compte ?</Text>
          <Link href="/(auth)/sign-up">
            <Text style={{ color: "#C9A24B", fontSize: 14, fontWeight: "600" }}> Créer un compte</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
