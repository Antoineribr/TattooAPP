import { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar } from "./Avatar";
import { useRouter } from "expo-router";

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  display_name: string;
  avatar_url: string | null;
  username: string;
};

interface Props {
  visible: boolean;
  postId: string;
  commentsEnabled: boolean;
  onClose: () => void;
}

export function CommentsSheet({ visible, postId, commentsEnabled, onClose }: Props) {
  const { session } = useAuthStore();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    const { data } = await supabase
      .from("comments_with_profile")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setComments((data as Comment[]) ?? []);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    if (visible && postId) load();
  }, [visible, postId]);

  // Realtime
  useEffect(() => {
    if (!visible || !postId) return;
    const channel = supabase
      .channel(`comments:${postId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [visible, postId]);

  async function send() {
    if (!session || !text.trim() || sending) return;
    setSending(true);
    await supabase.from("comments").insert({
      post_id: postId,
      user_id: session.user.id,
      body: text.trim(),
      parent_id: replyTo?.id ?? null,
    });
    setText("");
    setReplyTo(null);
    setSending(false);
  }

  async function deleteComment(id: string) {
    await supabase.from("comments").delete().eq("id", id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  function timeAgo(date: string) {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return "maintenant";
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}j`;
  }

  // Grouper: parents + leurs réponses
  const roots = comments.filter((c) => !c.parent_id);
  const replies = comments.filter((c) => c.parent_id);

  function renderComment(c: Comment, isReply = false) {
    const isOwn = session?.user.id === c.user_id;
    const childReplies = replies.filter((r) => r.parent_id === c.id);
    return (
      <View key={c.id}>
        <View style={{ flexDirection: "row", gap: 10, paddingVertical: 10, paddingLeft: isReply ? 44 : 0 }}>
          <TouchableOpacity onPress={() => { onClose(); setTimeout(() => router.push(`/profile/${c.user_id}`), 200); }}>
            <Avatar uri={c.avatar_url} name={c.display_name} size={isReply ? 28 : 36} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <Text style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 13 }}>{c.display_name}</Text>
              <Text style={{ color: "#6B6B7A", fontSize: 11 }}>{timeAgo(c.created_at)}</Text>
            </View>
            <Text style={{ color: "rgba(26,26,26,0.88)", fontSize: 14, lineHeight: 20 }}>{c.body}</Text>
            <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
              {!isReply && (
                <TouchableOpacity onPress={() => { setReplyTo(c); inputRef.current?.focus(); }}>
                  <Text style={{ color: "#6B6B7A", fontSize: 12, fontWeight: "600" }}>Répondre</Text>
                </TouchableOpacity>
              )}
              {isOwn && (
                <TouchableOpacity onPress={() => deleteComment(c.id)}>
                  <Text style={{ color: "#FF4444", fontSize: 12 }}>Supprimer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        {childReplies.map((r) => renderComment(r, true))}
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#F5F3EE" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#FFFFFF" }}>
          <Text style={{ flex: 1, color: "#1A1A1A", fontSize: 17, fontWeight: "800" }}>
            Commentaires {comments.length > 0 && <Text style={{ color: "#6B6B7A", fontWeight: "400" }}>({comments.length})</Text>}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color="#6B6B7A" />
          </TouchableOpacity>
        </View>

        {/* Liste */}
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#B8903E" />
          </View>
        ) : (
          <FlatList
            data={roots}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <View style={{ paddingHorizontal: 20 }}>
                {renderComment(item)}
                <View style={{ height: 1, backgroundColor: "#EDE9E1" }} />
              </View>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 60 }}>
                <Ionicons name="chatbubble-outline" size={44} color="rgba(0,0,0,0.1)" />
                <Text style={{ color: "#1A1A1A", fontSize: 16, fontWeight: "700", marginTop: 14 }}>Aucun commentaire</Text>
                <Text style={{ color: "#6B6B7A", fontSize: 14, marginTop: 6 }}>Sois le premier à commenter !</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input */}
        {commentsEnabled ? (
          <View style={{ borderTopWidth: 1, borderTopColor: "#FFFFFF", paddingHorizontal: 16, paddingBottom: Platform.OS === "ios" ? 34 : 16, paddingTop: 10 }}>
            {replyTo && (
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8, gap: 8 }}>
                <Text style={{ flex: 1, color: "#6B6B7A", fontSize: 12 }}>
                  Répondre à <Text style={{ color: "#B8903E", fontWeight: "700" }}>{replyTo.display_name}</Text>
                </Text>
                <TouchableOpacity onPress={() => setReplyTo(null)}>
                  <Ionicons name="close" size={16} color="#6B6B7A" />
                </TouchableOpacity>
              </View>
            )}
            {session ? (
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
                <TextInput
                  ref={inputRef}
                  value={text}
                  onChangeText={setText}
                  placeholder="Ajoute un commentaire…"
                  placeholderTextColor="#6B6B7A"
                  multiline
                  maxLength={500}
                  style={{ flex: 1, backgroundColor: "#FFFFFF", color: "#1A1A1A", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100 }}
                />
                <TouchableOpacity
                  onPress={send}
                  disabled={!text.trim() || sending}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: text.trim() ? "#B8903E" : "rgba(0,0,0,0.1)", alignItems: "center", justifyContent: "center" }}
                >
                  {sending ? <ActivityIndicator size="small" color="#F5F3EE" /> : <Ionicons name="arrow-up" size={18} color={text.trim() ? "#F5F3EE" : "#6B6B7A"} />}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { onClose(); setTimeout(() => router.push("/(auth)/sign-in"), 200); }} style={{ backgroundColor: "#FFFFFF", borderRadius: 14, paddingVertical: 13, alignItems: "center" }}>
                <Text style={{ color: "#B8903E", fontWeight: "700", fontSize: 14 }}>Connecte-toi pour commenter</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ borderTopWidth: 1, borderTopColor: "#FFFFFF", padding: 16, alignItems: "center" }}>
            <Text style={{ color: "#6B6B7A", fontSize: 14 }}>Les commentaires sont désactivés</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
