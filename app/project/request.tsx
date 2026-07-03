import { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { createProjectRequest } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { SIZE_LABELS, SizeCategory } from "@/types/database";
import { BODY_PLACEMENTS_FULL } from "@/lib/config";

const { width: W } = Dimensions.get("window");

const STEPS = ["Type", "Mon idée", "Infos", "Validation"];

export default function ProjectRequestScreen() {
  const { artistId, artistName, postId, postImage } = useLocalSearchParams<{
    artistId: string; artistName: string; postId?: string; postImage?: string;
  }>();
  const { session, profile } = useAuthStore();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [requestType, setRequestType] = useState<"flash" | "custom" | "question">("custom");
  const [description, setDescription] = useState("");
  const [refImages, setRefImages] = useState<string[]>([]);
  const [bodyPlacement, setBodyPlacement] = useState("");
  const [placementSearch, setPlacementSearch] = useState("");
  const [sizeCategory, setSizeCategory] = useState<SizeCategory | "">("");
  const [colorPref, setColorPref] = useState<"color" | "black_grey" | "any">("any");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [sending, setSending] = useState(false);

  async function pickImages() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setRefImages((prev) => [...prev, ...uris].slice(0, 5));
    }
  }

  async function uploadImages(): Promise<string[]> {
    const urls: string[] = [];
    for (const uri of refImages) {
      const ext = uri.split(".").pop() ?? "jpg";
      const path = `project-refs/${session!.user.id}/${Date.now()}.${ext}`;
      const fd = new FormData();
      fd.append("file", { uri, name: `ref.${ext}`, type: `image/${ext}` } as any);
      await supabase.storage.from("posts").upload(path, fd, { contentType: `image/${ext}`, upsert: true });
      const url = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
      urls.push(url);
    }
    return urls;
  }

  async function handleSend() {
    if (!session || !artistId) return;
    setSending(true);
    try {
      const refUrls = await uploadImages();
      const { conversationId } = await createProjectRequest({
        client_id: session.user.id,
        artist_id: artistId,
        post_id: postId ?? null,
        request_type: requestType,
        description,
        body_placement: bodyPlacement || undefined,
        size_category: (sizeCategory as SizeCategory) || undefined,
        color_preference: colorPref,
        budget_min: budgetMin ? parseInt(budgetMin) : undefined,
        budget_max: budgetMax ? parseInt(budgetMax) : undefined,
        desired_date: desiredDate || undefined,
        city: profile?.city ?? undefined,
        reference_urls: refUrls,
      });
      router.replace(`/chat/${conversationId}`);
    } catch (e: any) {
      Alert.alert("Erreur", e.message ?? "Impossible d'envoyer la demande");
    } finally {
      setSending(false);
    }
  }

  const canGoNext = [
    true, // type toujours valide
    description.trim().length > 0,
    true, // infos optionnelles
    true,
  ][step];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#F5F3EE" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <TouchableOpacity onPress={() => step > 0 ? setStep(s => s - 1) : router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={{ flex: 1, color: "#1A1A1A", fontWeight: "700", fontSize: 16, textAlign: "center" }}>
            Demander un projet
          </Text>
          <View style={{ width: 26 }} />
        </View>

        {/* Stepper */}
        <View style={{ flexDirection: "row", gap: 6 }}>
          {STEPS.map((_, i) => (
            <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= step ? "#B8903E" : "rgba(0,0,0,0.1)" }} />
          ))}
        </View>
        <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 6 }}>
          Étape {step + 1}/{STEPS.length} — {STEPS[step]}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        {/* Artiste cible */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginBottom: 24 }}>
          <Ionicons name="color-palette-outline" size={16} color="#B8903E" />
          <Text style={{ color: "#1A1A1A", fontWeight: "600" }}>Pour {artistName ?? "ce tatoueur"}</Text>
          {postImage && (
            <Image source={{ uri: postImage }} style={{ width: 40, height: 40, borderRadius: 6, marginLeft: "auto" }} contentFit="cover" />
          )}
        </View>

        {/* ─── ÉTAPE 0 : TYPE ─── */}
        {step === 0 && (
          <View style={{ gap: 12 }}>
            <Text style={{ color: "#1A1A1A", fontSize: 20, fontWeight: "800", marginBottom: 8 }}>Quel type de demande ?</Text>
            {([
              { value: "flash", label: "Reproduire / adapter ce flash", icon: "flash-outline", desc: "Ce design me plaît, je veux le même ou une variante." },
              { value: "custom", label: "Projet personnalisé", icon: "pencil-outline", desc: "J'ai une idée précise, je veux un tatouage sur mesure." },
              { value: "question", label: "Question avant réservation", icon: "help-circle-outline", desc: "J'ai des questions avant de me décider." },
            ] as const).map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setRequestType(t.value)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 14,
                  backgroundColor: requestType === t.value ? "rgba(184,144,62,0.1)" : "#FFFFFF",
                  borderRadius: 14, padding: 16,
                  borderWidth: 1.5, borderColor: requestType === t.value ? "#B8903E" : "transparent",
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: requestType === t.value ? "rgba(184,144,62,0.2)" : "rgba(0,0,0,0.08)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={t.icon} size={22} color={requestType === t.value ? "#B8903E" : "#6B6B7A"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: requestType === t.value ? "#B8903E" : "#1A1A1A", fontWeight: "700", fontSize: 15 }}>{t.label}</Text>
                  <Text style={{ color: "#6B6B7A", fontSize: 13, marginTop: 2 }}>{t.desc}</Text>
                </View>
                {requestType === t.value && <Ionicons name="checkmark-circle" size={22} color="#B8903E" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ─── ÉTAPE 1 : DESCRIPTION ─── */}
        {step === 1 && (
          <View>
            <Text style={{ color: "#1A1A1A", fontSize: 20, fontWeight: "800", marginBottom: 4 }}>Décris ton idée</Text>
            <Text style={{ color: "#6B6B7A", fontSize: 14, marginBottom: 20 }}>Plus tu es précis·e, mieux le tatoueur pourra te répondre.</Text>

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Décris ton idée, tes références, ce qui te plaît dans ce style…"
              placeholderTextColor="rgba(0,0,0,0.18)"
              multiline
              style={{
                backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16,
                color: "#1A1A1A", fontSize: 15, minHeight: 140, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)",
                textAlignVertical: "top",
              }}
            />

            <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 8, marginBottom: 20 }}>
              {description.length}/500 caractères
            </Text>

            {/* Photos de référence */}
            <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 15, marginBottom: 10 }}>
              Photos de référence <Text style={{ color: "#6B6B7A", fontWeight: "400" }}>(optionnel, max 5)</Text>
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {refImages.map((uri, i) => (
                <View key={i} style={{ position: "relative" }}>
                  <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 10 }} contentFit="cover" />
                  <TouchableOpacity
                    onPress={() => setRefImages((prev) => prev.filter((_, j) => j !== i))}
                    style={{ position: "absolute", top: -6, right: -6, backgroundColor: "#F5F3EE", borderRadius: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {refImages.length < 5 && (
                <TouchableOpacity
                  onPress={pickImages}
                  style={{ width: 80, height: 80, borderRadius: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", borderStyle: "dashed", alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="add" size={28} color="#6B6B7A" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ─── ÉTAPE 2 : INFOS ─── */}
        {step === 2 && (
          <View>
            <Text style={{ color: "#1A1A1A", fontSize: 20, fontWeight: "800", marginBottom: 4 }}>Informations</Text>
            <Text style={{ color: "#6B6B7A", fontSize: 14, marginBottom: 20 }}>Tout est optionnel mais aide le tatoueur à mieux estimer.</Text>

            <FieldLabel label="Emplacement du corps" />
            {/* Recherche */}
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, gap: 8, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", marginBottom: 12 }}>
              <Ionicons name="search" size={15} color="#6B6B7A" />
              <TextInput
                value={placementSearch}
                onChangeText={setPlacementSearch}
                placeholder="Rechercher un emplacement…"
                placeholderTextColor="rgba(0,0,0,0.2)"
                style={{ flex: 1, color: "#1A1A1A", fontSize: 14 }}
              />
              {placementSearch !== "" && (
                <TouchableOpacity onPress={() => setPlacementSearch("")}>
                  <Ionicons name="close-circle" size={16} color="rgba(0,0,0,0.25)" />
                </TouchableOpacity>
              )}
            </View>
            {/* Sélection actuelle */}
            {bodyPlacement !== "" && (
              <TouchableOpacity
                onPress={() => setBodyPlacement("")}
                style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(184,144,62,0.1)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, alignSelf: "flex-start" }}
              >
                <Ionicons name="checkmark-circle" size={15} color="#B8903E" />
                <Text style={{ color: "#B8903E", fontWeight: "700", fontSize: 13 }}>{bodyPlacement}</Text>
                <Ionicons name="close" size={13} color="#B8903E" />
              </TouchableOpacity>
            )}
            {/* Catégories */}
            <View style={{ gap: 14, marginBottom: 20 }}>
              {Object.entries(BODY_PLACEMENTS_FULL).map(([category, placements]) => {
                const filtered = placementSearch
                  ? placements.filter(p => p.toLowerCase().includes(placementSearch.toLowerCase()))
                  : placements;
                if (filtered.length === 0) return null;
                return (
                  <View key={category}>
                    <Text style={{ color: "#6B6B7A", fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{category}</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {filtered.map((bp) => (
                        <TouchableOpacity
                          key={bp}
                          onPress={() => setBodyPlacement(bodyPlacement === bp ? "" : bp)}
                          style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: bodyPlacement === bp ? "#B8903E" : "#FFFFFF", borderWidth: 1, borderColor: bodyPlacement === bp ? "#B8903E" : "rgba(0,0,0,0.1)" }}
                        >
                          <Text style={{ color: bodyPlacement === bp ? "#F5F3EE" : "#1A1A1A", fontSize: 13, fontWeight: "600" }}>{bp}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>

            <FieldLabel label="Taille approximative" />
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

            <FieldLabel label="Couleur" />
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {([["any", "Indifférent"], ["black_grey", "Noir & gris"], ["color", "Couleur"]] as const).map(([val, lbl]) => (
                <TouchableOpacity
                  key={val}
                  onPress={() => setColorPref(val)}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: colorPref === val ? "#B8903E" : "#FFFFFF", borderWidth: 1, borderColor: colorPref === val ? "#B8903E" : "rgba(0,0,0,0.1)" }}
                >
                  <Text style={{ color: colorPref === val ? "#F5F3EE" : "#1A1A1A", fontWeight: "600", fontSize: 13 }}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <FieldLabel label="Budget estimé (€)" />
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              <TextInput value={budgetMin} onChangeText={setBudgetMin} placeholder="Min" placeholderTextColor="rgba(0,0,0,0.18)" keyboardType="number-pad"
                style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#1A1A1A", fontSize: 15, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }} />
              <TextInput value={budgetMax} onChangeText={setBudgetMax} placeholder="Max" placeholderTextColor="rgba(0,0,0,0.18)" keyboardType="number-pad"
                style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#1A1A1A", fontSize: 15, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }} />
            </View>

            <FieldLabel label="Période souhaitée" />
            <TextInput value={desiredDate} onChangeText={setDesiredDate} placeholder="Ex : mars 2026, après Pâques…" placeholderTextColor="rgba(0,0,0,0.18)"
              style={{ backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#1A1A1A", fontSize: 15, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", marginBottom: 20 }} />
          </View>
        )}

        {/* ─── ÉTAPE 3 : VALIDATION ─── */}
        {step === 3 && (
          <View>
            <Text style={{ color: "#1A1A1A", fontSize: 20, fontWeight: "800", marginBottom: 20 }}>Récapitulatif</Text>

            <SummaryRow label="Tatoueur" value={artistName ?? "—"} />
            <SummaryRow label="Type" value={{ flash: "Flash / adaptation", custom: "Projet sur mesure", question: "Question" }[requestType]} />
            <SummaryRow label="Description" value={description || "—"} />
            {bodyPlacement && <SummaryRow label="Emplacement" value={bodyPlacement} />}
            {sizeCategory && <SummaryRow label="Taille" value={SIZE_LABELS[sizeCategory as SizeCategory]} />}
            <SummaryRow label="Couleur" value={{ any: "Indifférent", black_grey: "Noir & gris", color: "Couleur" }[colorPref]} />
            {(budgetMin || budgetMax) && <SummaryRow label="Budget" value={`${budgetMin || "?"}€ – ${budgetMax || "?"}€`} />}
            {desiredDate && <SummaryRow label="Période" value={desiredDate} />}
            {refImages.length > 0 && <SummaryRow label="Références" value={`${refImages.length} photo(s)`} />}

            <View style={{ backgroundColor: "rgba(184,144,62,0.1)", borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: "rgba(184,144,62,0.2)" }}>
              <Text style={{ color: "#B8903E", fontSize: 13, lineHeight: 20 }}>
                Ta demande sera envoyée directement à {artistName ?? "ce tatoueur"}. Une conversation sera créée pour la suite.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bouton */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#F5F3EE", borderTopWidth: 1, borderTopColor: "#FFFFFF", padding: 20, paddingBottom: 40 }}>
        <TouchableOpacity
          onPress={step < 3 ? () => setStep(s => s + 1) : handleSend}
          disabled={!canGoNext || sending}
          style={{
            backgroundColor: canGoNext ? "#B8903E" : "rgba(0,0,0,0.06)",
            borderRadius: 14, paddingVertical: 16, alignItems: "center",
          }}
        >
          {sending ? <ActivityIndicator color="#F5F3EE" /> : (
            <Text style={{ color: canGoNext ? "#F5F3EE" : "rgba(0,0,0,0.18)", fontWeight: "800", fontSize: 16 }}>
              {step < 3 ? "Continuer" : "Envoyer ma demande"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={{ color: "#6B6B7A", fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>{label}</Text>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#FFFFFF", gap: 12 }}>
      <Text style={{ color: "#6B6B7A", fontSize: 14, width: 90 }}>{label}</Text>
      <Text style={{ color: "#1A1A1A", fontSize: 14, flex: 1, fontWeight: "500" }}>{value}</Text>
    </View>
  );
}
