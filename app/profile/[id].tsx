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
import {
  Profile, PostWithCounts, ArtistAvailability, ArtistLocation,
  AVAILABILITY_STATUS_LABELS, AVAILABILITY_STATUS_COLORS,
} from "@/types/database";
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
  const [authPrompt, setAuthPrompt] = useState<"follow" | "contact" | "project" | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [canReview, setCanReview] = useState<string | null>(null); // project_request_id si éligible
  const [availability, setAvailability] = useState<ArtistAvailability[]>([]);
  const [locations, setLocations] = useState<ArtistLocation[]>([]);

  const isOwn = session?.user.id === id;
  // Le rôle de l'utilisateur CONNECTÉ (pas celui du profil consulté)
  const isCurrentUserArtist = myProfile?.role === "artist";
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

    // Charger les avis + disponibilités + lieux (guest spots)
    const [{ data: revData }, { data: availData }, { data: locData }] = await Promise.all([
      supabase.from("reviews")
        .select("*, client:profiles!reviews_client_id_fkey(display_name, avatar_url)")
        .eq("artist_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("artist_availability").select("*").eq("artist_id", id),
      supabase.from("artist_locations").select("*").eq("artist_id", id).order("created_at"),
    ]);
    setReviews(revData ?? []);
    setAvailability(availData ?? []);
    setLocations(locData ?? []);

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
    <View style={{ flex: 1, backgroundColor: "#0A0A0B", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color="#C9A24B" />
    </View>
  );

  if (!profile) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0A0A0B" }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color="#F4F1EA" />
          </TouchableOpacity>
          <Text style={{ color: "#F4F1EA", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>@{profile.username}</Text>
          <View style={{ marginLeft: "auto", flexDirection: "row", gap: 8 }}>
            {isOwn ? (
              <TouchableOpacity onPress={() => router.push("/edit/profile")}>
                <Ionicons name="create-outline" size={22} color="#C9A24B" />
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
                <Ionicons name="ellipsis-horizontal" size={22} color="rgba(244,241,234,0.55)" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ alignItems: "center", paddingHorizontal: 20 }}>
          <Avatar uri={profile.avatar_url} name={profile.display_name} size={92} />

          {isArtist && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10, backgroundColor: "rgba(201,162,75,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "rgba(201,162,75,0.25)" }}>
              <Ionicons name="color-palette-outline" size={12} color="#C9A24B" />
              <Text style={{ color: "#C9A24B", fontSize: 11, fontWeight: "700" }}>Tatoueur·se pro</Text>
            </View>
          )}

          <Text style={{ color: "#F4F1EA", fontWeight: "800", fontSize: 22, marginTop: 8 }}>{profile.display_name}</Text>
          {profile.city && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Ionicons name="location-outline" size={13} color="rgba(244,241,234,0.55)" />
              <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 13 }}>{profile.city}</Text>
            </View>
          )}
          {profile.bio && (
            <Text style={{ color: "rgba(244,241,234,0.65)", fontSize: 14, textAlign: "center", marginTop: 10, lineHeight: 21, paddingHorizontal: 16 }}>
              {profile.bio}
            </Text>
          )}

          {/* Disponibilité — l'info que le client cherche en premier */}
          {isArtist && availability.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 12 }}>
              {availability.map((av) => {
                const color = AVAILABILITY_STATUS_COLORS[av.status] ?? "#6B6B7A";
                return (
                  <View key={av.id} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: `${color}16`, borderWidth: 1, borderColor: `${color}44` }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
                    <Text style={{ color, fontSize: 12, fontWeight: "700" }}>{AVAILABILITY_STATUS_LABELS[av.status] ?? av.status}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Guest spots à venir */}
          {isArtist && locations.filter((l) => l.type === "guest_spot" && l.guest_spot_end && new Date(l.guest_spot_end) >= new Date()).map((l) => (
            <View key={l.id} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, backgroundColor: "rgba(75,154,201,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(75,154,201,0.25)" }}>
              <Ionicons name="airplane-outline" size={13} color="#4B9AC9" />
              <Text style={{ color: "#4B9AC9", fontSize: 12, fontWeight: "700" }}>
                Guest spot à {l.city}
                {l.guest_spot_start ? ` · ${new Date(l.guest_spot_start).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}
                {l.guest_spot_end ? ` → ${new Date(l.guest_spot_end).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}
              </Text>
            </View>
          ))}

          {/* Styles */}
          {profile.style_tags?.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 10 }}>
              {profile.style_tags.map((s) => (
                <View key={s} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: "#17171A", borderWidth: 1, borderColor: "rgba(244,241,234,0.15)" }}>
                  <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 12 }}>{s}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats */}
          <View style={{ flexDirection: "row", gap: 40, marginTop: 20 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#F4F1EA", fontWeight: "800", fontSize: 20 }}>{posts.length}</Text>
              <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 12, marginTop: 2 }}>posts</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "rgba(244,241,234,0.08)" }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#F4F1EA", fontWeight: "800", fontSize: 20 }}>{followersCount}</Text>
              <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 12, marginTop: 2 }}>abonnés</Text>
            </View>
            {reviews.length > 0 && (() => {
              const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
              return (
                <>
                  <View style={{ width: 1, backgroundColor: "rgba(244,241,234,0.08)" }} />
                  <TouchableOpacity style={{ alignItems: "center" }} onPress={() => setTab("avis")}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Ionicons name="star" size={14} color="#C9A24B" />
                      <Text style={{ color: "#F4F1EA", fontWeight: "800", fontSize: 20 }}>{avg.toFixed(1)}</Text>
                    </View>
                    <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 12, marginTop: 2 }}>{reviews.length} avis</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>

          {/* Boutons gestion pro (isOwn + artiste) */}
          {isOwn && isArtist && (
            <View style={{ gap: 8, marginTop: 18, width: "100%" }}>
              <TouchableOpacity
                onPress={() => router.push("/pro/requests" as any)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#C9A24B", borderRadius: 12, paddingVertical: 12 }}
              >
                <Ionicons name="color-palette" size={16} color="#0A0A0B" />
                <Text style={{ color: "#0A0A0B", fontWeight: "800", fontSize: 13 }}>Mes demandes</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => router.push("/pro/locations")}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#17171A", borderRadius: 12, paddingVertical: 11, borderWidth: 1.5, borderColor: "rgba(244,241,234,0.1)" }}
                >
                  <Ionicons name="location-outline" size={16} color="#C9A24B" />
                  <Text style={{ color: "#F4F1EA", fontWeight: "700", fontSize: 13 }}>Mes lieux</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push("/pro/availability")}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#17171A", borderRadius: 12, paddingVertical: 11, borderWidth: 1.5, borderColor: "rgba(244,241,234,0.1)" }}
                >
                  <Ionicons name="time-outline" size={16} color="#C9A24B" />
                  <Text style={{ color: "#F4F1EA", fontWeight: "700", fontSize: 13 }}>Disponibilités</Text>
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
                  style={{ backgroundColor: "#C9A24B", borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
                >
                  <Ionicons name="color-palette-outline" size={18} color="#F5F3EE" />
                  <Text style={{ color: "#0A0A0B", fontWeight: "800", fontSize: 15 }}>Demander un projet</Text>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={handleFollow}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center",
                    backgroundColor: isFollowing ? "transparent" : "#17171A",
                    borderWidth: 1.5, borderColor: isFollowing ? "#C9A24B" : "rgba(244,241,234,0.15)",
                  }}
                >
                  <Text style={{ color: isFollowing ? "#C9A24B" : "#F4F1EA", fontWeight: "700", fontSize: 14 }}>
                    {isFollowing ? "Abonné·e" : "Suivre"}
                  </Text>
                </TouchableOpacity>
                {!isCurrentUserArtist && (
                  <TouchableOpacity
                    onPress={handleMessage}
                    style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6, backgroundColor: "#17171A", borderWidth: 1.5, borderColor: "rgba(244,241,234,0.15)" }}
                  >
                    <Ionicons name="chatbubble-outline" size={15} color="#F4F1EA" />
                    <Text style={{ color: "#F4F1EA", fontWeight: "700", fontSize: 14 }}>Message</Text>
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
                <Ionicons name="logo-instagram" size={15} color="rgba(244,241,234,0.55)" />
                <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 13 }}>@{profile.instagram_handle}</Text>
              </TouchableOpacity>
            )}
            {(profile as any).booking_url && (
              <TouchableOpacity
                onPress={() => Linking.openURL((profile as any).booking_url)}
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                <Ionicons name="calendar-outline" size={15} color="rgba(244,241,234,0.55)" />
                <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 13 }}>Réserver</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(244,241,234,0.08)", marginBottom: 2 }}>
        {([["posts", "Publications"], ["flash", "Flashs"], ["avis", "Avis"], ["about", "À propos"]] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setTab(key)}
            style={{ flex: 1, paddingVertical: 14, alignItems: "center", borderBottomWidth: 2, borderBottomColor: tab === key ? "#C9A24B" : "transparent" }}
          >
            <Text style={{ color: tab === key ? "#C9A24B" : "#6B6B7A", fontWeight: "600", fontSize: 14 }}>{label}</Text>
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
              <Ionicons name="images-outline" size={52} color="rgba(244,241,234,0.15)" />
              <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 15, marginTop: 16, textAlign: "center" }}>
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
              <View style={{ backgroundColor: "#17171A", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 0.5, borderColor: "rgba(244,241,234,0.08)" }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: "#F4F1EA", fontSize: 40, fontWeight: "800", lineHeight: 44 }}>{avg.toFixed(1)}</Text>
                  <View style={{ flexDirection: "row", gap: 2, marginTop: 4 }}>
                    {[1,2,3,4,5].map((s) => (
                      <Ionicons key={s} name={s <= Math.round(avg) ? "star" : "star-outline"} size={14} color="#C9A24B" />
                    ))}
                  </View>
                  <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 12, marginTop: 4 }}>{reviews.length} avis</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  {[5,4,3,2,1].map((s) => {
                    const count = reviews.filter((r) => r.rating === s).length;
                    return (
                      <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 11, width: 10 }}>{s}</Text>
                        <View style={{ flex: 1, height: 5, backgroundColor: "rgba(244,241,234,0.08)", borderRadius: 3 }}>
                          <View style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%`, height: "100%", backgroundColor: "#C9A24B", borderRadius: 3 }} />
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
              style={{ backgroundColor: "#C9A24B", borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
            >
              <Ionicons name="star-outline" size={16} color="#0A0A0B" />
              <Text style={{ color: "#0A0A0B", fontWeight: "800", fontSize: 15 }}>Laisser un avis</Text>
            </TouchableOpacity>
          )}

          {/* Liste des avis */}
          {reviews.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 32 }}>
              <Ionicons name="star-outline" size={40} color="rgba(244,241,234,0.15)" />
              <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 15, marginTop: 12, textAlign: "center" }}>Aucun avis pour l'instant</Text>
              {canReview && !isOwn && <Text style={{ color: "#C9A24B", fontSize: 13, marginTop: 6, textAlign: "center" }}>Sois le premier à laisser un avis !</Text>}
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {reviews.map((r) => (
                <View key={r.id} style={{ backgroundColor: "#17171A", borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: "rgba(244,241,234,0.08)" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Avatar uri={r.client?.avatar_url} name={r.client?.display_name ?? "?"} size={34} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#F4F1EA", fontWeight: "700", fontSize: 14 }}>{r.client?.display_name ?? "Client"}</Text>
                      <View style={{ flexDirection: "row", gap: 2, marginTop: 2 }}>
                        {[1,2,3,4,5].map((s) => (
                          <Ionicons key={s} name={s <= r.rating ? "star" : "star-outline"} size={12} color="#C9A24B" />
                        ))}
                      </View>
                    </View>
                    <Text style={{ color: "rgba(244,241,234,0.4)", fontSize: 11 }}>
                      {new Date(r.created_at).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                    </Text>
                  </View>
                  {r.body && <Text style={{ color: "#F4F1EA", fontSize: 14, lineHeight: 20 }}>{r.body}</Text>}
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
              <Ionicons name="flash-outline" size={40} color="rgba(244,241,234,0.15)" />
              <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 15, marginTop: 12, textAlign: "center" }}>
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
                  <View style={{ position: "absolute", top: 6, left: 6, backgroundColor: "#C9A24B", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: "#0A0A0B", fontSize: 10, fontWeight: "800" }}>FLASH</Text>
                  </View>
                  {p.price_min != null && (
                    <View style={{ position: "absolute", bottom: 6, right: 6, backgroundColor: "rgba(245,243,238,0.8)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: "#F4F1EA", fontSize: 11, fontWeight: "700" }}>{p.price_min}€</Text>
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
          {locations.filter((l) => l.type !== "guest_spot").map((l) => (
            <AboutRow
              key={l.id}
              icon={l.type === "studio" ? "business-outline" : "home-outline"}
              label={l.type === "studio" ? "Studio" : "À domicile"}
              value={`${l.studio_name ? `${l.studio_name} · ` : ""}${l.city}${l.is_address_public && l.address ? ` — ${l.address}` : ""}`}
            />
          ))}
          {profile.style_tags?.length > 0 && <AboutRow icon="color-palette-outline" label="Styles" value={profile.style_tags.join(", ")} />}
          {(profile as any).years_experience && <AboutRow icon="time-outline" label="Expérience" value={`${(profile as any).years_experience} ans`} />}
          {(profile as any).starting_price && <AboutRow icon="pricetag-outline" label="À partir de" value={`${(profile as any).starting_price}€`} />}
          {profile.instagram_handle && <AboutRow icon="logo-instagram" label="Instagram" value={`@${profile.instagram_handle}`} />}
          {(profile as any).booking_url && <AboutRow icon="calendar-outline" label="Réservation" value="Voir le lien" />}
          {!(profile.bio || profile.city || profile.instagram_handle) && (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Text style={{ color: "rgba(244,241,234,0.55)", textAlign: "center" }}>Aucune info renseignée.</Text>
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
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#17171A", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
        <Ionicons name={icon} size={17} color="rgba(244,241,234,0.55)" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "rgba(244,241,234,0.55)", fontSize: 12, fontWeight: "600", letterSpacing: 0.5, marginBottom: 2 }}>{label}</Text>
        <Text style={{ color: "#F4F1EA", fontSize: 15, lineHeight: 22 }}>{value}</Text>
      </View>
    </View>
  );
}
