import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../supabase";
import { PostWithCounts } from "@/types/database";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocation } from "./useLocation";

const PAGE_SIZE = 15;

export function useFeed() {
  const { session, profile } = useAuthStore();
  const { coords } = useLocation();
  const [posts, setPosts] = useState<PostWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  // Garde les IDs déjà chargés pour éviter les doublons au loadMore
  const loadedIds = useRef<Set<string>>(new Set());

  async function fetchPage(pageIndex: number, replace = false) {
    const userId = session?.user.id ?? null;
    const lat = coords?.lat ?? null;
    const lng = coords?.lng ?? null;
    const offset = pageIndex * PAGE_SIZE;

    let postIds: string[] = [];

    if (userId || (lat && lng)) {
      // Feed personnalisé via la fonction Postgres
      const { data: scored } = await supabase.rpc("get_personalized_feed", {
        p_user_id: userId,
        p_user_lat: lat,
        p_user_lng: lng,
        p_limit: PAGE_SIZE,
        p_offset: offset,
      });
      postIds = (scored ?? []).map((r: any) => r.post_id);
    } else {
      // Feed chronologique pour les guests sans géoloc
      const { data } = await supabase
        .from("posts_with_counts")
        .select("id")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      postIds = (data ?? []).map((r: any) => r.id);
    }

    if (!postIds.length) {
      setHasMore(false);
      return;
    }

    // Filtrer les IDs déjà chargés (loadMore ne doit pas répéter)
    const newIds = replace
      ? postIds
      : postIds.filter((id) => !loadedIds.current.has(id));

    if (!newIds.length) {
      setHasMore(false);
      return;
    }

    // Récupérer les posts complets dans l'ordre du score
    const { data: rawPosts } = await supabase
      .from("posts_with_counts")
      .select("*")
      .in("id", newIds);

    if (!rawPosts?.length) {
      setHasMore(false);
      return;
    }

    // Réordonner selon l'ordre retourné par la fonction (score DESC)
    const ordered = newIds
      .map((id) => rawPosts.find((p: any) => p.id === id))
      .filter(Boolean) as any[];

    // Enrichir avec is_liked / is_saved / is_following
    const enriched = userId
      ? await enrichPosts(ordered, userId)
      : ordered.map((p) => ({ ...p, is_liked: false, is_saved: false, is_following: false }));

    if (replace) {
      loadedIds.current = new Set(newIds);
      setPosts(enriched);
    } else {
      newIds.forEach((id) => loadedIds.current.add(id));
      setPosts((prev) => [...prev, ...enriched]);
    }

    setHasMore(postIds.length === PAGE_SIZE);
  }

  async function enrichPosts(data: any[], userId: string): Promise<PostWithCounts[]> {
    const postIds = data.map((p: any) => p.id);
    if (!postIds.length) return [];

    const [{ data: likes }, { data: saves }, { data: follows }] = await Promise.all([
      supabase.from("likes").select("post_id").eq("user_id", userId).in("post_id", postIds),
      supabase.from("saves").select("post_id").eq("user_id", userId).in("post_id", postIds),
      supabase.from("follows").select("artist_id").eq("follower_id", userId).in("artist_id", data.map((p: any) => p.artist_id)),
    ]);

    const likedIds = new Set(likes?.map((l: any) => l.post_id));
    const savedIds = new Set(saves?.map((s: any) => s.post_id));
    const followedIds = new Set(follows?.map((f: any) => f.artist_id));

    return data.map((p: any) => ({
      ...p,
      is_liked: likedIds.has(p.id),
      is_saved: savedIds.has(p.id),
      is_following: followedIds.has(p.artist_id),
    }));
  }

  useEffect(() => {
    setLoading(true);
    loadedIds.current = new Set();
    setPage(0);
    fetchPage(0, true).finally(() => setLoading(false));
  }, [session, coords]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    loadedIds.current = new Set();
    setPage(0);
    await fetchPage(0, true);
    setRefreshing(false);
  }, [session, coords]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing) return;
    const next = page + 1;
    setPage(next);
    await fetchPage(next);
  }, [page, hasMore, loading, refreshing, session, coords]);

  const updatePost = useCallback((postId: string, patch: Partial<PostWithCounts>) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, ...patch } : p));
  }, []);

  return { posts, loading, refreshing, refresh, loadMore, hasMore, updatePost };
}
