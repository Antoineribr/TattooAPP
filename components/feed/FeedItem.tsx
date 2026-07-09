import { useRef, useState, useEffect, useCallback } from "react";
import { View, Text, Dimensions, TouchableOpacity, Animated, Pressable, Platform } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Audio } from "expo-av";
import { PostWithCounts } from "@/types/database";
import { ActionColumn } from "./ActionColumn";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { Ionicons } from "@expo/vector-icons";
import { useTabBarStore } from "@/store/useTabBarStore";

// Sur web, "screen" = écran physique (faux) ; il faut la fenêtre du navigateur
const { width: W, height: H } = Dimensions.get(Platform.OS === "web" ? "window" : "screen");

// Une seule musique à la fois dans tout le feed : le son du post actif
// remplace toujours le précédent (sinon les pistes se chevauchent au swipe)
let globalSound: Audio.Sound | null = null;
async function stopGlobalSound() {
  const s = globalSound;
  globalSound = null;
  if (!s) return;
  try { await s.stopAsync(); } catch {}
  try { await s.unloadAsync(); } catch {}
}

type Slide = { uri: string; type: "image" | "video" };

function VideoSlide({ uri, paused, muted }: { uri: string; paused: boolean; muted: boolean }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
    p.play();
  });

  // Sur web : playsInline obligatoire sinon iOS Safari force le plein écran
  useEffect(() => {
    if (Platform.OS !== "web") return;
    document.querySelectorAll("video").forEach((v) => {
      v.playsInline = true;
      v.setAttribute("playsinline", "");
    });
  }, []);

  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused]);

  useEffect(() => {
    player.muted = muted;
  }, [muted]);

  return <VideoView player={player} style={{ width: W, height: H }} contentFit="cover" nativeControls={false} />;
}

interface Props {
  post: PostWithCounts;
  isActive?: boolean;
  onLike: () => void;
  onSave: () => void;
  onFollow: () => void;
  onMessage: () => void;
  onProject?: () => void;
}

