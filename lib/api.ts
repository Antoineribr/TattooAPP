import { supabase } from "./supabase";
import { ProjectStatus, RequestType, SizeCategory } from "@/types/database";

// ─── LIKES ────────────────────────────────────────────────
export async function toggleLike(postId: string, userId: string, liked: boolean) {
  if (liked) return supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
  return supabase.from("likes").insert({ post_id: postId, user_id: userId });
}

// ─── SAVES ────────────────────────────────────────────────
export async function toggleSave(postId: string, userId: string, saved: boolean) {
  if (saved) return supabase.from("saves").delete().eq("post_id", postId).eq("user_id", userId);
  return supabase.from("saves").insert({ post_id: postId, user_id: userId });
}

export async function isSaved(postId: string, userId: string): Promise<boolean> {
  const { data } = await supabase.from("saves").select("id").eq("post_id", postId).eq("user_id", userId).single();
  return !!data;
}

// ─── BOARDS ───────────────────────────────────────────────
export async function getBoards(userId: string) {
  const { data } = await supabase
    .from("boards")
    .select("*, board_items(count)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function createBoard(userId: string, name: string) {
  const { data, error } = await supabase
    .from("boards")
    .insert({ user_id: userId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renameBoard(boardId: string, name: string) {
  return supabase.from("boards").update({ name }).eq("id", boardId);
}

export async function deleteBoard(boardId: string) {
  return supabase.from("boards").delete().eq("id", boardId);
}

export async function addToBoard(boardId: string, postId: string) {
  return supabase.from("board_items").upsert({ board_id: boardId, post_id: postId });
}

export async function removeFromBoard(boardId: string, postId: string) {
  return supabase.from("board_items").delete().eq("board_id", boardId).eq("post_id", postId);
}

export async function getBoardItems(boardId: string) {
  const { data } = await supabase
    .from("board_items")
    .select("*, post:posts_with_counts(*)")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getPostBoards(postId: string, userId: string) {
  const { data } = await supabase
    .from("board_items")
    .select("board_id")
    .eq("post_id", postId)
    .in("board_id", supabase.from("boards").select("id").eq("user_id", userId) as any);
  return (data ?? []).map((r: any) => r.board_id as string);
}

// ─── FOLLOWS ──────────────────────────────────────────────
export async function toggleFollow(artistId: string, followerId: string, following: boolean) {
  if (following) {
    return supabase.from("follows").delete().eq("artist_id", artistId).eq("follower_id", followerId);
  }
  return supabase.from("follows").insert({ artist_id: artistId, follower_id: followerId });
}

// ─── CONVERSATIONS ────────────────────────────────────────
export async function getOrCreateConversation(
  clientId: string,
  artistId: string,
  projectRequestId?: string
): Promise<string> {
  // Cherche une conv existante
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("client_id", clientId)
    .eq("artist_id", artistId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ client_id: clientId, artist_id: artistId, project_request_id: projectRequestId ?? null })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body });
  if (error) throw error;
}

// ─── PROJET REQUESTS ──────────────────────────────────────
export interface CreateProjectPayload {
  client_id: string;
  artist_id: string;
  post_id?: string | null;
  request_type: RequestType;
  description: string;
  body_placement?: string;
  size_category?: SizeCategory;
  color_preference?: "color" | "black_grey" | "any";
  desired_style?: string;
  budget_min?: number;
  budget_max?: number;
  desired_date?: string;
  city?: string;
  reference_urls?: string[];
}

export async function createProjectRequest(payload: CreateProjectPayload): Promise<{ requestId: string; conversationId: string }> {
  const { reference_urls, ...requestData } = payload;

  const { data: req, error } = await supabase
    .from("project_requests")
    .insert(requestData)
    .select("id")
    .single();
  if (error) throw error;

  // Médias de référence
  if (reference_urls?.length) {
    await supabase.from("project_media").insert(
      reference_urls.map((url, i) => ({ request_id: req.id, url, position: i }))
    );
  }

  // Créer / récupérer la conversation
  const convId = await getOrCreateConversation(payload.client_id, payload.artist_id, req.id);

  // Message automatique
  const preview = payload.description
    ? `🎨 Nouvelle demande : "${payload.description.slice(0, 80)}${payload.description.length > 80 ? "…" : ""}"`
    : "🎨 Nouvelle demande de projet.";
  await sendMessage(convId, payload.client_id, preview);

  return { requestId: req.id, conversationId: convId };
}

export async function updateProjectStatus(requestId: string, status: ProjectStatus) {
  return supabase.from("project_requests").update({ status }).eq("id", requestId);
}

export async function getProjectRequests(userId: string, role: "client" | "artist") {
  const field = role === "client" ? "client_id" : "artist_id";
  const { data } = await supabase
    .from("project_requests")
    .select(`
      *,
      client:profiles!project_requests_client_id_fkey(id,display_name,avatar_url,city),
      artist:profiles!project_requests_artist_id_fkey(id,display_name,avatar_url,city),
      post:posts_with_counts(id,media_url,thumbnail_url,style_tags),
      media:project_media(*)
    `)
    .eq(field, userId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

// ─── PROFILE ──────────────────────────────────────────────
export async function updateProfile(userId: string, updates: Record<string, any>) {
  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
  if (error) throw error;
}

export async function createPost(payload: Record<string, any>) {
  const { data, error } = await supabase.from("posts").insert(payload).select("id").single();
  if (error) throw error;
  return data;
}

// ─── STATS PRO ────────────────────────────────────────────
export async function getArtistStats(artistId: string) {
  // Récupère d'abord les IDs des posts de l'artiste
  const { data: artistPosts } = await supabase
    .from("posts")
    .select("id")
    .eq("artist_id", artistId);

  const postIds = (artistPosts ?? []).map((p: any) => p.id);

  const [postsRes, followersRes, savesRes, requestsRes] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("artist_id", artistId),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("artist_id", artistId),
    postIds.length
      ? supabase.from("saves").select("id", { count: "exact", head: true }).in("post_id", postIds)
      : Promise.resolve({ count: 0 }),
    supabase.from("project_requests").select("id,status", { count: "exact" }).eq("artist_id", artistId),
  ]);

  return {
    posts_count: postsRes.count ?? 0,
    followers_count: followersRes.count ?? 0,
    saves_count: savesRes.count ?? 0,
    requests_count: requestsRes.count ?? 0,
    requests: (requestsRes.data ?? []) as any[],
  };
}
