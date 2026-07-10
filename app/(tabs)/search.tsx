import { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  TextInput, Dimensions, Platform,
} from "react-native";
import WebView, { WebViewMessageEvent } from "react-native-webview";
// @ts-ignore
const isWeb = Platform.OS === "web";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { getArtistStats } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Image } from "expo-image";
import { PROJECT_STATUS_LABELS, ProjectStatus } from "@/types/database";
import { getAppViewport } from "@/lib/layout";

const { width: W, height: H } = getAppViewport(Dimensions.get("window"));

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function SearchScreen() {
  const { profile } = useAuthStore();
  const isArtist = profile?.role === "artist";
  return isArtist ? <ArtistStats /> : <ClientMap />;
}

// ─── MAP CLIENT ───────────────────────────────────────────
type ArtistRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  style_tags: string[];
  is_verified: boolean;
  starting_price: number | null;
};

const STYLES = ["blackwork", "fine line", "réalisme", "japonais", "dotwork", "minimaliste", "watercolor", "mandala", "old school", "couleur"];

function ClientMap() {
  const router = useRouter();
  const webViewRef = useRef<InstanceType<typeof WebView>>(null);
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [availableNow, setAvailableNow] = useState<ArtistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [search, setSearch] = useState("");
  const [styleFilter, setStyleFilter] = useState("");
  const [dispoOnly, setDispoOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [selected, setSelected] = useState<ArtistRow | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    fetchArtists();
    requestLocation();
  }, []);

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
  }

  async function fetchArtists() {
    setLoading(true);
    const [{ data }, { data: postRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url, city, lat, lng, style_tags, is_verified, starting_price")
        .eq("role", "artist")
        .not("lat", "is", null)
        .not("lng", "is", null),
      // Un artiste sans publication n'apparaît ni sur la carte ni dans la liste :
      // un profil vide décrédibilise la découverte. Il redevient visible
      // automatiquement dès sa première publication.
      supabase.from("posts").select("artist_id").eq("status", "published"),
    ]);
    const artistsWithPosts = new Set((postRows ?? []).map((r: any) => r.artist_id));
    const allArtists = ((data ?? []) as ArtistRow[]).filter((a) => artistsWithPosts.has(a.id));
    setArtists(allArtists);

    // Artistes dispo maintenant
    const { data: availRows } = await supabase
      .from("artist_availability")
      .select("artist_id")
      .eq("status", "open");
    const availIds = new Set((availRows ?? []).map((r: any) => r.artist_id));
    setAvailableNow(allArtists.filter((a) => availIds.has(a.id)));

    // Notes moyennes pour la vue liste
    const { data: revRows } = await supabase.from("reviews").select("artist_id, rating");
    const byArtist: Record<string, { avg: number; count: number }> = {};
    (revRows ?? []).forEach((r: any) => {
      const cur = byArtist[r.artist_id] ?? { avg: 0, count: 0 };
      byArtist[r.artist_id] = { avg: cur.avg + r.rating, count: cur.count + 1 };
    });
    Object.keys(byArtist).forEach((k) => { byArtist[k].avg = byArtist[k].avg / byArtist[k].count; });
    setRatings(byArtist);

    setLoading(false);
  }

  const availIds = new Set(availableNow.map((a) => a.id));
  const filtered = artists.filter((a) => {
    const matchStyle = !styleFilter || a.style_tags?.includes(styleFilter);
    const matchSearch = !search || a.display_name.toLowerCase().includes(search.toLowerCase()) || (a.city ?? "").toLowerCase().includes(search.toLowerCase());
    const matchDispo = !dispoOnly || availIds.has(a.id);
    return matchStyle && matchSearch && matchDispo;
  });

  // Envoie les markers à la WebView quand les données changent
  useEffect(() => {
    if (!mapReady) return;
    const markers = filtered.map((a) => ({
      id: a.id,
      name: a.display_name,
      avatar: a.avatar_url ?? "",
      lat: a.lat!,
      lng: a.lng!,
      city: a.city ?? "",
      styles: (a.style_tags ?? []).slice(0, 2).join(", "),
    }));
    if (isWeb) {
      (webViewRef.current as any)?.contentWindow?.postMessage(JSON.stringify({ type: "updateMarkers", markers }), "*");
    } else {
      webViewRef.current?.injectJavaScript(`updateMarkers(${JSON.stringify(markers)}); true;`);
    }
  }, [filtered, mapReady]);

  useEffect(() => {
    if (!mapReady || !userCoords) return;
    if (isWeb) {
      (webViewRef.current as any)?.contentWindow?.postMessage(JSON.stringify({ type: "setUserLocation", lat: userCoords.lat, lng: userCoords.lng }), "*");
    } else {
      webViewRef.current?.injectJavaScript(`setUserLocation(${userCoords.lat}, ${userCoords.lng}); true;`);
    }
  }, [userCoords, mapReady]);

  const mapHtml = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body, #map { width:100%; height:100%; }
  .avatar-marker {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2.5px solid #B8903E;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    object-fit: cover;
    background: #EDE9E1;
    display: block;
  }
  .avatar-marker.selected {
    border-color: #8B6A2A;
    box-shadow: 0 0 0 3px rgba(184,144,62,0.35), 0 2px 8px rgba(0,0,0,0.2);
    transform: scale(1.12);
  }
  .avatar-fallback {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2.5px solid #B8903E;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    background: #B8903E;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 700;
    color: #fff;
  }
  .leaflet-control-zoom { display: none; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false }).setView([46.6, 2.3], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  var markers = {};
  var selectedId = null;

  function makeMarkerHtml(a, isSelected) {
    var cls = 'avatar-marker' + (isSelected ? ' selected' : '');
    if (a.avatar) {
      return '<img class="' + cls + '" src="' + a.avatar + '" />';
    } else {
      var letter = a.name ? a.name.charAt(0).toUpperCase() : '?';
      return '<div class="avatar-fallback">' + letter + '</div>';
    }
  }

  function updateMarkers(data) {
    Object.values(markers).forEach(function(m) { map.removeLayer(m); });
    markers = {};
    data.forEach(function(a) {
      var icon = L.divIcon({
        className: '',
        html: makeMarkerHtml(a, a.id === selectedId),
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      var m = L.marker([a.lat, a.lng], { icon: icon }).addTo(map);
      m._artistData = a;
      m.on('click', function() {
        selectedId = a.id;
        postToParent(a);
        updateMarkerStyles();
      });
      markers[a.id] = m;
    });
  }

  function updateMarkerStyles() {
    Object.entries(markers).forEach(function([id, m]) {
      var a = m._artistData;
      var icon = L.divIcon({
        className: '',
        html: makeMarkerHtml(a, id === selectedId),
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      m.setIcon(icon);
    });
  }

  function setUserLocation(lat, lng) {
    L.circleMarker([lat, lng], {
      radius: 8, fillColor: '#4A90E2', color: '#fff',
      weight: 2, fillOpacity: 1
    }).addTo(map);
    map.setView([lat, lng], 10);
  }

  function postToParent(data) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    } else {
      window.parent.postMessage(JSON.stringify(data), '*');
    }
  }

  // Écouter les messages du parent (web)
  window.addEventListener('message', function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'updateMarkers') updateMarkers(msg.markers);
      if (msg.type === 'setUserLocation') setUserLocation(msg.lat, msg.lng);
    } catch {}
  });

  window.onMapReady = function() {
    postToParent({ type: 'ready' });
  };
  window.onMapReady();
