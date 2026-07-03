import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import * as Location from "expo-location";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar } from "@/components/ui/Avatar";

export default function EditProfileScreen() {
  const { session, profile, setProfile } = useAuthStore();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [instagram, setInstagram] = useState(profile?.instagram ?? "");
  const [bookingUrl, setBookingUrl] = useState((profile as any)?.booking_url ?? "");
  const [startingPrice, setStartingPrice] = useState((profile as any)?.starting_price?.toString() ?? "");
  const [yearsExp, setYearsExp] = useState((profile as any)?.years_experience?.toString() ?? "");
  const [selectedStyles, setSelectedStyles] = useState<string[]>((profile as any)?.style_tags ?? []);
  const [acceptsProjects, setAcceptsProjects] = useState((profile as any)?.accepts_projects ?? true);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  }

  async function handleSave() {
    if (!session || !profile) return;
    setSaving(true);

    try {
      let avatarUrl = profile.avatar_url;

      if (avatarUri) {
        const ext = avatarUri.split(".").pop() ?? "jpg";
        const path = `avatars/${session.user.id}.${ext}`;
        const formData = new FormData();
        formData.append("file", { uri: avatarUri, name: `avatar.${ext}`, type: `image/${ext}` } as any);
        await supabase.storage.from("posts").upload(path, formData, { contentType: `image/${ext}`, upsert: true });
        avatarUrl = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
      }

      // Géocoder la ville pour la proximité
      let lat: number | null = null;
      let lng: number | null = null;
      if (city.trim()) {
        try {
          const geo = await Location.geocodeAsync(city.trim());
          if (geo.length > 0) { lat = geo[0].latitude; lng = geo[0].longitude; }
        } catch {}
      }
      const updates = {
        display_name: displayName.trim(), bio: bio.trim(), city: city.trim(),
        instagram: instagram.replace("@","").trim(), avatar_url: avatarUrl, lat, lng,
        booking_url: bookingUrl.trim() || null,
        starting_price: startingPrice ? parseInt(startingPrice) : null,
        years_experience: yearsExp ? parseInt(yearsExp) : null,
        style_tags: selectedStyles,
        accepts_projects: acceptsProjects,
      };
      await supabase.from("profiles").update(updates).eq("id", session.user.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (data) setProfile(data as any);
      router.back();
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    } finally {
      setSaving(false);
    }
  }

  const STYLES = ["Blackwork","Fine line","Réalisme","Japonais","Watercolor","Dotwork","Mandala","Minimaliste","Portrait","Old school","Géométrique","Trash polka","Neo-trad","Lettrage","Biomécanique"];
  function toggleStyle(s: string) { setSelectedStyles((p: string[]) => p.includes(s) ? p.filter((x: string) => x !== s) : [...p, s]); }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F5F3EE" }} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: "#FFFFFF" }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: "#1A1A1A", fontSize: 17, fontWeight: "700", textAlign: "center" }}>Modifier le profil</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#B8903E" /> : <Text style={{ color: "#B8903E", fontWeight: "700", fontSize: 16 }}>Sauver</Text>}
        </TouchableOpacity>
      </View>

      <View style={{ padding: 24 }}>
        {/* Avatar */}
        <TouchableOpacity onPress={pickAvatar} style={{ alignSelf: "center", marginBottom: 32 }}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: "#B8903E" }} />
          ) : (
            <Avatar uri={profile?.avatar_url} name={profile?.display_name ?? ""} size={90} />
          )}
          <View style={{ position: "absolute", bottom: 0, right: 0, backgroundColor: "#B8903E", borderRadius: 16, width: 28, height: 28, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#F5F3EE" }}>
            <Ionicons name="camera" size={14} color="#F5F3EE" />
          </View>
        </TouchableOpacity>

        {[
          { label: "Nom affiché", value: displayName, set: setDisplayName, placeholder: "Ton nom pro" },
          { label: "Ville", value: city, set: setCity, placeholder: "Paris, Lyon…" },
          { label: "Instagram", value: instagram, set: setInstagram, placeholder: "@ton.handle" },
          { label: "Lien de réservation", value: bookingUrl, set: setBookingUrl, placeholder: "https://calendly.com/…" },
          { label: "Prix de départ (€)", value: startingPrice, set: setStartingPrice, placeholder: "80", keyboard: "numeric" },
          { label: "Années d'expérience", value: yearsExp, set: setYearsExp, placeholder: "3", keyboard: "numeric" },
        ].map((field: any) => (
          <View key={field.label} style={{ marginBottom: 16 }}>
            <Text style={{ color: "#6B6B7A", fontSize: 12, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{field.label}</Text>
            <TextInput
              value={field.value}
              onChangeText={field.set}
              placeholder={field.placeholder}
              placeholderTextColor="rgba(0,0,0,0.18)"
              keyboardType={field.keyboard ?? "default"}
              style={{ backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, color: "#1A1A1A", fontSize: 15, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" }}
            />
          </View>
        ))}

        {/* Styles */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: "#6B6B7A", fontSize: 12, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Styles</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {STYLES.map((s) => (
              <TouchableOpacity key={s} onPress={() => toggleStyle(s)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: selectedStyles.includes(s) ? "#B8903E" : "#FFFFFF", borderWidth: 1, borderColor: selectedStyles.includes(s) ? "#B8903E" : "rgba(0,0,0,0.08)" }}>
                <Text style={{ color: selectedStyles.includes(s) ? "#F5F3EE" : "#1A1A1A", fontWeight: "600", fontSize: 13 }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Accepte projets */}
        <TouchableOpacity onPress={() => setAcceptsProjects((v: boolean) => !v)} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, gap: 14, marginBottom: 20 }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: acceptsProjects ? "#B8903E" : "rgba(0,0,0,0.1)", alignItems: "center", justifyContent: "center" }}>
            {acceptsProjects && <Ionicons name="checkmark" size={14} color="#F5F3EE" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#1A1A1A", fontWeight: "600", fontSize: 15 }}>Accepter des demandes de projets</Text>
          </View>
        </TouchableOpacity>

        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: "#6B6B7A", fontSize: 12, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Décris ton style, ton studio…"
            placeholderTextColor="rgba(0,0,0,0.18)"
            multiline
            style={{ backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, color: "#1A1A1A", fontSize: 15, minHeight: 100, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" }}
          />
        </View>
      </View>
    </ScrollView>
  );
}
