import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Dimensions, Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { getAppViewport } from "@/lib/layout";

const { width: W } = getAppViewport(Dimensions.get("window"));

const STYLES = [
  "Blackwork", "Fine line", "Réalisme", "Japonais", "Watercolor",
  "Dotwork", "Mandala", "Minimaliste", "Portrait", "Old school",
  "Géométrique", "Trash polka", "Neo-trad", "Lettrage", "Biomécanique",
];

const STEPS = [
  { title: "Ton identité", subtitle: "Photo et bio" },
  { title: "Où tu travailles", subtitle: "Ta ville" },
  { title: "Ton style", subtitle: "Tes spécialités" },
  { title: "Tes tarifs", subtitle: "Prix et disponibilité" },
];

export default function ArtistSetupScreen() {
  const { session, setProfile } = useAuthStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");

  // Step 2
  const [city, setCity] = useState("");

  // Step 3
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  // Step 4
  const [startingPrice, setStartingPrice] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [acceptsProjects, setAcceptsProjects] = useState(true);

  function toggleStyle(s: string) {
    setSelectedStyles((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function pickAvatar() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!res.canceled) setAvatarUri(res.assets[0].uri);
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else save();
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function save() {
    if (!session) return;
    setLoading(true);
    try {
      let avatarUrl: string | null = null;

      if (avatarUri) {
        // Bucket "posts" avec préfixe avatars/ (même convention que edit/profile)
        const ext = avatarUri.split(".").pop() ?? "jpg";
        const path = `avatars/${session.user.id}.${ext}`;
        const resp = await fetch(avatarUri);
        const blob = await resp.blob();
        const { error: upErr } = await supabase.storage.from("posts").upload(path, blob, { upsert: true, contentType: `image/${ext}` });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("posts").getPublicUrl(path);
          avatarUrl = urlData.publicUrl;
        }
      }

      let lat: number | null = null;
      let lng: number | null = null;
      if (city.trim()) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`);
          const data = await res.json();
          if (data[0]) { lat = parseFloat(data[0].lat); lng = parseFloat(data[0].lon); }
        } catch {}
      }

      const updates: any = {
        bio: bio.trim() || null,
        city: city.trim() || null,
        lat, lng,
        instagram: instagram.replace("@", "").trim() || null,
        booking_url: bookingUrl.trim() || null,
        starting_price: startingPrice ? parseInt(startingPrice) : null,
        style_tags: selectedStyles,
        accepts_projects: acceptsProjects,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      };

      await supabase.from("profiles").update(updates).eq("id", session.user.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (data) setProfile(data as any);
    } catch {}
    setLoading(false);
    router.replace("/(tabs)");
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, backgroundColor: "#F5F3EE" }}>
        {/* Header */}
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            {step > 0 ? (
              <TouchableOpacity onPress={back} style={{ padding: 8, marginLeft: -8 }}>
                <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
              </TouchableOpacity>
            ) : <View style={{ width: 38 }} />}
            <Text style={{ color: "#6B6B7A", fontSize: 13, fontWeight: "600" }}>
              {step + 1} / {STEPS.length}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={{ padding: 8, marginRight: -8 }}>
              <Text style={{ color: "#6B6B7A", fontSize: 14 }}>Passer</Text>
            </TouchableOpacity>
          </View>

          {/* Barre de progression */}
          <View style={{ height: 3, backgroundColor: "rgba(0,0,0,0.07)", borderRadius: 2, marginBottom: 20 }}>
            <View style={{ height: "100%", width: `${progress}%`, backgroundColor: "#B8903E", borderRadius: 2 }} />
          </View>

          <Text style={{ color: "#B8903E", fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
            {STEPS[step].subtitle}
          </Text>
          <Text style={{ color: "#1A1A1A", fontSize: 26, fontWeight: "800" }}>{STEPS[step].title}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
            {step === 0 && <StepIdentity avatarUri={avatarUri} bio={bio} instagram={instagram} onPickAvatar={pickAvatar} onBio={setBio} onInstagram={setInstagram} />}
            {step === 1 && <StepCity city={city} onCity={setCity} />}
            {step === 2 && <StepStyles selected={selectedStyles} onToggle={toggleStyle} />}
            {step === 3 && <StepTarifs price={startingPrice} bookingUrl={bookingUrl} accepts={acceptsProjects} onPrice={setStartingPrice} onBooking={setBookingUrl} onAccepts={setAcceptsProjects} />}
          </View>
        </ScrollView>

        {/* Bouton bas */}
        <View style={{ paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 40 : 24, paddingTop: 12, backgroundColor: "#F5F3EE" }}>
          <TouchableOpacity
            onPress={next}
            disabled={loading}
            style={{ backgroundColor: "#B8903E", borderRadius: 16, paddingVertical: 17, alignItems: "center" }}
            activeOpacity={0.85}
          >
            <Text style={{ color: "#F5F3EE", fontWeight: "800", fontSize: 16 }}>
              {loading ? "Enregistrement…" : step < STEPS.length - 1 ? "Continuer" : "Accéder à mon espace"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── ÉTAPE 1 : Identité ───────────────────────────────────
function StepIdentity({ avatarUri, bio, instagram, onPickAvatar, onBio, onInstagram }: any) {
  return (
    <View style={{ gap: 20 }}>
      {/* Avatar */}
      <View style={{ alignItems: "center", marginTop: 8, marginBottom: 8 }}>
        <TouchableOpacity onPress={onPickAvatar} activeOpacity={0.85}>
          <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: "#EDE9E1", overflow: "hidden", borderWidth: 2, borderColor: "#B8903E", alignItems: "center", justifyContent: "center" }}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: 100, height: 100 }} contentFit="cover" />
            ) : (
              <Ionicons name="camera-outline" size={32} color="#B8903E" />
            )}
          </View>
          <View style={{ position: "absolute", bottom: 2, right: 2, backgroundColor: "#B8903E", borderRadius: 12, padding: 5, borderWidth: 2, borderColor: "#F5F3EE" }}>
            <Ionicons name="add" size={12} color="#F5F3EE" />
          </View>
        </TouchableOpacity>
        <Text style={{ color: "#6B6B7A", fontSize: 13, marginTop: 10 }}>Photo de profil</Text>
      </View>

      <View>
        <FieldLabel text="Bio" optional />
        <TextInput
          value={bio}
          onChangeText={onBio}
          placeholder="Décris ton style, ton univers…"
          placeholderTextColor="#6B6B7A"
          multiline
          numberOfLines={4}
          style={{ backgroundColor: "#FFFFFF", color: "#1A1A1A", borderRadius: 14, padding: 14, fontSize: 15, minHeight: 100, textAlignVertical: "top", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }}
        />
      </View>

      <View>
        <FieldLabel text="Instagram" optional />
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }}>
          <Text style={{ color: "#6B6B7A", fontSize: 15 }}>@</Text>
          <TextInput
            value={instagram}
            onChangeText={onInstagram}
            placeholder="monpseudo"
            placeholderTextColor="#6B6B7A"
            autoCapitalize="none"
            style={{ flex: 1, color: "#1A1A1A", padding: 14, fontSize: 15 }}
          />
        </View>
      </View>
    </View>
  );
}

// ─── ÉTAPE 2 : Ville ─────────────────────────────────────
function StepCity({ city, onCity }: any) {
  return (
    <View style={{ gap: 20 }}>
      <Text style={{ color: "#6B6B7A", fontSize: 15, lineHeight: 22 }}>
        Ta ville sera utilisée pour placer ton profil sur la carte et permettre aux clients proches de te trouver.
      </Text>
      <View>
        <FieldLabel text="Ville principale" optional />
        <TextInput
          value={city}
          onChangeText={onCity}
          placeholder="Paris, Lyon, Marseille…"
          placeholderTextColor="#6B6B7A"
          style={{ backgroundColor: "#FFFFFF", color: "#1A1A1A", borderRadius: 14, padding: 14, fontSize: 15, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }}
        />
      </View>
      <View style={{ backgroundColor: "rgba(184,144,62,0.08)", borderRadius: 14, padding: 16, flexDirection: "row", gap: 12 }}>
        <Ionicons name="information-circle-outline" size={20} color="#B8903E" style={{ marginTop: 1 }} />
        <Text style={{ color: "#1A1A1A", fontSize: 13, lineHeight: 19, flex: 1 }}>
          Tu peux aussi ajouter des lieux secondaires (guest spots, à domicile) depuis ton profil une fois connecté.
        </Text>
      </View>
    </View>
  );
}

// ─── ÉTAPE 3 : Styles ────────────────────────────────────
function StepStyles({ selected, onToggle }: any) {
  return (
    <View style={{ gap: 16 }}>
      <Text style={{ color: "#6B6B7A", fontSize: 15, lineHeight: 22 }}>
        Sélectionne les styles que tu pratiques. Cela aide les clients à te trouver par leurs préférences.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {STYLES.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => onToggle(s)}
            style={{
              paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
              backgroundColor: selected.includes(s) ? "#B8903E" : "#FFFFFF",
              borderWidth: 1.5, borderColor: selected.includes(s) ? "#B8903E" : "rgba(0,0,0,0.1)",
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: selected.includes(s) ? "#F5F3EE" : "#1A1A1A", fontWeight: "600", fontSize: 13 }}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {selected.length > 0 && (
        <Text style={{ color: "#B8903E", fontSize: 13, fontWeight: "600", textAlign: "center" }}>
          {selected.length} style{selected.length > 1 ? "s" : ""} sélectionné{selected.length > 1 ? "s" : ""}
        </Text>
      )}
    </View>
  );
}

// ─── ÉTAPE 4 : Tarifs ────────────────────────────────────
function StepTarifs({ price, bookingUrl, accepts, onPrice, onBooking, onAccepts }: any) {
  return (
    <View style={{ gap: 20 }}>
      <View>
        <FieldLabel text="Prix de départ (€)" optional />
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }}>
          <TextInput
            value={price}
            onChangeText={onPrice}
            placeholder="80"
            placeholderTextColor="#6B6B7A"
            keyboardType="numeric"
            style={{ flex: 1, color: "#1A1A1A", padding: 14, fontSize: 15 }}
          />
          <Text style={{ color: "#6B6B7A", fontSize: 15 }}>€</Text>
        </View>
      </View>

      <View>
        <FieldLabel text="Lien de réservation" optional />
        <TextInput
          value={bookingUrl}
          onChangeText={onBooking}
          placeholder="https://calendly.com/…"
          placeholderTextColor="#6B6B7A"
          autoCapitalize="none"
          keyboardType="url"
          style={{ backgroundColor: "#FFFFFF", color: "#1A1A1A", borderRadius: 14, padding: 14, fontSize: 15, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }}
        />
      </View>

      <TouchableOpacity
        onPress={() => onAccepts(!accepts)}
        style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.07)" }}
        activeOpacity={0.8}
      >
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: accepts ? "#B8903E" : "rgba(0,0,0,0.08)", alignItems: "center", justifyContent: "center" }}>
          {accepts && <Ionicons name="checkmark" size={14} color="#F5F3EE" />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 15 }}>Accepter des demandes de projets</Text>
          <Text style={{ color: "#6B6B7A", fontSize: 13, marginTop: 3, lineHeight: 18 }}>
            Les clients peuvent t'envoyer leurs idées directement depuis l'app
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function FieldLabel({ text, optional }: { text: string; optional?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
      <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 14 }}>{text}</Text>
      {optional && <Text style={{ color: "#6B6B7A", fontSize: 12 }}>facultatif</Text>}
    </View>
  );
}
