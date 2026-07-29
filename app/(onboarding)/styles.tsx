import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

const { width: W } = Dimensions.get("window");

const STYLES = [
  { label: "Blackwork", emoji: "🖤", desc: "Encre noire, géométrie, tribal" },
  { label: "Fine line", emoji: "✨", desc: "Trait fin, délicat, précis" },
  { label: "Réalisme", emoji: "🎨", desc: "Portraits, nature morte, photo" },
  { label: "Japonais", emoji: "🐉", desc: "Carpe koi, dragon, sakura" },
  { label: "Watercolor", emoji: "🌊", desc: "Aquarelle, couleurs vives" },
  { label: "Dotwork", emoji: "⚫", desc: "Points, mandala, ombres" },
  { label: "Old school", emoji: "⚓", desc: "Traditionnel américain" },
  { label: "Minimaliste", emoji: "🤍", desc: "Simple, épuré, discret" },
  { label: "Neo-trad", emoji: "🌹", desc: "Moderne, couleurs, contours" },
  { label: "Lettering", emoji: "✍️", desc: "Texte, calligraphie, script" },
  { label: "Illustratif", emoji: "🖼️", desc: "BD, cartoon, créatif" },
  { label: "Géométrique", emoji: "🔺", desc: "Formes, symétrie, abstrait" },
];

export default function StylesOnboarding() {
  const { session, setProfile } = useAuthStore();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggle(label: string) {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  }

  async function handleContinue() {
    if (!session) return;
    setLoading(true);
    const tags = selected.map((s) => s.toLowerCase());
    await supabase
      .from("profiles")
      .update({ style_tags: tags })
      .eq("id", session.user.id);

    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (data) setProfile(data as any);
    router.replace("/(tabs)");
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0B" }}>
      {/* Header */}
      <View style={{ paddingTop: 70, paddingHorizontal: 24, paddingBottom: 24 }}>
        <Text style={{ color: "#C9A24B", fontSize: 13, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>
          Ton board
        </Text>
        <Text style={{ color: "#F4F1EA", fontSize: 28, fontWeight: "800", marginTop: 6, lineHeight: 34 }}>
          Quels styles{"\n"}t'inspirent ?
        </Text>
        <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 15, marginTop: 10, lineHeight: 22 }}>
          On personnalise ton feed selon tes goûts. Tu pourras changer ça plus tard.
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {STYLES.map((s) => {
            const active = selected.includes(s.label);
            return (
              <TouchableOpacity
                key={s.label}
                onPress={() => toggle(s.label)}
                activeOpacity={0.8}
                style={{
                  width: (W - 42) / 2,
                  borderRadius: 16,
                  overflow: "hidden",
                  borderWidth: 2,
                  borderColor: active ? "#C9A24B" : "transparent",
                }}
              >
                <View style={{ padding: 16, backgroundColor: active ? "rgba(184,144,62,0.08)" : "#17171A" }}>
                  <Text style={{ fontSize: 28, marginBottom: 8 }}>{s.emoji}</Text>
                  <Text style={{ color: active ? "#C9A24B" : "#F4F1EA", fontWeight: "700", fontSize: 16 }}>{s.label}</Text>
                  <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 12, marginTop: 3 }}>{s.desc}</Text>
                  {active && (
                    <View style={{ position: "absolute", top: 10, right: 10, backgroundColor: "#C9A24B", borderRadius: 12, width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#0A0A0B", fontSize: 13, fontWeight: "800" }}>✓</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bouton fixe en bas */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 40 }}>
        <View
          style={{ position: "absolute", top: -40, left: 0, right: 0, height: 80 }}
          pointerEvents="none"
        />
        <TouchableOpacity
          onPress={selected.length ? handleContinue : () => router.replace("/(tabs)")}
          disabled={loading}
          style={{
            backgroundColor: selected.length ? "#C9A24B" : "#17171A",
            borderRadius: 16, paddingVertical: 17,
            alignItems: "center",
          }}
        >
          {loading ? <ActivityIndicator color="#0A0A0B" /> : (
            <Text style={{ color: selected.length ? "#0A0A0B" : "#6B6B7A", fontWeight: "800", fontSize: 17 }}>
              {selected.length ? `Continuer (${selected.length} style${selected.length > 1 ? "s" : ""})` : "Passer cette étape"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