export function FeedItem({ post, isActive = false, onLike, onSave, onFollow, onMessage, onProject }: Props) {
  const router = useRouter();
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const likeScale = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const soundLoadingRef = useRef(false);
  const soundLoadIdRef = useRef(0);
  const [audioError, setAudioError] = useState(false);
  const { muted, setMuted } = useTabBarStore();

  const releaseLocalSound = useCallback(() => {
    soundLoadIdRef.current += 1;
    const sound = soundRef.current;
    soundRef.current = null;
    if (!sound) return;
    if (globalSound === sound) globalSound = null;
    void sound.stopAsync().catch(() => {});
    void sound.unloadAsync().catch(() => {});
  }, []);

  const startOrResumeSound = useCallback(() => {
    if (!post.music_url || !isActive || isPaused) return;

    const existingSound = soundRef.current;
    if (existingSound) {
      setAudioError(false);
      void existingSound.setVolumeAsync(0.7);
      void existingSound.playAsync().catch(() => setAudioError(true));
      return;
    }

    if (soundLoadingRef.current) return;
    soundLoadingRef.current = true;
    const requestId = ++soundLoadIdRef.current;
    setAudioError(false);

    // Sur le web, cet appel est aussi lancé directement depuis le clic sur
    // le bouton son : le navigateur le considère alors comme une action voulue.
    void Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false }).catch(() => {});
    void stopGlobalSound();

    Audio.Sound.createAsync(
      { uri: post.music_url },
      { shouldPlay: true, isLooping: true, volume: 0.7 }
    ).then(({ sound }) => {
      if (requestId !== soundLoadIdRef.current) {
        void sound.stopAsync().catch(() => {});
        void sound.unloadAsync().catch(() => {});
        return;
      }
      soundRef.current = sound;
      globalSound = sound;
    }).catch(() => {
      if (requestId === soundLoadIdRef.current) setAudioError(true);
    }).finally(() => {
      soundLoadingRef.current = false;
    });
  }, [post.music_url, isActive, isPaused]);

  useEffect(() => {
    if (!isActive || !post.music_url) {
      releaseLocalSound();
      return;
    }
    // Chrome et Safari bloquent un lancement audio au chargement.
    // Sur web, on attend que la personne active explicitement le son.
    if (Platform.OS === "web" && muted) return;
    startOrResumeSound();
  }, [post.music_url, isActive, muted, startOrResumeSound, releaseLocalSound]);

  useEffect(() => {
    const sound = soundRef.current;
    if (!sound) return;
    if (isPaused) void sound.pauseAsync().catch(() => {});
    else if (!muted) void sound.playAsync().catch(() => setAudioError(true));
  }, [isPaused, muted]);

  useEffect(() => {
    const sound = soundRef.current;
    if (sound) void sound.setVolumeAsync(muted ? 0 : 0.7).catch(() => setAudioError(true));
  }, [muted]);

  useEffect(() => () => releaseLocalSound(), [releaseLocalSound]);

  function handleSoundPress() {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (!nextMuted) startOrResumeSound();
  }

  const slides: Slide[] = [
    { uri: post.media_url, type: post.media_type },
    ...(post.media_urls ?? []).map((uri) => ({ uri, type: "image" as const })),
  ];
  const hasMultiple = slides.length > 1;
  const current = slides[slideIndex];
  const isVideo = current.type === "video";

  function handleLikePress() {
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.5, useNativeDriver: true, speed: 60 }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    onLike();
  }

  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleTap(x: number) {
    if (tapTimer.current) {
      // Double tap → like
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      handleLikePress();
    } else {
      // Attendre pour distinguer simple/double
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        // Simple tap → pause/resume ou carrousel
        if (hasMultiple) {
          if (x < W / 2) setSlideIndex((i) => Math.max(0, i - 1));
          else setSlideIndex((i) => Math.min(slides.length - 1, i + 1));
        } else {
          setIsPaused((p) => !p);
        }
      }, 250);
    }
  }

  return (
    <View style={{ width: W, height: H, backgroundColor: "#0A0A0B" }}>
      {/* Média */}
      {isVideo ? (
        <VideoSlide uri={current.uri} paused={isPaused || !isActive} muted={muted} />
      ) : (
        <Image
          source={{ uri: current.uri }}
          style={{ width: W, height: H, position: "absolute" }}
          contentFit="cover"
          transition={200}
        />
      )}

      {/* Zone tap : 1 clic = pause, 2 clics = like */}
      <Pressable
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 200 }}
        onPress={(e) => handleTap(e.nativeEvent.locationX)}
      />

      {/* Dégradé haut */}
      <LinearGradient
        colors={["rgba(10,10,11,0.7)", "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 130 }}
        pointerEvents="none"
      />

      {/* Dégradé bas */}
      <LinearGradient
        colors={["transparent", "rgba(10,10,11,0.6)", "rgba(10,10,11,0.97)"]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 420 }}
        pointerEvents="none"
      />

      {/* Indicateurs carrousel */}
      {hasMultiple && (
        <View style={{ position: "absolute", top: 48, left: 16, right: 16, flexDirection: "row", gap: 3 }}>
          {slides.map((_, i) => (
            <View key={i} style={{
              flex: 1, height: 2, borderRadius: 1,
              backgroundColor: i <= slideIndex ? "#C9A24B" : "rgba(244,241,234,0.25)",
            }} />
          ))}
        </View>
      )}

      {/* Bouton mute — haut droite */}
      <TouchableOpacity
        onPress={handleSoundPress}
        accessibilityRole="button"
        accessibilityLabel={muted ? "Activer le son de la publication" : "Couper le son de la publication"}
        style={{
          position: "absolute", top: 52, right: 16,
          width: 34, height: 34, borderRadius: 17,
          backgroundColor: "rgba(10,10,11,0.55)",
          alignItems: "center", justifyContent: "center",
        }}
        activeOpacity={0.8}
      >
        <Ionicons name={muted ? "volume-mute" : "volume-medium"} size={16} color="#F4F1EA" />
      </TouchableOpacity>

      {/* Musique */}
      {post.music_name && (
        <View style={{
          position: "absolute", top: hasMultiple ? 62 : 52, left: 16,
          flexDirection: "row", alignItems: "center", gap: 5,
          backgroundColor: "rgba(10,10,11,0.6)", borderRadius: 20,
          paddingHorizontal: 10, paddingVertical: 5,
        }}>
          <Ionicons name="musical-notes" size={11} color="#C9A24B" />
          <Text style={{ color: "rgba(244,241,234,0.85)", fontSize: 11, fontWeight: "500" }} numberOfLines={1}>
            {post.music_name}
          </Text>
        </View>
      )}

      {audioError && !muted && post.music_name && (
        <View style={{
          position: "absolute", top: hasMultiple ? 92 : 82, left: 16,
          backgroundColor: "rgba(10,10,11,0.7)", borderRadius: 10,
          paddingHorizontal: 10, paddingVertical: 6,
        }}>
          <Text style={{ color: "#F4F1EA", fontSize: 11 }}>
            Impossible de lancer l’extrait. Réessaie.
          </Text>
        </View>
      )}

      {/* Infos artiste */}
      <View style={{ position: "absolute", bottom: 88, left: 16, right: 72 }}>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}
          onPress={() => router.push(`/profile/${post.artist_id}`)}
          activeOpacity={0.85}
        >
          <Avatar uri={post.avatar_url} name={post.display_name} size={40} />
          <View>
            <Text style={{ color: "#F4F1EA", fontWeight: "700", fontSize: 15, letterSpacing: 0.2 }}>
              {post.display_name}
            </Text>
            {(post.artist_city ?? post.city) && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
                <Ionicons name="location-outline" size={11} color="rgba(244,241,234,0.45)" />
                <Text style={{ color: "rgba(244,241,234,0.45)", fontSize: 12 }}>
                  {post.artist_city ?? post.city}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {post.caption ? (
          <Text style={{ color: "rgba(244,241,234,0.88)", fontSize: 13.5, lineHeight: 20, marginBottom: 10 }} numberOfLines={2}>
            {post.caption}
          </Text>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {post.style_tags.slice(0, 3).map((tag) => <Tag key={tag} label={tag} />)}
        </View>
      </View>

      <ActionColumn post={post} onLike={handleLikePress} onSave={onSave} onFollow={onFollow} onMessage={onMessage} onProject={onProject} likeScale={likeScale} />
    </View>
  );
}
