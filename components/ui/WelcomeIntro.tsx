import { useEffect, useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/useAuthStore";
import { useAppViewport } from "@/lib/layout";

const SEEN_KEY = "ink_welcome_seen_v1";
const DESKTOP_DELAY_MS = 60_000;

const POINTS = [
  ["radio-button-on", "Disponibilités réelles", "Trouve les artistes ouverts aux projets près de toi."],
  ["shield-checkmark-outline", "Profils sélectionnés", "Portfolio, styles et avis au même endroit."],
] as const;

export function WelcomeIntro() {
  const { session } = useAuthStore();
  const { isDesktopWeb } = useAppViewport();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (session) {
      setVisible(false);
      return;
    }

    AsyncStorage.getItem(SEEN_KEY).then((seen) => {
      if (cancelled || seen) return;
      if (isDesktopWeb) {
        timer = setTimeout(() => setVisible(true), DESKTOP_DELAY_MS);
      } else {
        setVisible(true);
      }
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isDesktopWeb, session]);

  function dismiss() {
    AsyncStorage.setItem(SEEN_KEY, "1").catch(() => {});
    setVisible(false);
  }

  function signUp() {
    dismiss();
    router.push("/(auth)/sign-up");
  }

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType={isDesktopWeb ? "fade" : "slide"}
      onRequestClose={dismiss}
      accessibilityViewIsModal
    >
      <View style={{ flex: 1, justifyContent: isDesktopWeb ? "center" : "flex-end", alignItems: "center" }}>
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Fermer la présentation"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(5,5,7,0.58)" }}
        />

        <View
          style={{
            width: isDesktopWeb ? 430 : "100%",
            maxWidth: 430,
            backgroundColor: "#111113",
            borderRadius: isDesktopWeb ? 26 : 0,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderWidth: 1,
            borderColor: "rgba(201,162,75,0.24)",
            paddingHorizontal: 24,
            paddingTop: 22,
            paddingBottom: isDesktopWeb ? 22 : 34,
            shadowColor: "#000",
            shadowOpacity: 0.55,
            shadowRadius: 32,
            shadowOffset: { width: 0, height: 18 },
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: "#C9A24B", fontSize: 22, fontWeight: "900", letterSpacing: 6 }}>INK</Text>
            <Pressable
              onPress={dismiss}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              hitSlop={12}
              style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              <Ionicons name="close" size={20} color="rgba(244,241,234,0.76)" />
            </Pressable>
          </View>

          <Text style={{ color: "#F4F1EA", fontSize: 23, lineHeight: 29, fontWeight: "800", marginTop: 18 }}>
            Ton prochain tatouage commence ici.
          </Text>
          <Text style={{ color: "rgba(244,241,234,0.58)", fontSize: 14, lineHeight: 20, marginTop: 7 }}>
            Passe de l’inspiration à un vrai projet avec le bon artiste.
          </Text>

          <View style={{ marginTop: 22, gap: 16 }}>
            {POINTS.map(([icon, title, body]) => (
              <View key={title} style={{ flexDirection: "row", gap: 13, alignItems: "center" }}>
                <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(201,162,75,0.12)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={icon} size={19} color="#C9A24B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#F4F1EA", fontWeight: "700", fontSize: 14 }}>{title}</Text>
                  <Text style={{ color: "rgba(244,241,234,0.5)", fontSize: 12.5, lineHeight: 18, marginTop: 2 }}>{body}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable
            onPress={signUp}
            accessibilityRole="button"
            accessibilityLabel="Créer un compte INK"
            style={{ marginTop: 24, height: 48, borderRadius: 14, backgroundColor: "#C9A24B", alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "#0A0A0B", fontWeight: "800", fontSize: 15 }}>Créer mon compte</Text>
          </Pressable>
          <Pressable
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel="Continuer sans compte"
            style={{ height: 42, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "rgba(244,241,234,0.62)", fontSize: 13.5 }}>Continuer sans compte</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
