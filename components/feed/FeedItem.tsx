import { useRef, useState, useEffect } from "react";
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

const VIDEO_FILE_PATTERN = /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i;

function getMediaType(uri: string): Slide["type"] {
  return VIDEO_FILE_PATTERN.test(uri) ? "video" : "image";
}

function VideoSlide({ uri, paused, muted }: { uri: string; paused: boolean; muted: boolean }) {
  const containerRef = useRef<View>(null);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
    p.play();
  });

  // Web : l'élément <video> réel de CE slide (player.playing d'expo-video
  // reflète l'intention, pas l'état DOM — on ne peut pas s'y fier)
  function domVideo(): HTMLVideoElement | null {
    if (Platform.OS !== "web") return null;
    return (containerRef.current as any)?.querySelector?.("video") ?? null;
  }

  useEffect(() => {
    if (paused) {
      player.pause();
      // Web : la synchro interne d'expo-video peut relancer un élément hors
      // écran — on force la pause tant que le slide est inactif
      if (Platform.OS === "web") {
        domVideo()?.pause();
        const enforcer = setInterval(() => {
          const el = domVideo();
          if (el && !el.paused) el.pause();
        }, 800);
        return () => clearInterval(enforcer);
      }
      return;
    }
    player.play();
    // Web : keepalive tant que le slide est actif. Deux raisons :
    // 1) au montage du 1er post, play() part avant que le <video> soit dans le DOM ;
    // 2) la synchro interne d'expo-video propage les "pause" d'éléments fantômes
    //    (démontés par la virtualisation) vers la vidéo visible.
    // On relance donc l'élément DOM dès qu'il se met en pause à tort.
    if (Platform.OS === "web") {
      const keepalive = setInterval(() => {
        const el = domVideo();
        if (!el) return;
        if (el.playsInline !== true) { el.playsInline = true; el.setAttribute("playsinline", ""); }
        if (el.paused) { el.muted = muted; el.play().catch(() => {}); }
      }, 500);
      return () => clearInterval(keepalive);
    }
  }, [paused]);

  useEffect(() => {
    player.muted = muted;
    const el = domVideo();
    if (el) el.muted = muted;
  }, [muted]);

  return (
    <View ref={containerRef} style={{ width: W, height: H }}>
      <VideoView player={player} style={{ width: W, height: H }} contentFit="cover" nativeControls={false} />
    </View>
  );
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
  const { muted, setMuted } = useTabBarStore();

  useEffect(() => {
    // Les navigateurs bloquent l'autoplay avec son. On charge donc la musique
    // après l'action explicite « activer le son », puis à chaque changement de post.
    if (!post.music_url || !isActive || muted) return;

    let cancelled = false;
    let mySound: Audio.Sound | null = null;
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });

    (async () => {
      await stopGlobalSound();
      if (cancelled) return;

      try {
        const { sound: s } = await Audio.Sound.createAsync(
          { uri: post.music_url! },
          { shouldPlay: !isPaused, isLooping: true, volume: 0.7 },
        );
        if (cancelled) {
          try { await s.stopAsync(); } catch {}
          await s.unloadAsync();
          return;
        }
        mySound = s;
        globalSound = s;
        soundRef.current = s;
      } catch (error) {
        // Ne pas masquer le problème pendant le développement : une URL audio
        // invalide ou refusée par le navigateur doit rester visible dans la console.
        if (__DEV__) console.warn("Lecture audio impossible", error);
      }
    })();

    return () => {
      cancelled = true;
      if (mySound) {
        try { mySound.stopAsync(); } catch {}
        mySound.unloadAsync();
        if (globalSound === mySound) globalSound = null;
        if (soundRef.current === mySound) soundRef.current = null;
      }
    };
  }, [post.music_url, isActive, muted]);

  useEffect(() => {
    if (!soundRef.current) return;
    if (isPaused) soundRef.current.pauseAsync();
    else soundRef.current.playAsync();
  }, [isPaused]);

  useEffect(() => {
    soundRef.current?.setVolumeAsync(muted ? 0 : 0.7);
  }, [muted]);

  const slides: Slide[] = [
    {
      uri: post.media_url,
      type: post.media_type === "video" ? "video" : getMediaType(post.media_url),
    },
    ...(post.media_urls ?? []).map((uri) => ({ uri, type: getMediaType(uri) })),
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
        onPress={() => setMuted(!muted)}
        accessibilityRole="button"
        accessibilityLabel={muted ? "Activer le son" : "Couper le son"}
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