</script>
</body>
</html>`;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE" }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: "#F5F3EE" }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 }}>
          <View>
            <Text style={{ color: "#B8903E", fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>Trouver</Text>
            <Text style={{ color: "#1A1A1A", fontSize: 20, fontWeight: "800" }}>Tatoueurs près de toi</Text>
          </View>
          {/* Toggle carte / liste */}
          <View style={{ flexDirection: "row", backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 10, padding: 3 }}>
            {([["map", "map-outline"], ["list", "list-outline"]] as const).map(([mode, icon]) => (
              <TouchableOpacity key={mode} onPress={() => setViewMode(mode)}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: viewMode === mode ? "#FFFFFF" : "transparent" }}>
                <Ionicons name={icon as any} size={16} color={viewMode === mode ? "#B8903E" : "#6B6B7A"} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", marginBottom: 8 }}>
          <Ionicons name="search" size={16} color="#6B6B7A" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Ville, nom d'artiste…" placeholderTextColor="rgba(0,0,0,0.2)" style={{ flex: 1, color: "#1A1A1A", fontSize: 14 }} />
          {search !== "" && <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={16} color="rgba(0,0,0,0.25)" /></TouchableOpacity>}
        </View>

        {availableNow.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#4CAF50" }} />
              <Text style={{ color: "#1A1A1A", fontSize: 12, fontWeight: "700" }}>Dispo maintenant</Text>
              <Text style={{ color: "#6B6B7A", fontSize: 12 }}>· {availableNow.length} tatoueur{availableNow.length > 1 ? "s" : ""}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 10, paddingRight: 16 }}>
                {[...availableNow].sort((a, b) => {
                  const ref = userCoords ?? { lat: 48.8566, lng: 2.3522 };
                  return haversineKm(ref.lat, ref.lng, a.lat!, a.lng!) - haversineKm(ref.lat, ref.lng, b.lat!, b.lng!);
                }).map((a) => (
                  <TouchableOpacity key={a.id} onPress={() => router.push(`/profile/${a.id}`)} style={{ alignItems: "center", gap: 5 }}>
                    <View style={{ position: "relative" }}>
                      {a.avatar_url ? (
                        <Image source={{ uri: a.avatar_url }} style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: "#4CAF50" }} contentFit="cover" />
                      ) : (
                        <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#B8903E", borderWidth: 2, borderColor: "#4CAF50", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 18 }}>{a.display_name.charAt(0)}</Text>
                        </View>
                      )}
                      <View style={{ position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: "#4CAF50", borderWidth: 2, borderColor: "#F5F3EE" }} />
                    </View>
                    <Text style={{ color: "#1A1A1A", fontSize: 11, fontWeight: "600", maxWidth: 56, textAlign: "center" }} numberOfLines={1}>{a.display_name.split(" ")[0]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8, paddingRight: 16 }}>
            {/* Filtre disponibilité en tête : le critère n°1 pour un client */}
            <TouchableOpacity onPress={() => setDispoOnly(!dispoOnly)}
              style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: dispoOnly ? "#27AE60" : "#FFFFFF", borderWidth: 1, borderColor: dispoOnly ? "#27AE60" : "rgba(0,0,0,0.1)" }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dispoOnly ? "#FFFFFF" : "#27AE60" }} />
              <Text style={{ color: dispoOnly ? "#FFFFFF" : "#1A1A1A", fontSize: 12, fontWeight: "600" }}>Dispo</Text>
            </TouchableOpacity>
            {STYLES.map((s) => (
              <TouchableOpacity key={s} onPress={() => setStyleFilter(styleFilter === s ? "" : s)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: styleFilter === s ? "#B8903E" : "#FFFFFF", borderWidth: 1, borderColor: styleFilter === s ? "#B8903E" : "rgba(0,0,0,0.1)" }}>
                <Text style={{ color: styleFilter === s ? "#F5F3EE" : "#1A1A1A", fontSize: 12, fontWeight: "600" }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Vue liste : triée par distance, avec note et prix */}
      {viewMode === "list" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 10 }}>
          {[...filtered].sort((a, b) => {
            const ref = userCoords ?? { lat: 48.8566, lng: 2.3522 };
            return haversineKm(ref.lat, ref.lng, a.lat!, a.lng!) - haversineKm(ref.lat, ref.lng, b.lat!, b.lng!);
          }).map((a) => {
            const ref = userCoords ?? { lat: 48.8566, lng: 2.3522 };
            const km = Math.round(haversineKm(ref.lat, ref.lng, a.lat!, a.lng!));
            const rating = ratings[a.id];
            const dispo = availableNow.some((x) => x.id === a.id);
            return (
              <TouchableOpacity key={a.id} onPress={() => router.push(`/profile/${a.id}`)}
                style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)" }}>
                <View style={{ position: "relative" }}>
                  <Avatar uri={a.avatar_url} name={a.display_name} size={54} />
                  {dispo && <View style={{ position: "absolute", bottom: 0, right: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: "#4CAF50", borderWidth: 2, borderColor: "#F5F3EE" }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Text style={{ color: "#1A1A1A", fontWeight: "800", fontSize: 15 }}>{a.display_name}</Text>
                    {a.is_verified && <Ionicons name="checkmark-circle" size={13} color="#B8903E" />}
                  </View>
                  <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 2 }}>
                    {a.city}{km > 0 ? ` · ${km} km` : ""}
                  </Text>
                  {a.style_tags?.length > 0 && (
                    <Text style={{ color: "#B8903E", fontSize: 11, fontWeight: "600", marginTop: 3 }} numberOfLines={1}>
                      {a.style_tags.slice(0, 3).join(" · ")}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  {rating && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Ionicons name="star" size={12} color="#B8903E" />
                      <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 13 }}>{rating.avg.toFixed(1)}</Text>
                      <Text style={{ color: "#9A9AA5", fontSize: 11 }}>({rating.count})</Text>
                    </View>
                  )}
                  {a.starting_price != null && (
                    <Text style={{ color: "#6B6B7A", fontSize: 12 }}>dès {a.starting_price}€</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          {filtered.length === 0 && !loading && (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Ionicons name="search-outline" size={44} color="rgba(0,0,0,0.1)" />
              <Text style={{ color: "#6B6B7A", fontSize: 14, marginTop: 12, textAlign: "center" }}>
                Aucun tatoueur ne correspond à ces filtres.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Map */}
      <View style={{ flex: 1, display: viewMode === "map" ? "flex" : "none" }}>
        {isWeb ? (
          <iframe
            ref={webViewRef as any}
            srcDoc={mapHtml}
            style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
            onLoad={() => {
              setMapReady(true);
              const iframe = (webViewRef.current as any);
              window.addEventListener("message", (e: MessageEvent) => {
                try {
                  const data = JSON.parse(e.data);
                  if (data.type === "ready") return;
                  const artist = artists.find((a) => a.id === data.id);
                  if (artist) setSelected(artist);
                } catch {}
              });
            }}
          />
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={{ flex: 1 }}
            onMessage={(e: WebViewMessageEvent) => {
              try {
                const data = JSON.parse(e.nativeEvent.data);
                if (data.type === "ready") {
                  setMapReady(true);
                  return;
                }
                const artist = artists.find((a) => a.id === data.id);
                if (artist) setSelected(artist);
              } catch {}
            }}
            scrollEnabled={false}
            javaScriptEnabled
          />
        )}

        {/* Bouton ma position */}
        <TouchableOpacity
          onPress={requestLocation}
          style={{ position: "absolute", top: 12, right: 12, width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 }}
        >
          <Ionicons name="locate" size={20} color="#B8903E" />
        </TouchableOpacity>

        {/* Compteur */}
        <View style={{ position: "absolute", top: 12, left: 12, backgroundColor: "#FFFFFF", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
          <Text style={{ color: "#1A1A1A", fontSize: 12, fontWeight: "700" }}>{filtered.length} tatoueur{filtered.length > 1 ? "s" : ""}</Text>
        </View>

        {/* Fiche artiste sélectionné */}
        {selected && (
          <TouchableOpacity
            onPress={() => router.push(`/profile/${selected.id}`)}
            style={{ position: "absolute", bottom: Platform.OS === "ios" ? 90 : 70, left: 16, right: 16, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 }}
          >
            <Avatar uri={selected.avatar_url} name={selected.display_name} size={52} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Text style={{ color: "#1A1A1A", fontWeight: "800", fontSize: 16 }}>{selected.display_name}</Text>
                {selected.is_verified && <Ionicons name="checkmark-circle" size={14} color="#B8903E" />}
              </View>
              <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 2 }}>{selected.city}</Text>
              {selected.style_tags?.length > 0 && (
                <Text style={{ color: "#B8903E", fontSize: 11, fontWeight: "600", marginTop: 4 }}>
                  {selected.style_tags.slice(0, 3).join(" · ")}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(0,0,0,0.2)" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── STATS ARTISTE ────────────────────────────────────────
function ArtistStats() {
  const { session } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (session) load(); }, [session]);

  async function load() {
    setLoading(true);
    const s = await getArtistStats(session!.user.id);
    setStats(s);
    const { data: posts } = await supabase
      .from("posts_with_counts")
      .select("id, media_url, thumbnail_url, saves_count")
      .eq("artist_id", session!.user.id)
      .order("saves_count", { ascending: false })
      .limit(6);
    setTopPosts(posts ?? []);
    setLoading(false);
  }

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color="#B8903E" />
    </View>
  );

  const statusCounts = (stats?.requests ?? []).reduce((acc: any, r: any) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F5F3EE" }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 10 }}>
        <Text style={{ color: "#B8903E", fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>Tableau de bord</Text>
        <Text style={{ color: "#1A1A1A", fontSize: 22, fontWeight: "800" }}>Mes statistiques</Text>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          {[
            { icon: "images-outline", label: "Publications", value: stats?.posts_count ?? 0 },
            { icon: "people-outline", label: "Abonnés", value: stats?.followers_count ?? 0 },
            { icon: "bookmark-outline", label: "Sauvegardes", value: stats?.saves_count ?? 0 },
            { icon: "color-palette-outline", label: "Demandes", value: stats?.requests_count ?? 0 },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1, minWidth: "45%", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)" }}>
              <Ionicons name={s.icon as any} size={18} color="#B8903E" />
              <Text style={{ color: "#1A1A1A", fontSize: 28, fontWeight: "800", marginTop: 8 }}>{s.value}</Text>
              <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Accès direct aux demandes : le cœur de l'outil pro */}
        <TouchableOpacity onPress={() => router.push("/pro/requests" as any)} style={{ backgroundColor: "#1A1A1A", borderRadius: 16, padding: 16, marginBottom: 20, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(201,162,75,0.2)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="color-palette" size={20} color="#C9A24B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#F4F1EA", fontWeight: "800", fontSize: 15 }}>Mes demandes de projets</Text>
            <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 12, marginTop: 2 }}>{stats?.requests_count ?? 0} demande{(stats?.requests_count ?? 0) > 1 ? "s" : ""} · triées par statut</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(244,241,234,0.4)" />
        </TouchableOpacity>

        {stats?.requests_count > 0 && (
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)" }}>
            <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 15, marginBottom: 12 }}>Demandes par statut</Text>
            <View style={{ gap: 8 }}>
              {Object.entries(statusCounts).map(([status, count]: any) => (
                <View key={status} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1, height: 6, backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
                    <View style={{ width: `${Math.round((count / stats.requests_count) * 100)}%`, height: "100%", backgroundColor: "#B8903E", borderRadius: 3 }} />
                  </View>
                  <Text style={{ color: "#6B6B7A", fontSize: 12, width: 100 }}>{PROJECT_STATUS_LABELS[status as ProjectStatus]}</Text>
                  <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 13, width: 20, textAlign: "right" }}>{count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {topPosts.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 15, marginBottom: 12 }}>Publications les plus sauvegardées</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3 }}>
              {topPosts.map((post) => (
                <TouchableOpacity key={post.id} onPress={() => router.push(`/post/${post.id}` as any)}>
                  <Image source={{ uri: post.thumbnail_url ?? post.media_url }} style={{ width: (W - 35) / 3, height: (W - 35) / 3, borderRadius: 10 }} contentFit="cover" />
                  <View style={{ position: "absolute", bottom: 6, right: 6, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3 }}>
                    <Ionicons name="bookmark" size={10} color="#C9A24B" />
                    <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "700" }}>{post.saves_count}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity onPress={() => router.push("/stats")} style={{ backgroundColor: "#FFFFFF", borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: "rgba(0,0,0,0.08)", marginBottom: 100 }}>
          <Ionicons name="bar-chart-outline" size={16} color="#B8903E" />
          <Text style={{ color: "#B8903E", fontWeight: "700", fontSize: 14 }}>Voir les stats détaillées</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
