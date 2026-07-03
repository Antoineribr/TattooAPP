import { View, TouchableOpacity, Share } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PostWithCounts } from "@/types/database";
import { Animated } from "react-native";
import { APP_CONFIG } from "@/lib/config";

interface Props {
  post: PostWithCounts;
  onLike: () => void;
  onSave: () => void;
  onFollow: () => void;
  onMessage: () => void;
  onProject?: () => void;
  likeScale?: Animated.Value;
}

export function ActionColumn({ post, onLike, onSave, onFollow, onMessage, onProject, likeScale }: Props) {
  async function handleShare() {
    try {
      await Share.share({
        message: `Découvre ce tatouage sur ${APP_CONFIG.brandName} : ${APP_CONFIG.legal.termsUrl.replace("/cgu", "")}/post/${post.id}`,
        url: `https://app-name.fr/post/${post.id}`,
      });
    } catch {}
  }

  return (
    <View style={{ position: "absolute", right: 14, bottom: 96, alignItems: "center", gap: 22 }}>
      {/* Like — pas de compteur visible publiquement */}
      <TouchableOpacity onPress={onLike} style={{ alignItems: "center" }} activeOpacity={0.7}>
        <Animated.View style={likeScale ? { transform: [{ scale: likeScale }] } : undefined}>
          <Ionicons name={post.is_liked ? "heart" : "heart-outline"} size={32} color={post.is_liked ? "#C9A24B" : "#F4F1EA"} />
        </Animated.View>
      </TouchableOpacity>

      {/* Save */}
      <TouchableOpacity onPress={onSave} style={{ alignItems: "center" }} activeOpacity={0.7}>
        <Ionicons name={post.is_saved ? "bookmark" : "bookmark-outline"} size={28} color={post.is_saved ? "#C9A24B" : "#F4F1EA"} />
      </TouchableOpacity>

      {/* Follow */}
      <TouchableOpacity onPress={onFollow} style={{ alignItems: "center" }} activeOpacity={0.7}>
        <Ionicons name={post.is_following ? "person-remove-outline" : "person-add-outline"} size={26} color={post.is_following ? "#C9A24B" : "#F4F1EA"} />
      </TouchableOpacity>

      {/* Message */}
      <TouchableOpacity onPress={onMessage} style={{ alignItems: "center" }} activeOpacity={0.7}>
        <Ionicons name="chatbubble-outline" size={26} color="#F4F1EA" />
      </TouchableOpacity>

      {/* Demander un projet */}
      {onProject && (
        <TouchableOpacity onPress={onProject} activeOpacity={0.7} style={{ alignItems: "center", marginTop: 4 }}>
          <View style={{ backgroundColor: "#C9A24B", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons name="color-palette-outline" size={14} color="#0A0A0B" />
          </View>
        </TouchableOpacity>
      )}

      {/* Partager */}
      <TouchableOpacity onPress={handleShare} style={{ alignItems: "center" }} activeOpacity={0.7}>
        <Ionicons name="share-social-outline" size={26} color="#F4F1EA" />
      </TouchableOpacity>
    </View>
  );
}
