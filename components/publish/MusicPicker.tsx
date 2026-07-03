import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Modal, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

interface Track {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl60: string;
  previewUrl: string;
}

interface Props {
  selected: { name: string; url: string | null } | null;
  onSelect: (track: { name: string; url: string | null }) => void;
}

// Utilise l'API Web Audio via fetch pour éviter expo-av deprecated
async function playPreview(url: string): Promise<() => void> {
  // Fallback : on ne peut pas jouer du son sans une lib native
  // On retourne une fonction stop no-op
  return () => {};
}

export function MusicPicker({ selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  // Lazy-load expo-av pour éviter le warning au démarrage
  async function togglePreview(track: Track) {
    if (playingId === track.trackId) {
      stopRef.current?.();
      stopRef.current = null;
      setPlayingId(null);
      return;
    }
    stopRef.current?.();
    stopRef.current = null;

    try {
      const ExpoAV = require("expo-av");
      await ExpoAV.Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await ExpoAV.Audio.Sound.createAsync(
        { uri: track.previewUrl },
        { shouldPlay: true }
      );
      setPlayingId(track.trackId);
      stopRef.current = async () => {
        await sound.stopAsync();
        await sound.unloadAsync();
        setPlayingId(null);
      };
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
          stopRef.current = null;
        }
      });
    } catch {}
  }

  async function searchMusic() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=15&country=fr`
      );
      const json = await res.json();
      setResults(json.results.filter((t: Track) => t.previewUrl));
    } catch {}
    setLoading(false);
  }

  function handleSelect(track: Track) {
    stopRef.current?.();
    stopRef.current = null;
    setPlayingId(null);
    onSelect({ name: `${track.trackName} — ${track.artistName}`, url: track.previewUrl });
    setOpen(false);
  }

  return (
    <>
      {selected?.url ? (
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 10,
          backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginBottom: 20,
        }}>
          <Ionicons name="musical-notes" size={20} color="#B8903E" />
          <Text style={{ flex: 1, color: "#1A1A1A", fontSize: 13 }} numberOfLines={1}>{selected.name}</Text>
          <TouchableOpacity onPress={() => onSelect({ name: "", url: null })}>
            <Ionicons name="close-circle" size={20} color="#6B6B7A" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setOpen(true)}
          style={{
            flexDirection: "row", alignItems: "center", gap: 10,
            backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, marginBottom: 20,
            borderWidth: 1, borderColor: "rgba(0,0,0,0.1)",
          }}
        >
          <Ionicons name="musical-notes-outline" size={20} color="#6B6B7A" />
          <Text style={{ color: "#6B6B7A", fontSize: 14 }}>Ajouter une musique</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={16} color="#6B6B7A" />
        </TouchableOpacity>
      )}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { stopRef.current?.(); setOpen(false); }}>
        <View style={{ flex: 1, backgroundColor: "#F5F3EE" }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 20, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: "#FFFFFF" }}>
            <Text style={{ flex: 1, color: "#1A1A1A", fontSize: 18, fontWeight: "700" }}>Choisir une musique</Text>
            <TouchableOpacity onPress={() => { stopRef.current?.(); setOpen(false); }}>
              <Ionicons name="close" size={24} color="#6B6B7A" />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={searchMusic}
                placeholder="Artiste, titre…"
                placeholderTextColor="#6B6B7A"
                style={{
                  flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 11, color: "#1A1A1A", fontSize: 15,
                }}
                returnKeyType="search"
              />
              <TouchableOpacity
                onPress={searchMusic}
                style={{ backgroundColor: "#B8903E", borderRadius: 12, paddingHorizontal: 16, justifyContent: "center" }}
              >
                <Ionicons name="search" size={18} color="#F5F3EE" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 8 }}>
              Aperçu 30s via Apple Music · ▶ pour écouter
            </Text>
          </View>

          {loading && <ActivityIndicator color="#B8903E" style={{ marginTop: 40 }} />}

          <FlatList
            data={results}
            keyExtractor={(t) => t.trackId.toString()}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            renderItem={({ item }) => (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#FFFFFF" }}>
                <Image source={{ uri: item.artworkUrl60 }} style={{ width: 48, height: 48, borderRadius: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#1A1A1A", fontWeight: "600", fontSize: 14 }} numberOfLines={1}>{item.trackName}</Text>
                  <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 2 }}>{item.artistName}</Text>
                </View>
                <TouchableOpacity onPress={() => togglePreview(item)} style={{ padding: 6 }}>
                  <Ionicons
                    name={playingId === item.trackId ? "pause-circle" : "play-circle-outline"}
                    size={30}
                    color={playingId === item.trackId ? "#B8903E" : "#6B6B7A"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  style={{ backgroundColor: "#B8903E", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
                >
                  <Text style={{ color: "#F5F3EE", fontWeight: "700", fontSize: 13 }}>Choisir</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </Modal>
    </>
  );
}
