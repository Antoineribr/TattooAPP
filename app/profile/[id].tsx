import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Dimensions, TouchableOpacity,
  ActivityIndicator, Alert, ActionSheetIOS, Platform, Linking,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { toggleFollow, getOrCreateConversation } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Profile, PostWithCounts } from "@/types/database";
import { CommentsSheet } from "@/components/ui/CommentsSheet";
import { Avatar } from "@/components/ui/Avatar";
import { AuthPrompt } from "@/components/ui/AuthPrompt";
import { ReportSheet } from "@/components/ui/ReportSheet";
import { ReviewSheet } from "@/components/ui/ReviewSheet";

const { width: W } = Dimensions.get("window");
const GRID_SIZE = (W - 3) / 3;

type Tab = "posts" | "flash" | "avis" | "about";

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile: myProfile } = useAuthStore();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostWithCounts[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("posts");
  const flashPosts = posts.filter((p) => p.availability_type === "flash_available");
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [authPrompt, setAuthPrompt] = useState<"follow" | "contact" | "project" | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [canReview, setCanReview] = useState<string | null>(null); // project_request_id si éligible

  const isOwn = session?.user.id === id;
  const isCurrentUserArtist = profile?.role === "artist";
  const isArtist = profile?.role === "artist";

  useEffect(() => { if (id) loadProfile(); }, [id]);

  async function loadProfile() {
    setLoading(true);
    const [{ data: prof }, { data: postsData }, { count: fCount }, { data: followData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase.from("posts_with_counts").select("*").eq("artist_id", id).order("created_at", { ascending: false }),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("artist_id", id),
      session ? supabase.from("follows").select("id").eq("artist_id", id).eq("follower_id", session.user.id).single() : Promise.resolve({ data: null }),
    ]);
    if (prof) setProfile(prof as Profile);
    if (postsData) setPosts(postsData as PostWithCounts[]);
    setFollowersCount(fCount ?? 0);
    setIsFollowing(!!followData);

    // Charger les avis
    const { data: revData } = await supabase
      .from("reviews")
      .select("*, client:profiles!reviews_client_id_fkey(display_name, avatar_url)")
      .eq("artist_id", id)
      .order("created_at", { ascending: false });
    setReviews(revData ?? []);

    // Vérifier si l'utilisateur connecté peut laisser un avis (projet terminé)
    if (session && session.user.id !== id) {
      const { data: doneReq } = await supabase
        .from("project_requests")
        .select("id")
        .eq("artist_id", id)
        .eq("client_id", session.user.id)
        .eq("status", "done")
        .limit(1)
        .single();
      if (doneReq) {
        // Vérifier s'il n'a pas déjà un avis pour ce projet
        const { data: existing } = await supabase
          .from("reviews")
          .select("id")
          .eq("client_id", session.user.id)
          .eq("project_request_id", doneReq.id)
          .single();
        if (!existing) setCanReview(doneReq.id);
      }
    }

    setLoading(false);
  }

  async function handleFollow() {
    if (!session) { setAuthPrompt("follow"); return; }
    if (isOwn) return;
    setIsFollowing((f) => !f);
    setFollowersCount((c) => c + (isFollowing ? -1 : 1));
    try { await toggleFollow(id!, session.user.id, isFollowing); }
    catch { setIsFollowing((f) => !f); setFollowersCount((c) => c + (isFollowing ? 1 : -1)); }
  }

  async function handleMessage() {
    if (!session) { setAuthPrompt("contact"); return; }
    const convId = await getOrCreateConversation(session.user.id, id!);
    router.push(`/chat/${convId}`);
  }

  function handleProject() {
    if (!session) { setAuthPrompt("project"); return; }
    router.push({ pathname: "/project/request", params: { artistId: id, artistName: profile?.display_name ?? "" } });
  }

  async function handlePostOptions(post: PostWithCounts) {
    if (!isOwn) return;
    router.push(`/pro/post-actions/${post.id}` as any);
  }

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color="#B8903E" />
    </View>
  );

  if (!profile) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F5F3EE" }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>@{profile.username}</Text>
          <View style={{ marginLeft: "auto", flexDirection: "row", gap: 8 }}>
            {isOwn ? (
              <TouchableOpacity onPress={() => router.push("/edit/profile")}>
                <Ionicons name="create-outline" size={22} color="#B8903E" />
              </TouchableOpacity>
            ) : session && !isOwn && (
              <TouchableOpacity onPress={() => {
                if (Platform.OS === "ios") {
                  ActionSheetIOS.showActionSheetWithOptions(
                    { options: ["Annuler", "Signaler", isBlocked ? "Débloquer" : "Bloquer"], cancelButtonIndex: 0, destructiveButtonIndex: 2 },
                    async (idx) => {
                      if (idx === 1) setShowReport(true);
                      if (idx === 2) {
                        if (isBlocked) {
                          await supabase.from("blocks").delete().eq("blocker_id", session.user.id).eq("blocked_id", id);
                          setIsBlocked(false);
                        } else {
                          await supabase.from("blocks").insert({ blocker_id: session.user.id, blocked_id: id });
                          setIsBlocked(true);
                          Alert.alert("Utilisateur bloqué", "Tu ne verras plus son contenu.");
                        }
                      }
                    }
                  );
                } else {
                  Alert.alert("Options", undefined, [
                    { text: "Signaler", onPress: () => setShowReport(true) },
                    { text: isBlocked ? "Débloquer" : "Bloquer", style: "destructive", onPress: async () => {
                      if (isBlocked) {
                        await supabase.from("blocks").delete().eq("blocker_id", session.user.id).eq("blocked_id", id);
                        setIsBlocked(false);
                      } else {
                        await supabase.from("blocks").insert({ blocker_id: session.user.id, blocked_id: id });
                        setIsBlocked(true);
                      }
                    }},
                    { text: "Annuler", style: "cancel" },
                  ]);
                }
              }}>
                <Ionicons name="ellipsis-horizontal" size={22} color="#6B6B7A" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ alignItems: "center", paddingHorizontal: 20 }}>
          <Avatar uri={profile.avatar_url} name={profile.display_name} size={92} />

          {isArtist && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10, backgroundColor: "rgba(184,144,62,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "rgba(201,162,75,0.25)" }}>
              <Ionicons name="color-palette-outline" size={12} color="#B8903E" />
              <Text style={{ color: "#B8903E", fontSize: 11, fontWeight: "700" }}>Tatoueur·se pro</Text>
            </View>
          )}

          <Text style={{ color: "#1A1A1A", fontWeight: "800", fontSize: 22, marginTop: 8 }}>{profile.display_name}</Text>
          {profile.city && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Ionicons name="location-outline" size={13} color="#6B6B7A" />
              <Text style={{ color: "#6B6B7A", fontSize: 13 }}>{profile.city}</Text>
            </View>
          )}
          {profile.bio && (
            <Text style={{ color: "rgba(26,26,26,0.65)", fontSize: 14, textAlign: "center", marginTop: 10, lineHeight: 21, paddingHorizontal: 16 }}>
              {profile.bio}
            </Text>
          )}

          {/* Styles */}
          {profile.style_tags?.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 10 }}>
              {profile.style_tags.map((s) => (
                <View key={s} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }}>
                  <Text style={{ color: "#6B6B7A", fontSize: 12 }}>{s}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats */}
          <View style={{ flexDirection: "row", gap: 40, marginTop: 20 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#1A1A1A", fontWeight: "800", fontSize: 20 }}>{posts.length}</Text>
              <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 2 }}>posts</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "rgba(0,0,0,0.06)" }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#1A1A1A", fontWeight: "800", fontSize: 20 }}>{followersCount}</Text>
              <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 2 }}>abonnés</Text>
            </View>
            {reviews.length > 0 && (() => {
              const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
              return (
                <>
                  <View style={{ width: 1, backgroundColor: "rgba(0,0,0,0.06)" }} />
                  <TouchableOpacity style={{ alignItems: "center" }} onPress={() => setTab("avis")}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Ionicons name="star" size={14} color="#B8903E" />
                      <Text style={{ color: "#1A1A1A", fontWeight: "800", fontSize: 20 }}>{avg.toFixed(1)}</Text>
                    </View>
                    <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 2 }}>{reviews.length} avis</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>

          {/* Boutons gestion pro (isOwn + artiste) */}
          {isOwn && isArtist && (
            <View style={{ gap: 8, marginTop: 18, width: "100%" }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => router.push("/pro/locations")}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#FFFFFF", borderRadius: 12, paddingVertical: 11, borderWidth: 1.5, borderColor: "rgba(0,0,0,0.08)" }}
                >
                  <Ionicons name="location-outline" size={16} color="#B8903E" />
                  <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 13 }}>Mes lieux</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push("/pro/availability")}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#FFFFFF", borderRadius: 12, paddingVertical: 11, borderWidth: 1.5, borderColor: "rgba(0,0,0,0.08)" }}
                >
                  <Ionicons name="time-outline" size={16} color="#B8903E" />
                  <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 13 }}>Disponibilités</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* CTAs */}
          {!isOwn && (
            <View style={{ gap: 10, marginTop: 18, width: "100%" }}>
              {/* CTA principal : Demander un projet — masqué si l'utilisateur connecté est un artiste */}
              {isArtist && !isCurrentUserArtist && (
                <TouchableOpacity
                  onPress={handleProject}
                  style={{ backgroundColor: "#B8903E", borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
                >
                  <Ionicons name="color-palette-outline" size={18} color="#F5F3EE" />
                  <Text style={{ color: "#F5F3EE", fontWeight: "800", fontSize: 15 }}>Demander un projet</Text>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={handleFollow}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center",
                    backgroundColor: isFollowing ? "transparent" : "#FFFFFF",
                    borderWidth: 1.5, borderColor: isFollowing ? "#B8903E" : "rgba(0,0,0,0.1)",
                  }}
                >
                  <Text style={{ color: isFollowing ? "#B8903E" : "#1A1A1A", fontWeight: "700", fontSize: 14 }}>
                    {isFollowing ? "Abonné·e" : "Suivre"}
                  </Text>
                </TouchableOpacity>
                {!isCurrentUserArtist && (
                  <TouchableOpacity
                    onPress={handleMessage}
                    style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "rgba(0,0,0,0.1)" }}
                  >
                    <Ionicons name="chatbubble-outline" size={15} color="#1A1A1A" />
                    <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 14 }}>Message</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Liens */}
          <View style={{ flexDirection: "row", gap: 16, marginTop: 14 }}>
            {profile.instagram_handle && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://instagram.com/${profile.instagram_handle}`)}
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                <Ionicons name="logo-instagram" size={15} color="#6B6B7A" />
                <Text style={{ color: "#6B6B7A", fontSize: 13 }}>@{profile.instagram_handle}</Text>
              </TouchableOpacity>
            )}
            {(profile as any).booking_url && (
              <TouchableOpacity
                onPress={() => Linking.openURL((profile as any).booking_url)}
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                <Ionicons name="calendar-outline" size={15} color="#6B6B7A" />
                <Text style={{ color: "#6B6B7A", fontSize: 13 }}>Réserver</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#FFFFFF", marginBottom: 2 }}>
        {([["posts", "Publications"], ["flash", "Flashs"], ["avis", "Avis"], ["about", "À propos"]] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setTab(key)}
            style={{ flex: 1, paddingVertical: 14, alignItems: "center", borderBottomWidth: 2, borderBottomColor: tab === key ? "#B8903E" : "transparent" }}
          >
            <Text style={{ color: tab === key ? "#B8903E" : "#6B6B7A", fontWeight: "600", fontSize: 14 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grille posts */}
      {tab === "posts" && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 1.5 }}>
          {posts.map((post) => (
            <TouchableOpacity
              key={post.id}
              onPress={() => router.push(`/post/${post.id}`)}
              onLongPress={() => handlePostOptions(post)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: post.thumbnail_url ?? post.media_url }} style={{ width: GRID_SIZE, height: GRID_SIZE }} contentFit="cover" />
              {post.media_type === "video" && (
                <View style={{ position: "absolute", top: 6, right: 6 }}>
                  <Ionicons name="play-circle" size={18} color="rgba(244,241,234,0.9)" />
                </View>
              )}
            </TouchableOpacity>
          ))}
          {!posts.length && (
            <View style={{ width: "100%", paddingTop: 60, alignItems: "center" }}>
              <Ionicons name="images-outline" size={52} color="rgba(0,0,0,0.1)" />
              <Text style={{ color: "#6B6B7A", fontSize: 15, marginTop: 16, textAlign: "center" }}>
                {isOwn ? "Tu n'as pas encore publié." : "Aucune publication."}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Tab Avis */}
      {tab === "avis" && (
        <View style={{ padding: 20, gap: 14 }}>
          {/* Résumé note */}
          {reviews.length > 0 && (() => {
            const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
            return (
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)" }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: "#1A1A1A", fontSize: 40, fontWeight: "800", lineHeight: 44 }}>{avg.toFixed(1)}</Text>
                  <View style={{ flexDirection: "row", gap: 2, marginTop: 4 }}>
                    {[1,2,3,4,5].map((s) => (
                      <Ionicons key={s} name={s <= Math.round(avg) ? "star" : "star-outline"} size={14} color="#B8903E" />
                    ))}
                  </View>
                  <Text style={{ color: "#6B6B7A", fontSize: 12, marginTop: 4 }}>{reviews.length} avis</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  {[5,4,3,2,1].map((s) => {
                    const count = reviews.filter((r) => r.rating === s).length;
                    return (
                      <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ color: "#6B6B7A", fontSize: 11, width: 10 }}>{s}</Text>
                        <View style={{ flex: 1, height: 5, backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 3 }}>
                          <View style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%`, height: "100%", backgroundColor: "#B8903E", borderRadius: 3 }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })()}

          {/* Bouton laisser un avis */}
          {canReview && !isOwn && (
            <TouchableOpacity
              onPress={() => setShowReview(true)}
              style={{ backgroundColor: "#B8903E", borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
            >
              <Ionicons name="star-outline" size={16} color="#FFF" />
              <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 15 }}>Laisser un avis</Text>
            </TouchableOpacity>
          )}

          {/* Liste des avis */}
          {reviews.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 32 }}>
              <Ionicons name="star-outline" size={40} color="rgba(0,0,0,0.1)" />
              <Text style={{ color: "#6B6B7A", fontSize: 15, marginTop: 12, textAlign: "center" }}>Aucun avis pour l'instant</Text>
              {canReview && !isOwn && <Text style={{ color: "#B8903E", fontSize: 13, marginTop: 6, textAlign: "center" }}>Sois le premier à laisser un avis !</Text>}
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {reviews.map((r) => (
                <View key={r.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Avatar uri={r.client?.avatar_url} name={r.client?.display_name ?? "?"} size={34} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 14 }}>{r.client?.display_name ?? "Client"}</Text>
                      <View style={{ flexDirection: "row", gap: 2, marginTop: 2 }}>
                        {[1,2,3,4,5].map((s) => (
                          <Ionicons key={s} name={s <= r.rating ? "star" : "star-outline"} size={12} color="#B8903E" />
                        ))}
                      </View>
                    </View>
                    <Text style={{ color: "#9A9AA5", fontSize: 11 }}>
                      {new Date(r.created_at).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                    </Text>
                  </View>
                  {r.body && <Text style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 20 }}>{r.body}</Text>}
                </View>
              ))}
            </View>
          )}

          <ReviewSheet
            visible={showReview}
            artistId={id!}
            artistName={profile.display_name}
            projectRequestId={canReview}
            onClose={() => setShowReview(false)}
            onSubmitted={() => {
              setShowReview(false);
              setCanReview(null);
              loadProfile();
            }}
          />
        </View>
      )}

      {/* Tab Flash */}
      {tab === "flash" && (
        <View>
          {flashPosts.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <Ionicons name="flash-outline" size={40} color="rgba(0,0,0,0.1)" />
              <Text style={{ color: "#6B6B7A", fontSize: 15, marginTop: 12, textAlign: "center" }}>
                Aucun flash disponible pour le moment
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", padding: 2, gap: 2 }}>
              {flashPosts.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => router.push(`/post/${p.id}`)}
                  style={{ width: "33.33%", aspectRatio: 1, position: "relative" }}
                >
                  <Image source={{ uri: p.thumbnail_url ?? p.media_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  <View style={{ position: "absolute", top: 6, left: 6, backgroundColor: "#B8903E", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: "#F5F3EE", fontSize: 10, fontWeight: "800" }}>FLASH</Text>
                  </View>
                  {p.price_min != null && (
                    <View style={{ position: "absolute", bottom: 6, right: 6, backgroundColor: "rgba(245,243,238,0.8)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: "#1A1A1A", fontSize: 11, fontWeight: "700" }}>{p.price_min}€</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* À propos */}
      {tab === "about" && (
        <View style={{ padding: 20, gap: 16 }}>
          {profile.bio && <AboutRow icon="document-text-outline" label="Bio" value={profile.bio} />}
          {profile.city && <AboutRow icon="location-outline" label="Ville" value={profile.city} />}
          {profile.style_tags?.length > 0 && <AboutRow icon="color-palette-outline" label="Styles" value={profile.style_tags.join(", ")} />}
          {(profile as any).years_experience && <AboutRow icon="time-outline" label="Expérience" value={`${(profile as any).years_experience} ans`} />}
          {(profile as any).starting_price && <AboutRow icon="pricetag-outline" label="À partir de" value={`${(profile as any).starting_price}€`} />}
          {profile.instagram_handle && <AboutRow icon="logo-instagram" label="Instagram" value={`@${profile.instagram_handle}`} />}
          {(profile as any).booking_url && <AboutRow icon="calendar-outline" label="Réservation" value="Voir le lien" />}
          {!(profile.bio || profile.city || profile.instagram_handle) && (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Text style={{ color: "#6B6B7A", textAlign: "center" }}>Aucune info renseignée.</Text>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 80 }} />

      {authPrompt && (
        <AuthPrompt
          visible
          context={authPrompt}
          onClose={() => setAuthPrompt(null)}
        />
      )}

      <ReportSheet
        visible={showReport}
        onClose={() => setShowReport(false)}
        reportedUserId={id as string}
      />
    </ScrollView>
  );
}

function AboutRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
        <Ionicons name={icon} size={17} color="#6B6B7A" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#6B6B7A", fontSize: 12, fontWeight: "600", letterSpacing: 0.5, marginBottom: 2 }}>{label}</Text>
        <Text style={{ color: "#1A1A1A", fontSize: 15, lineHeight: 22 }}>{value}</Text>
      </View>
    </View>
  );
}
