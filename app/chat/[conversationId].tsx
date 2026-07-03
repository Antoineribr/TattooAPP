import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ActionSheetIOS, ScrollView, Modal, Pressable,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { sendMessage, updateProjectStatus } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar } from "@/components/ui/Avatar";
import { StatusChip } from "@/components/ui/StatusChip";
import { Message, ProjectRequest, Profile, ProjectStatus, PROJECT_STATUS_LABELS } from "@/types/database";
import { QUICK_REPLIES_DEFAULT } from "@/lib/config";
import { ReviewSheet } from "@/components/ui/ReviewSheet";

const STATUS_FLOW: ProjectStatus[] = [
  "new", "awaiting_reply", "in_discussion", "quote_sent",
  "deposit_requested", "confirmed", "done", "archived"
];

function formatMsgTime(date: string) {
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(date: string) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { session, profile } = useAuthStore();
  const router = useRouter();
  const isArtist = profile?.role === "artist";

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [projectReq, setProjectReq] = useState<ProjectRequest | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteDate, setQuoteDate] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [sendingQuote, setSendingQuote] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => { if (conversationId) load(); }, [conversationId]);

  useEffect(() => {
    if (isArtist && session) loadQuickReplies();
  }, [isArtist, session]);

  async function loadQuickReplies() {
    const { data } = await supabase.from("quick_replies").select("body").eq("artist_id", session!.user.id).order("sort_order");
    setQuickReplies(data?.length ? data.map((r: any) => r.body) : QUICK_REPLIES_DEFAULT);
  }

  async function load() {
    setLoading(true);
    const uid = session?.user.id ?? "";
    const [convRes, msgsRes] = await Promise.all([
      supabase.from("conversations").select(`
        id, client_id, artist_id, project_request_id,
        client:profiles!conversations_client_id_fkey(*),
        artist:profiles!conversations_artist_id_fkey(*),
        project_request:project_requests(*, post:posts_with_counts(media_url,thumbnail_url,style_tags,caption), media:project_media(*))
      `).eq("id", conversationId).single(),
      supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }),
    ]);
    if (convRes.data) {
      const c = convRes.data as any;
      setOtherUser(c.client_id === uid ? c.artist : c.client);
      setProjectReq(c.project_request ?? null);
    }
    if (msgsRes.data) setMessages(msgsRes.data as Message[]);
    setLoading(false);
  }

  useEffect(() => {
    const sub = supabase.channel(`conv_${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
        }
      ).subscribe();
    return () => { sub.unsubscribe(); };
  }, [conversationId]);

  async function handleSend() {
    if (!body.trim() || !session) return;
    const text = body.trim();
    setBody("");
    setSending(true);
    try { await sendMessage(conversationId!, session.user.id, text); }
    catch { Alert.alert("Erreur", "Impossible d'envoyer le message"); }
    finally { setSending(false); }
  }

  async function handleSendQuote() {
    if (!projectReq || !quotePrice.trim()) return;
    setSendingQuote(true);
    try {
      await supabase.from("project_requests").update({
        quote_price: parseInt(quotePrice),
        quote_date: quoteDate.trim() || null,
        quote_notes: quoteNotes.trim() || null,
        quote_status: "pending",
        status: "quote_sent",
      }).eq("id", projectReq.id);
      setProjectReq((p) => p ? { ...p, status: "quote_sent", quote_price: parseInt(quotePrice), quote_date: quoteDate.trim() || null, quote_notes: quoteNotes.trim() || null, quote_status: "pending" } as any : p);
      await sendMessage(conversationId!, session!.user.id, `📋 Devis envoyé : ${quotePrice}€${quoteDate ? ` · ${quoteDate}` : ""}${quoteNotes ? `\n${quoteNotes}` : ""}`);
      setShowQuoteModal(false);
      setQuotePrice(""); setQuoteDate(""); setQuoteNotes("");
    } catch (e: any) { Alert.alert("Erreur", e.message); }
    setSendingQuote(false);
  }

  async function handleQuoteResponse(accepted: boolean) {
    if (!projectReq) return;
    const newStatus: ProjectStatus = accepted ? "deposit_requested" : "in_discussion";
    await supabase.from("project_requests").update({ quote_status: accepted ? "accepted" : "refused", status: newStatus }).eq("id", projectReq.id);
    setProjectReq((p) => p ? { ...p, status: newStatus, quote_status: accepted ? "accepted" : "refused" } as any : p);
    await sendMessage(conversationId!, session!.user.id, accepted ? "✅ J'accepte le devis !" : "❌ Je décline le devis.");
  }

  async function handleChangeStatus() {
    if (!projectReq) return;
    const options = [...STATUS_FLOW.map((s) => PROJECT_STATUS_LABELS[s]), "Annuler"];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ title: "Statut du projet", options, cancelButtonIndex: STATUS_FLOW.length }, async (idx) => {
        if (idx < STATUS_FLOW.length) {
          await updateProjectStatus(projectReq.id, STATUS_FLOW[idx]);
          setProjectReq((p) => p ? { ...p, status: STATUS_FLOW[idx] } : p);
        }
      });
    } else {
      Alert.alert("Statut", undefined, [
        ...STATUS_FLOW.map((s) => ({ text: PROJECT_STATUS_LABELS[s], onPress: async () => {
          await updateProjectStatus(projectReq.id, s);
          setProjectReq((p) => p ? { ...p, status: s } : p);
        }})),
        { text: "Annuler", style: "cancel" },
      ]);
    }
  }

  // Grouper messages par jour
  type Item = { type: "day"; label: string; key: string } | { type: "msg"; msg: Message };
  const items: Item[] = [];
  let lastDay = "";
  messages.forEach((m) => {
    const day = new Date(m.created_at).toDateString();
    if (day !== lastDay) {
      items.push({ type: "day", label: formatDayLabel(m.created_at), key: `day-${m.created_at}` });
      lastDay = day;
    }
    items.push({ type: "msg", msg: m });
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#F0EDE6" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header blur */}
      <BlurView intensity={80} tint="light" style={{ paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: "rgba(0,0,0,0.08)" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
          </TouchableOpacity>
          {otherUser && (
            <TouchableOpacity onPress={() => router.push(`/profile/${otherUser.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <Avatar uri={otherUser.avatar_url} name={otherUser.display_name} size={40} />
              <View>
                <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 16 }}>{otherUser.display_name}</Text>
                {projectReq?.status && <StatusChip status={projectReq.status} small />}
              </View>
            </TouchableOpacity>
          )}
          {isArtist && projectReq && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(projectReq as any).quote_status !== "accepted" && (
                <TouchableOpacity onPress={() => setShowQuoteModal(true)} style={{ backgroundColor: "rgba(184,144,62,0.12)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Ionicons name="receipt-outline" size={15} color="#B8903E" />
                  <Text style={{ color: "#B8903E", fontWeight: "700", fontSize: 13 }}>Devis</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleChangeStatus} style={{ backgroundColor: "rgba(184,144,62,0.1)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Ionicons name="swap-horizontal-outline" size={16} color="#B8903E" />
                <Text style={{ color: "#B8903E", fontWeight: "700", fontSize: 13 }}>Statut</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </BlurView>

      {/* Résumé projet */}
      {projectReq && (
        <View style={{ marginHorizontal: 12, marginTop: 10, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 14, padding: 12, flexDirection: "row", gap: 10, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }}>
          {(projectReq as any).post?.thumbnail_url && (
            <Image source={{ uri: (projectReq as any).post.thumbnail_url }} style={{ width: 52, height: 52, borderRadius: 10 }} contentFit="cover" />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 13 }} numberOfLines={2}>{projectReq.description ?? "Demande de projet"}</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              {projectReq.body_placement && (
                <Text style={{ color: "#6B6B7A", fontSize: 12 }}>📍 {projectReq.body_placement}</Text>
              )}
              {(projectReq.budget_min || projectReq.budget_max) && (
                <Text style={{ color: "#B8903E", fontSize: 12, fontWeight: "600" }}>
                  {projectReq.budget_min}€{projectReq.budget_max ? ` – ${projectReq.budget_max}€` : "+"}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Carte devis (visible si devis envoyé) */}
      {projectReq && (projectReq as any).quote_price && (
        <View style={{ marginHorizontal: 12, marginTop: 8, backgroundColor: "#FFFBF0", borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: (projectReq as any).quote_status === "accepted" ? "#4CAF50" : (projectReq as any).quote_status === "refused" ? "rgba(0,0,0,0.1)" : "#B8903E" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Ionicons name="receipt-outline" size={16} color="#B8903E" />
            <Text style={{ color: "#1A1A1A", fontWeight: "800", fontSize: 14 }}>Devis</Text>
            {(projectReq as any).quote_status === "accepted" && <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="checkmark-circle" size={15} color="#4CAF50" /><Text style={{ color: "#4CAF50", fontSize: 12, fontWeight: "700" }}>Accepté</Text></View>}
            {(projectReq as any).quote_status === "refused" && <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="close-circle" size={15} color="#E53935" /><Text style={{ color: "#E53935", fontSize: 12, fontWeight: "700" }}>Décliné</Text></View>}
          </View>
          <View style={{ flexDirection: "row", gap: 16, marginBottom: 8 }}>
            <View>
              <Text style={{ color: "#6B6B7A", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>Prix</Text>
              <Text style={{ color: "#B8903E", fontWeight: "800", fontSize: 20, marginTop: 2 }}>{(projectReq as any).quote_price}€</Text>
            </View>
            {(projectReq as any).quote_date ? (
              <View>
                <Text style={{ color: "#6B6B7A", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>Date estimée</Text>
                <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 14, marginTop: 2 }}>{(projectReq as any).quote_date}</Text>
              </View>
            ) : null}
          </View>
          {(projectReq as any).quote_notes ? (
            <Text style={{ color: "#6B6B7A", fontSize: 13, lineHeight: 18, marginBottom: 8 }}>{(projectReq as any).quote_notes}</Text>
          ) : null}
          {!isArtist && (projectReq as any).quote_status === "pending" && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <TouchableOpacity onPress={() => handleQuoteResponse(false)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center" }}>
                <Text style={{ color: "#6B6B7A", fontWeight: "700", fontSize: 14 }}>Décliner</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleQuoteResponse(true)} style={{ flex: 2, paddingVertical: 10, borderRadius: 10, backgroundColor: "#B8903E", alignItems: "center" }}>
                <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 14 }}>Accepter le devis</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Modal devis artiste */}
      <Modal visible={showQuoteModal} transparent animationType="slide" onRequestClose={() => setShowQuoteModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={() => setShowQuoteModal(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ backgroundColor: "#F5F3EE", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === "ios" ? 44 : 28 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.1)", alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ color: "#1A1A1A", fontSize: 20, fontWeight: "800", marginBottom: 20 }}>Envoyer un devis</Text>
            <View style={{ gap: 14 }}>
              <View>
                <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 13, marginBottom: 6 }}>Prix (€) *</Text>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }}>
                  <TextInput value={quotePrice} onChangeText={setQuotePrice} placeholder="250" placeholderTextColor="#6B6B7A" keyboardType="numeric" style={{ flex: 1, color: "#1A1A1A", padding: 13, fontSize: 15 }} />
                  <Text style={{ color: "#6B6B7A" }}>€</Text>
                </View>
              </View>
              <View>
                <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 13, marginBottom: 6 }}>Date estimée <Text style={{ color: "#6B6B7A", fontWeight: "400" }}>(facultatif)</Text></Text>
                <TextInput value={quoteDate} onChangeText={setQuoteDate} placeholder="Ex: mi-juillet, semaine du 14…" placeholderTextColor="#6B6B7A" style={{ backgroundColor: "#FFF", color: "#1A1A1A", borderRadius: 12, padding: 13, fontSize: 15, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }} />
              </View>
              <View>
                <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 13, marginBottom: 6 }}>Notes <Text style={{ color: "#6B6B7A", fontWeight: "400" }}>(facultatif)</Text></Text>
                <TextInput value={quoteNotes} onChangeText={setQuoteNotes} placeholder="Durée estimée, conditions, acompte…" placeholderTextColor="#6B6B7A" multiline numberOfLines={3} style={{ backgroundColor: "#FFF", color: "#1A1A1A", borderRadius: 12, padding: 13, fontSize: 15, minHeight: 80, textAlignVertical: "top", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }} />
              </View>
            </View>
            <TouchableOpacity
              onPress={handleSendQuote}
              disabled={!quotePrice.trim() || sendingQuote}
              style={{ backgroundColor: quotePrice.trim() ? "#B8903E" : "rgba(0,0,0,0.08)", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 20 }}
            >
              {sendingQuote ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: quotePrice.trim() ? "#FFF" : "rgba(0,0,0,0.2)", fontWeight: "800", fontSize: 15 }}>Envoyer le devis</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bannière projet terminé + avis */}
      {!isArtist && projectReq?.status === "done" && (
        <View style={{ marginHorizontal: 12, marginTop: 8, backgroundColor: "rgba(76,175,80,0.08)", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(76,175,80,0.25)" }}>
          <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
          <Text style={{ flex: 1, color: "#1A1A1A", fontSize: 13, fontWeight: "600" }}>Projet terminé 🎉</Text>
          <TouchableOpacity onPress={() => setShowReview(true)} style={{ backgroundColor: "#B8903E", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 12 }}>Laisser un avis</Text>
          </TouchableOpacity>
        </View>
      )}

      {otherUser && (
        <ReviewSheet
          visible={showReview}
          artistId={otherUser.id}
          artistName={otherUser.display_name}
          projectRequestId={projectReq?.id ?? null}
          onClose={() => setShowReview(false)}
          onSubmitted={() => setShowReview(false)}
        />
      )}

      {/* Messages */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#B8903E" />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={items}
          keyExtractor={(item) => item.type === "day" ? item.key : item.msg.id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 16, gap: 2 }}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            if (item.type === "day") {
              return (
                <View style={{ alignItems: "center", marginVertical: 12 }}>
                  <View style={{ backgroundColor: "rgba(0,0,0,0.07)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 }}>
                    <Text style={{ color: "#6B6B7A", fontSize: 11, fontWeight: "600" }}>{item.label}</Text>
                  </View>
                </View>
              );
            }
            const m = item.msg;
            const isOwn = m.sender_id === session?.user.id;
            const prevItem = items[index - 1];
            const prevMsg = prevItem?.type === "msg" ? prevItem.msg : null;
            const isFirst = !prevMsg || prevMsg.sender_id !== m.sender_id;
            const nextItem = items[index + 1];
            const nextMsg = nextItem?.type === "msg" ? nextItem.msg : null;
            const isLast = !nextMsg || nextMsg.sender_id !== m.sender_id;

            return (
              <View style={{ alignItems: isOwn ? "flex-end" : "flex-start", marginTop: isFirst ? 6 : 2 }}>
                <View style={{ flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-end", gap: 6, maxWidth: "82%" }}>
                  {!isOwn && isLast ? (
                    <Avatar uri={otherUser?.avatar_url} name={otherUser?.display_name ?? "?"} size={26} />
                  ) : !isOwn ? (
                    <View style={{ width: 26 }} />
                  ) : null}
                  <View>
                    <View style={{
                      paddingHorizontal: 14, paddingVertical: 10,
                      backgroundColor: isOwn ? "#B8903E" : "rgba(255,255,255,0.95)",
                      borderRadius: 18,
                      borderBottomRightRadius: isOwn ? (isLast ? 4 : 18) : 18,
                      borderBottomLeftRadius: !isOwn ? (isLast ? 4 : 18) : 18,
                      borderTopRightRadius: isOwn ? (isFirst ? 18 : 6) : 18,
                      borderTopLeftRadius: !isOwn ? (isFirst ? 18 : 6) : 18,
                      shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
                      borderWidth: isOwn ? 0 : 0.5, borderColor: "rgba(0,0,0,0.07)",
                    }}>
                      <Text style={{ color: isOwn ? "#FFFFFF" : "#1A1A1A", fontSize: 15, lineHeight: 22 }}>{m.body}</Text>
                    </View>
                    {isLast && (
                      <Text style={{ color: "#9A9AA5", fontSize: 10, marginTop: 3, marginHorizontal: 4, textAlign: isOwn ? "right" : "left" }}>
                        {formatMsgTime(m.created_at)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Quick replies panel (artiste seulement) */}
      {isArtist && showQuickReplies && (
        <View style={{ backgroundColor: "#F5F3EE", borderTopWidth: 0.5, borderTopColor: "rgba(0,0,0,0.08)", paddingVertical: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, flexDirection: "row" }}>
            {quickReplies.map((r, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => { setBody(r); setShowQuickReplies(false); }}
                style={{ backgroundColor: "#FFFFFF", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", maxWidth: 260 }}
              >
                <Text style={{ color: "#1A1A1A", fontSize: 13 }} numberOfLines={1}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input */}
      <BlurView intensity={70} tint="light" style={{ borderTopWidth: 0.5, borderTopColor: "rgba(0,0,0,0.08)", paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === "ios" ? 30 : 12 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          {isArtist && (
            <TouchableOpacity
              onPress={() => setShowQuickReplies((v) => !v)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: showQuickReplies ? "#B8903E" : "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="flash" size={16} color={showQuickReplies ? "#FFF" : "#6B6B7A"} />
            </TouchableOpacity>
          )}
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Message…"
            placeholderTextColor="rgba(0,0,0,0.25)"
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit
            style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: "#1A1A1A", fontSize: 15, maxHeight: 120, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.1)" }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!body.trim() || sending}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: body.trim() ? "#B8903E" : "rgba(0,0,0,0.08)", alignItems: "center", justifyContent: "center" }}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="arrow-up" size={20} color={body.trim() ? "#FFFFFF" : "rgba(0,0,0,0.2)"} />}
          </TouchableOpacity>
        </View>
      </BlurView>
    </KeyboardAvoidingView>
  );
}
