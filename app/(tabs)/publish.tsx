import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { SIZE_LABELS, SizeCategory } from "@/types/database";
import { STYLES_LIST } from "@/lib/config";
import { getAppViewport } from "@/lib/layout";

const { width: W } = getAppViewport(Dimensions.get("window"));

type MediaAsset = { uri: string; type: "image" | "video" };

const CREATION_TYPES = [
  {
    value: "flash",
    label: "Flash",
    icon: "flash",
    desc: "Design disponible à la réservation",
  },
  {
    value: "custom",
    label: "Projet sur mesure",
    icon: "color-palette",
    desc: "Projet entièrement personnalisé",
  },
] as const;

export default function PublishScreen() {
  const { session, profile } = useAuthStore();
  const router = useRouter();

  const [medias, setMedias] = useState<MediaAsset[]>([]);
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState(profile?.city ?? "");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [sizeCategory, setSizeCategory] = useState<SizeCategory | "">("");
  const [duration, setDuration] = useState("");
  const [priceType, setPriceType] = useState<"fixed" | "range" | "on_quote">("on_quote");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [creationType, setCreationType] = useState<"flash" | "custom">("flash");
  const [certified, setCertified] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  async function pickMedia() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission requise", "Autorise l'accès à ta galerie dans les réglages.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 10,
    });
    if (!result.canceled) {
      const assets = result.assets.map((a) => ({
        uri: a.uri,
        type: (a.type as "image" | "video") ?? "image",
      }));
      const sorted = [...assets].sort((a, b) => (a.type === "video" ? -1 : b.type === "video" ? 1 : 0));
      setMedias((prev) => [...prev, ...sorted].slice(0, 10));
    }
  }

  async function uploadMedia(asset: MediaAsset): Promise<string> {
    const ext = asset.uri.split(".").pop() ?? (asset.type === "video" ? "mp4" : "jpg");
    const path = `posts/${session!.user.id}/${Date.now()}.${ext}`;
    const fd = new FormData();
    fd.append("file", { uri: asset.uri, name: `media.${ext}`, type: asset.type === "video" ? `video/${ext}` : `image/${ext}` } as any);
    const { error } = await supabase.storage.from("posts").upload(path, fd, { upsert: true });
    if (error) throw error;
    return supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
  }

  function validate() {
    if (!medias.length) { Alert.alert("Ajoute au moins un média"); return false; }
    if (!selectedStyles.length) { Alert.alert("Sélectionne au moins 1 style"); return false; }
    if (!city.trim()) { Alert.alert("Indique une ville"); return false; }
    return true;
  }

  async function buildPayload(urls: string[]) {
    const mainMedia = medias[0];
    return {
      artist_id: session!.user.id,
      media_url: urls[0],
      media_type: mainMedia.type,
      media_urls: urls.slice(1),
      title: title.trim() || null,
      caption: caption.trim() || null,
      city: city.trim() || null,
      style_tags: selectedStyles,
      size_category: sizeCategory || null,
      duration_minutes: duration ? parseInt(duration) : null,
      price_type: priceType,
      price_min: priceMin ? parseInt(priceMin) : null,
      price_max: priceMax ? parseInt(priceMax) : null,
      creation_type: creationType,
      availability_type: creationType === "flash" ? "flash_available" : "commission",
      certified_owner: certified,
      comments_enabled: false,
    };
  }

  async function handlePublish() {
    if (!validate()) return;
    if (!certified) { Alert.alert("Certification requise", "Tu dois certifier être l'auteur de ce contenu."); return; }
    if (!session) return;
    setPublishing(true);
    try {
      const urls = await Promise.all(medias.map(uploadMedia));
      const payload = { ...await buildPayload(urls), status: "published" };
      const { error } = await supabase.from("posts").insert(payload);
      if (error) throw error;
      Alert.alert("✓ Publié !", "Ton tatouage est maintenant visible dans le feed.", [
        { text: "Voir le feed", onPress: () => { resetForm(); router.replace("/(tabs)"); } },
      ]);
    } catch (e: any) {
      Alert.alert("Erreur", e.message ?? "Impossible de publier");
    } finally {
      setPublishing(false);
    }
  }

  async function handleSaveDraft() {
    if (!medias.length && !caption && !selectedStyles.length) {
      Alert.alert("Brouillon vide", "Ajoute au moins un élément avant de sauvegarder.");
      return;
    }
    if (!session) return;
    setSavingDraft(true);
    try {
      const urls = medias.length ? await Promise.all(medias.map(uploadMedia)) : [""];
      const payload = { ...await buildPayload(urls), status: "draft" };
      const { error } = await supabase.from("posts").insert(payload);
      if (error) throw error;
      Alert.alert("Brouillon sauvegardé", "Tu pourras le retrouver et le publier depuis ton profil.", [
        { text: "OK", onPress: resetForm },
      ]);
    } catch (e: any) {
      Alert.alert("Erreur", e.message ?? "Impossible de sauvegarder");
    } finally {
      setSavingDraft(false);
    }
  }

  function resetForm() {
    setMedias([]); setCaption(""); setTitle(""); setSelectedStyles([]);
    setSizeCategory(""); setDuration(""); setPriceMin(""); setPriceMax("");
    setCreationType("flash"); setCertified(false);
  }

  const canPublish = medias.length > 0 && selectedStyles.length > 0 && city.trim() && certified;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#F5F3EE" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Platform.OS === "ios" ? 200 : 180 }}>
        {/* Header */}
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 }}>
          <Text style={{ color: "#B8903E", fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>Publier</Text>
          <Text style={{ color: "#1A1A1A", fontSize: 24, fontWeight: "800", marginTop: 4 }}>Partage ton travail</Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* Médias */}
          <TouchableOpacity
            onPress={pickMedia}
            style={{
              borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 2,
              borderColor: medias.length ? "#B8903E" : "rgba(0,0,0,0.1)",
              borderStyle: medias.length ? "solid" : "dashed",
              marginBottom: 16, overflow: "hidden",
            }}
          >
            {medias.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ padding: 12 }}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {medias.map((m, i) => (
                    <View key={i} style={{ position: "relative" }}>
                      <Image source={{ uri: m.uri }} style={{ width: 100, height: 100, borderRadius: 10 }} contentFit="cover" />
                      {m.type === "video" && (
                        <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="play-circle" size={30} color="rgba(244,241,234,0.9)" />
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => setMedias((prev) => prev.filter((_, j) => j !== i))}
                        style={{ position: "absolute", top: -6, right: -6, backgroundColor: "#F5F3EE", borderRadius: 10 }}
                      >
                        <Ionicons name="close-circle" size={20} color="#FF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={pickMedia}
                    style={{ width: 100, height: 100, borderRadius: 10, backgroundColor: "#F5F3EE", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", borderStyle: "dashed", alignItems: "center", justifyContent: "center" }}
                  >
                    <Ionicons name="add" size={28} color="#6B6B7A" />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <View style={{ paddingVertical: 48, alignItems: "center" }}>
                <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <Ionicons name="add-circle-outline" size={32} color="#B8903E" />
                </View>
                <Text style={{ color: "#1A1A1A", fontSize: 16, fontWeight: "700" }}>Photo(s) ou vidéo</Text>
                <Text style={{ color: "#6B6B7A", fontSize: 13, marginTop: 4 }}>Sélectionne plusieurs angles</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Type de création */}
          <SectionTitle label="Type de création" />
          <View style={{ gap: 8, marginBottom: 20 }}>
            {CREATION_TYPES.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setCreationType(opt.value)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12,
                  backgroundColor: creationType === opt.value ? "rgba(184,144,62,0.1)" : "#FFFFFF",
                  borderWidth: 1.5, borderColor: creationType === opt.value ? "#B8903E" : "transparent",
                }}
              >
                <Ionicons name={opt.icon as any} size={20} color={creationType === opt.value ? "#B8903E" : "#6B6B7A"} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: creationType === opt.value ? "#B8903E" : "#1A1A1A", fontWeight: "600", fontSize: 14 }}>{opt.label}</Text>
                  <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 1 }}>{opt.desc}</Text>
                </View>
                {creationType === opt.value && <Ionicons name="checkmark-circle" size={20} color="#B8903E" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Styles */}
          <SectionTitle label="Styles (au moins 1)" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {STYLES_LIST.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSelectedStyles((prev) =>
                  prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                )}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: selectedStyles.includes(s) ? "#B8903E" : "#FFFFFF",
                  borderWidth: 1, borderColor: selectedStyles.includes(s) ? "#B8903E" : "rgba(0,0,0,0.1)",
                }}
              >
                <Text style={{ color: selectedStyles.includes(s) ? "#F5F3EE" : "#1A1A1A", fontWeight: "600", fontSize: 13 }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Ville */}
          <SectionTitle label="Ville *" />
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Paris, Lyon, Bordeaux…"
            placeholderTextColor="rgba(0,0,0,0.18)"
            style={{ backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, color: "#1A1A1A", fontSize: 15, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", marginBottom: 20 }}
          />

          {/* Titre (optionnel) */}
          <SectionTitle label="Titre (optionnel)" />
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ex : Dragon japonais cuisse"
            placeholderTextColor="rgba(0,0,0,0.18)"
            style={{ backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, color: "#1A1A1A", fontSize: 15, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", marginBottom: 20 }}
          />

          {/* Description */}
          <SectionTitle label="Description" />
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Technique, durée, anecdote…"
            placeholderTextColor="rgba(0,0,0,0.18)"
            multiline
            style={{ backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, color: "#1A1A1A", fontSize: 15, minHeight: 90, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", marginBottom: 20, textAlignVertical: "top" }}
          />

          {/* Taille (optionnel) */}
          <SectionTitle label="Taille (optionnel)" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {(Object.entries(SIZE_LABELS) as [SizeCategory, string][]).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                onPress={() => setSizeCategory(sizeCategory === key ? "" : key)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: sizeCategory === key ? "#B8903E" : "#FFFFFF", borderWidth: 1, borderColor: sizeCategory === key ? "#B8903E" : "rgba(0,0,0,0.1)" }}
              >
                <Text style={{ color: sizeCategory === key ? "#F5F3EE" : "#1A1A1A", fontSize: 13, fontWeight: "600" }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Durée (optionnel) */}
          <SectionTitle label="Durée en minutes (optionnel)" />
          <TextInput
            value={duration}
            onChangeText={setDuration}
            placeholder="Ex : 120"
            placeholderTextColor="rgba(0,0,0,0.18)"
            keyboardType="number-pad"
            style={{ backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, color: "#1A1A1A", fontSize: 15, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", marginBottom: 20 }}
          />

          {/* Prix (optionnel) */}
          <SectionTitle label="Prix (optionnel)" />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            {([["fixed", "Prix fixe"], ["range", "Fourchette"], ["on_quote", "Sur devis"]] as const).map(([val, lbl]) => (
              <TouchableOpacity
                key={val}
                onPress={() => setPriceType(val)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: priceType === val ? "#B8903E" : "#FFFFFF", borderWidth: 1, borderColor: priceType === val ? "#B8903E" : "rgba(0,0,0,0.1)" }}
              >
                <Text style={{ color: priceType === val ? "#F5F3EE" : "#1A1A1A", fontWeight: "600", fontSize: 12 }}>{lbl}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {priceType !== "on_quote" && (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              <TextInput value={priceMin} onChangeText={setPriceMin} placeholder={priceType === "fixed" ? "Prix (€)" : "Min (€)"} placeholderTextColor="rgba(0,0,0,0.18)" keyboardType="number-pad"
                style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#1A1A1A", fontSize: 15, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" }} />
              {priceType === "range" && (
                <TextInput value={priceMax} onChangeText={setPriceMax} placeholder="Max (€)" placeholderTextColor="rgba(0,0,0,0.18)" keyboardType="number-pad"
                  style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#1A1A1A", fontSize: 15, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" }} />
              )}
            </View>
          )}

          {/* Certification */}
          <TouchableOpacity
            onPress={() => setCertified((v) => !v)}
            style={{
              flexDirection: "row", alignItems: "flex-start", gap: 12,
              backgroundColor: certified ? "rgba(184,144,62,0.08)" : "#FFFFFF",
              borderRadius: 14, padding: 16, marginBottom: 24,
              borderWidth: 1.5, borderColor: certified ? "#B8903E" : "rgba(0,0,0,0.1)",
            }}
          >
            <View style={{
              width: 22, height: 22, borderRadius: 6, marginTop: 1,
              backgroundColor: certified ? "#B8903E" : "transparent",
              borderWidth: 2, borderColor: certified ? "#B8903E" : "rgba(0,0,0,0.2)",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              {certified && <Ionicons name="checkmark" size={13} color="#FFF" />}
            </View>
            <Text style={{ flex: 1, color: certified ? "#B8903E" : "#1A1A1A", fontSize: 13, lineHeight: 20, fontWeight: "500" }}>
              Je certifie être l'auteur de ce tatouage et avoir l'autorisation de publier ce contenu.
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Boutons bas */}
      <View style={{
        position: "absolute", bottom: Platform.OS === "ios" ? 78 : 58, left: 0, right: 0,
        backgroundColor: "#F5F3EE", borderTopWidth: 1, borderTopColor: "#FFFFFF",
        padding: 16, flexDirection: "row", gap: 10,
      }}>
        {/* Brouillon */}
        <TouchableOpacity
          onPress={handleSaveDraft}
          disabled={savingDraft || publishing}
          style={{
            flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: "center",
            backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "rgba(0,0,0,0.1)",
          }}
        >
          {savingDraft
            ? <ActivityIndicator color="#6B6B7A" />
            : <Text style={{ color: "#6B6B7A", fontWeight: "700", fontSize: 14 }}>Brouillon</Text>
          }
        </TouchableOpacity>

        {/* Publier */}
        <TouchableOpacity
          onPress={handlePublish}
          disabled={publishing || savingDraft || !canPublish}
          style={{
            flex: 2, backgroundColor: canPublish ? "#B8903E" : "rgba(0,0,0,0.06)",
            borderRadius: 14, paddingVertical: 15, alignItems: "center",
          }}
        >
          {publishing
            ? <ActivityIndicator color="#F5F3EE" />
            : <Text style={{ color: canPublish ? "#F5F3EE" : "rgba(0,0,0,0.2)", fontWeight: "800", fontSize: 16 }}>Publier</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function SectionTitle({ label }: { label: string }) {
  return <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 14, marginBottom: 10 }}>{label}</Text>;
}
