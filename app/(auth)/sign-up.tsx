import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Plateforme liée au corps et à des mineurs potentiels : majorité + consentement requis
  const [isAdult, setIsAdult] = useState(false);
  const [acceptsTerms, setAcceptsTerms] = useState(false);

  async function signUp() {
    setError("");
    if (!displayName.trim()) { setError("Entre ton prénom ou pseudo"); return; }
    if (!isAdult) { setError("Tu dois avoir 18 ans ou plus pour créer un compte."); return; }
    if (!acceptsTerms) { setError("Accepte les CGU et la politique de confidentialité pour continuer."); return; }
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
        {/* Toujours proposer une sortie : retour arrière si possible, sinon feed */}
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          style={{ position: "absolute", top: 56, left: 20, zIndex: 10, padding: 8 }}
        >
          <Text style={{ color: "#6B6B7A", fontSize: 15 }}>✕ Fermer</Text>
        </TouchableOpacity>
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

        {/* Majorité + consentement — requis pour une plateforme tattoo */}
        <View style={{ gap: 12, marginTop: 18 }}>
          <Checkbox
            checked={isAdult}
            onToggle={() => setIsAdult((v) => !v)}
            label="Je certifie avoir 18 ans ou plus."
          />
          <TouchableOpacity onPress={() => setAcceptsTerms((v) => !v)} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <Box checked={acceptsTerms} />
            <Text style={{ flex: 1, color: "#6B6B7A", fontSize: 13, lineHeight: 19 }}>
              J'accepte les{" "}
              <Text style={{ color: "#B8903E", fontWeight: "600" }} onPress={() => router.push("/legal/cgu" as any)}>CGU</Text>
              {" "}et la{" "}
              <Text style={{ color: "#B8903E", fontWeight: "600" }} onPress={() => router.push("/legal/confidentialite" as any)}>politique de confidentialité</Text>.
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={signUp}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Créer mon compte"
          style={{ backgroundColor: (isAdult && acceptsTerms) ? "#B8903E" : "rgba(184,144,62,0.4)", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 20 }}
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

function Box({ checked }: { checked: boolean }) {
  return (
    <View style={{
      width: 22, height: 22, borderRadius: 6, marginTop: 1,
      borderWidth: 1.5, borderColor: checked ? "#B8903E" : "rgba(0,0,0,0.2)",
      backgroundColor: checked ? "#B8903E" : "transparent",
      alignItems: "center", justifyContent: "center",
    }}>
      {checked && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
    </View>
  );
}

function Checkbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7} accessibilityRole="checkbox" accessibilityState={{ checked }} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
      <Box checked={checked} />
      <Text style={{ flex: 1, color: "#6B6B7A", fontSize: 13, lineHeight: 19 }}>{label}</Text>
    </TouchableOpacity>
  );
}
