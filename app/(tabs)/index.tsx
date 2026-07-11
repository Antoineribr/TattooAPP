import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { View, Text, ActivityIndicator, FlatList, Platform, Pressable, Modal } from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { useFeed } from "@/lib/hooks/useFeed";
import { FeedItem } from "@/components/feed/FeedItem";
import { AuthPrompt } from "@/components/ui/AuthPrompt";
import { BoardPicker } from "@/components/ui/BoardPicker";
import { toggleLike, toggleSave, toggleFollow, getOrCreateConversation } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useTabBarStore } from "@/store/useTabBarStore";
import { PostWithCounts } from "@/types/database";
import { useAppViewport } from "@/lib/layout";

type AuthContext = "save" | "follow" | "contact" | "project" | "default";

export default function FeedScreen() {
  const { width: W, height: H, isDesktopWeb } = useAppViewport();
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
    if (Platform.OS === "web") {
      setActiveIndex(Math.round(lastScrollY.current / H));
      // Coque téléphone (desktop) : uniquement pendant que le feed est affiché
      if (typeof document !== "undefined") document.body.classList.add("ink-feed-shell");
    }
    return () => {
      // En quittant la page : -1 partout pour couper vidéo ET musique
      setVisible(true);
      setActiveIndex(-1);
      hasScrolled.current = false;
      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.body.classList.remove("ink-feed-shell");
      }
    };
  }, [H, setVisible]));

  const isArtist = profile?.role === "artist";
  const router = useRouter();
  const exitDesktopFeed = useCallback(() => {
    router.replace("/(tabs)/search" as any);
  }, [router]);

  useEffect(() => {
    if (!isDesktopWeb || typeof document === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") exitDesktopFeed();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [exitDesktopFeed, isDesktopWeb]);

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

  const feedList = (
      <FlatList
        style={{ width: W, height: H }}
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
  );

  const actionModals = (
    <>
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
    </>
  );

  if (isDesktopWeb) {
    return (
      <>
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={exitDesktopFeed}
          accessibilityViewIsModal
        >
          <View style={{ flex: 1, backgroundColor: "#0A0A0B" }}>
            <Pressable
              onPress={exitDesktopFeed}
              accessibilityRole="button"
              accessibilityLabel="Fermer le feed et revenir à la recherche"
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            >
              <View style={{ flex: 1, padding: 28, opacity: 0.82 }}>
                <View style={{ height: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18 }}>
                  <Text style={{ color: "#C9A24B", fontSize: 26, fontWeight: "900", letterSpacing: 7 }}>INK</Text>
                  <Text style={{ color: "rgba(244,241,234,0.72)", fontSize: 14, fontWeight: "700" }}>Découvrir · Artistes · Projets</Text>
                </View>
                <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, overflow: "hidden" }}>
                  {posts.slice(0, 18).map((post) => (
                    <Image
                      key={post.id}
                      source={{ uri: post.thumbnail_url ?? post.media_url }}
                      style={{ width: "16%", minWidth: 150, flexGrow: 1, aspectRatio: 0.82, borderRadius: 16 }}
                      contentFit="cover"
                      blurRadius={18}
                    />
                  ))}
                </View>
              </View>
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(7,7,9,0.68)" }} />
            </Pressable>

            <View pointerEvents="box-none" style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 18 }}>
              <View
                style={{
                  width: W,
                  height: H,
                  borderRadius: 28,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  backgroundColor: "#0A0A0B",
                  shadowColor: "#000",
                  shadowOpacity: 0.72,
                  shadowRadius: 40,
                  shadowOffset: { width: 0, height: 24 },
                }}
              >
                {feedList}
              </View>
            </View>

            <Pressable
              onPress={exitDesktopFeed}
              accessibilityRole="button"
              accessibilityLabel="Fermer le feed"
              style={{ position: "absolute", top: 24, right: 28, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(20,20,22,0.88)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }}
            >
              <Text style={{ color: "#F4F1EA", fontSize: 26, lineHeight: 30 }}>×</Text>
            </Pressable>
          </View>
        </Modal>
        {actionModals}
      </>
    );
  }

  return (
    <View style={{ width: W, height: H, alignSelf: "center", backgroundColor: "#F5F3EE" }}>
      {feedList}
      {actionModals}
    </View>
  );
}
