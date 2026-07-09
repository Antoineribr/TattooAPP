import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { View, Text, ActivityIndicator, Dimensions, FlatList, Platform } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useFeed } from "@/lib/hooks/useFeed";
import { FeedItem } from "@/components/feed/FeedItem";
import { AuthPrompt } from "@/components/ui/AuthPrompt";
import { WelcomeIntro } from "@/components/ui/WelcomeIntro";
import { BoardPicker } from "@/components/ui/BoardPicker";
import { toggleLike, toggleSave, toggleFollow, getOrCreateConversation } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useTabBarStore } from "@/store/useTabBarStore";
import { PostWithCounts } from "@/types/database";

// Sur web, "screen" = écran physique (faux) ; il faut la fenêtre du navigateur
const { height: H } = Dimensions.get(Platform.OS === "web" ? "window" : "screen");

type AuthContext = "save" | "follow" | "contact" | "project" | "default";

export default function FeedScreen() {
  const { posts, loading, refreshing, refresh, loadMore, updatePost } = useFeed();
  const { session, profile } = useAuthStore();
  const { setVisible } = useTabBarStore();
  const lastScrollY = useRef(0);
  // Sur web la viewability de FlatList est peu fiable : le 1er post est actif d'office
  // (pas de risque musique : le son démarre muet sur web)
  const initialIndex = Platform.OS === "web" ? 0 : -1;
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const hasScrolled = useRef(false);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    // Sur web l'index actif est calculé dans onScroll : la viewability est trop
    // instable pendant le snap et re-pause les vidéos
    if (Platform.OS === "web") return;
    if (!hasScrolled.current) return;
    if (viewableItems[0]) setActiveIndex(viewableItems[0].index ?? -1);
    else setActiveIndex(-1);
  });
  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 80 }), []);

  useEffect(() => {
    hasScrolled.current = false;
    setActiveIndex(initialIndex);
  }, [session?.user.id]);

  useFocusEffect(useCallback(() => {
    // Au retour sur le feed : réactiver le post visible (web garde la position de scroll)
    if (Platform.OS === "web") setActiveIndex(Math.round(lastScrollY.current / H));
    return () => {
      // En quittant la page : -1 partout pour couper vidéo ET musique
      setVisible(true);
      setActiveIndex(-1);
      hasScrolled.current = false;
    };
  }, []));

  const isArtist = profile?.role === "artist";
  const router = useRouter();

  const [authPrompt, setAuthPrompt] = useState<{ visible: boolean; context: AuthContext; pendingAction?: any }>({ visible: false, context: "default" });
  const [boardPicker, setBoardPicker] = useState<{ visible: boolean; postId: string }>({ visible: false, postId: "" });

  function requireAuth(context: AuthContext, fn: () => void, pendingAction?: any) {
    if (!session) { setAuthPrompt({ visible: true, context, pendingAction }); return; }
    fn();
  }

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color="#B8903E" size="large" />
    </View>
  );

  if (!posts.length) return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#B8903E", fontSize: 28, fontWeight: "800", letterSpacing: 2 }}>INK</Text>
      <Text style={{ color: "#6B6B7A", fontSize: 14, marginTop: 8 }}>Aucun post pour l'instant</Text>
    </View>
  );

  async function handleLike(post: PostWithCounts) {
    requireAuth("default", async () => {
      const wasLiked = post.is_liked ?? false;
      updatePost(post.id, { is_liked: !wasLiked, likes_count: post.likes_count + (wasLiked ? -1 : 1) });
      try { await toggleLike(post.id, session!.user.id, wasLiked); }
      catch { updatePost(post.id, { is_liked: wasLiked, likes_count: post.likes_count }); }
    });
  }

  async function handleSave(post: PostWithCounts) {
    requireAuth("save", () => {
      if (post.is_saved) {
        // Désauvegarder direct
        updatePost(post.id, { is_saved: false });
        toggleSave(post.id, session!.user.id, true).catch(() => updatePost(post.id, { is_saved: true }));
      } else {
        // Ouvrir le board picker
        setBoardPicker({ visible: true, postId: post.id });
        updatePost(post.id, { is_saved: true });
      }
    });
  }

  async function handleFollow(post: PostWithCounts) {
    requireAuth("follow", async () => {
      const wasFollowing = post.is_following ?? false;
      updatePost(post.id, { is_following: !wasFollowing });
      try { await toggleFollow(post.artist_id, session!.user.id, wasFollowing); }
      catch { updatePost(post.id, { is_following: wasFollowing }); }
    });
  }

  async function handleMessage(post: PostWithCounts) {
    if (isArtist) return; // les artistes ne contactent pas, ils reçoivent
    requireAuth("contact", async () => {
      const convId = await getOrCreateConversation(session!.user.id, post.artist_id);
      router.push(`/chat/${convId}`);
    });
  }

  async function handleProject(post: PostWithCounts) {
    if (isArtist) return;
    requireAuth("project", () => {
      router.push({
        pathname: "/project/request",
        params: {
          artistId: post.artist_id,
          artistName: post.display_name,
          postId: post.id,
          postImage: post.thumbnail_url ?? post.media_url,
        },
      });
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE" }}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <FeedItem
            post={item}
            isActive={index === activeIndex}
            onLike={() => handleLike(item)}
            onSave={() => handleSave(item)}
            onFollow={() => handleFollow(item)}
            onMessage={isArtist ? () => {} : () => handleMessage(item)}
            onProject={isArtist ? () => {} : () => handleProject(item)}
          />
        )}
        getItemLayout={(_, index) => ({ length: H, offset: H * index, index })}
        pagingEnabled
        snapToInterval={H}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onMomentumScrollBegin={() => { hasScrolled.current = true; }}
        onScroll={(e) => {
          // Sur web, onMomentumScrollBegin n'existe pas : on détecte le scroll utilisateur ici
          const y = e.nativeEvent.contentOffset.y;
          lastScrollY.current = y;
          if (y > 10) hasScrolled.current = true;
          if (Platform.OS === "web") {
            // La viewability est peu fiable : le post actif = position de scroll / hauteur
            setActiveIndex(Math.round(y / H));
            // Et onEndReached ne se déclenche pas : pagination manuelle à 2 écrans de la fin
            const { contentSize, layoutMeasurement } = e.nativeEvent;
            if (contentSize && layoutMeasurement && y + layoutMeasurement.height * 2 >= contentSize.height) loadMore();
          }
        }}
        scrollEventThrottle={50}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig}
        onRefresh={refresh}
        refreshing={refreshing}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={1}
        removeClippedSubviews
      />

      <AuthPrompt
        visible={authPrompt.visible}
        context={authPrompt.context}
        pendingAction={authPrompt.pendingAction}
        onClose={() => setAuthPrompt({ visible: false, context: "default" })}
      />

      <BoardPicker
        visible={boardPicker.visible}
        postId={boardPicker.postId}
        onClose={() => setBoardPicker({ visible: false, postId: "" })}
        onSaved={() => setBoardPicker({ visible: false, postId: "" })}
      />

      <WelcomeIntro />
    </View>
  );
}
