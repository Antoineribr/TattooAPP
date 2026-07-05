import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/useAuthStore";

const SEEN_KEY = "ink_welcome_seen_v1";

// Pitch de venue : pourquoi INK plutôt qu'Instagram, en 5 secondes
export function WelcomeIntro() {
  const { session } = useAuthStore();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (session) return; // visiteurs uniquement
    AsyncStorage.getItem(SEEN_KEY).then((seen) => {
      if (!seen) setVisible(true);
    });
  }, [session]);

  function dismiss() {
    AsyncStorage.setItem(SEEN_KEY, "1");
    setVisible(false);
  }

  function signUp() {
    dismiss();
    router.push("/(auth)/sign-up");
  }

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: "rgba(10,10,11,0.92)", justifyContent: "center", paddingHorizontal: 28 }}>
        <Text style={{ color: "#C9A24B", fontSize: 38, fontWeight: "800", letterSpacing: 8, textAlign: "center" }}>INK</Text>
        <Text style={{ color: "#F4F1EA", fontSize: 21, fontWeight: "800", textAlign: "center", marginTop: 18, lineHeight: 30 }}>
          Trouve le bon tatoueur.{"\n"}Pas juste de l'inspiration.
        </Text>

        <View style={{ marginTop: 36, gap: 20 }}>
          {([
            ["radio-button-on", "Disponibilités en temps réel", "Tu vois qui est ouvert aux projets, en liste d'attente ou en guest spot près de chez toi."],
            ["color-palette-outline", "Demandes qualifiées", "Budget, taille, emplacement, références : ton projet arrive complet, le tatoueur répond sérieusement."],
            ["shield-checkmark-outline", "Artistes sur invitation", "Chaque profil est invité et vérifié. Les avis viennent de projets réellement terminés."],
          ] as const).map(([icon, title, body]) => (
            <View key={title} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(201,162,75,0.14)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(201,162,75,0.3)" }}>
                <Ionicons name={icon as any} size={19} color="#C9A24B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#F4F1EA", fontWeight: "700", fontSize: 15 }}>{title}</Text>
                <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 13, lineHeight: 19, marginTop: 3 }}>{body}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={dismiss} style={{ marginTop: 40, backgroundColor: "#C9A24B", borderRadius: 14, paddingVertical: 16, alignItems: "center" }}>
          <Text style={{ color: "#0A0A0B", fontWeight: "800", fontSize: 16 }}>Explorer le feed</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={signUp} style={{ marginTop: 12, paddingVertical: 12, alignItems: "center" }}>
          <Text style={{ color: "rgba(244,241,234,0.7)", fontSize: 14 }}>Créer un compte</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
