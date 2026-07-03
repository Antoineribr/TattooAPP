import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { useAuthStore, PendingAction } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONFIG } from "@/lib/config";

type AuthPromptContext = "save" | "follow" | "contact" | "project" | "publish" | "default";

interface Props {
  visible: boolean;
  onClose: () => void;
  context?: AuthPromptContext;
  pendingAction?: PendingAction;
}

const CONTENT: Record<AuthPromptContext, { icon: string; title: string; body: string; cta: string }> = {
  save: {
    icon: "bookmark-outline",
    title: "Sauvegarde tes inspirations",
    body: "Crée un compte pour organiser tes tatouages préférés et préparer tes futurs projets.",
    cta: "Créer un compte",
  },
  follow: {
    icon: "person-add-outline",
    title: "Suis tes tatoueurs préférés",
    body: "Crée un compte pour ne pas rater leurs nouvelles publications et être alerté de leurs disponibilités.",
    cta: "Créer un compte",
  },
  contact: {
    icon: "chatbubble-outline",
    title: "Contacte un tatoueur",
    body: "Crée un compte pour envoyer ta demande de projet avec tes références et ton budget.",
    cta: "Créer un compte",
  },
  project: {
    icon: "color-palette-outline",
    title: "Lance ton projet tattoo",
    body: "Crée un compte pour décrire ton idée, joindre des références et échanger directement avec le tatoueur.",
    cta: "Créer un compte",
  },
  publish: {
    icon: "images-outline",
    title: "Tu es tatoueur·se ?",
    body: "Crée un profil pro pour partager ton travail, être découvert et recevoir des demandes de projets.",
    cta: "Créer un profil pro",
  },
  default: {
    icon: "person-outline",
    title: "Rejoins la communauté",
    body: `Crée un compte pour profiter de toutes les fonctionnalités de ${APP_CONFIG.brandName}.`,
    cta: "Créer un compte",
  },
};

export function AuthPrompt({ visible, onClose, context = "default", pendingAction }: Props) {
  const router = useRouter();
  const { setPendingAction } = useAuthStore();
  const { icon, title, body, cta } = CONTENT[context];

  function goSignUp() {
    if (pendingAction) setPendingAction(pendingAction);
    onClose();
    router.push("/(auth)/sign-up");
  }
  function goSignIn() {
    if (pendingAction) setPendingAction(pendingAction);
    onClose();
    router.push("/(auth)/sign-in");
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }} onPress={onClose} />
      <View style={{ backgroundColor: "#F5F3EE", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 48 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.12)", alignSelf: "center", marginTop: 14, marginBottom: 28 }} />

        <View style={{ paddingHorizontal: 24 }}>
          <View style={{
            width: 60, height: 60, borderRadius: 18,
            backgroundColor: "rgba(184,144,62,0.1)",
            alignItems: "center", justifyContent: "center",
            marginBottom: 20, borderWidth: 1, borderColor: "rgba(184,144,62,0.22)",
          }}>
            <Ionicons name={icon as any} size={28} color="#B8903E" />
          </View>

          <Text style={{ color: "#1A1A1A", fontSize: 22, fontWeight: "800", marginBottom: 10, letterSpacing: -0.3 }}>
            {title}
          </Text>
          <Text style={{ color: "#6B6B7A", fontSize: 15, lineHeight: 23, marginBottom: 32 }}>
            {body}
          </Text>

          <TouchableOpacity
            onPress={goSignUp}
            style={{ backgroundColor: "#B8903E", borderRadius: 14, paddingVertical: 17, alignItems: "center", marginBottom: 10 }}
          >
            <Text style={{ color: "#F5F3EE", fontWeight: "800", fontSize: 16 }}>{cta}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goSignIn}
            style={{ borderRadius: 14, paddingVertical: 15, alignItems: "center", borderWidth: 1.5, borderColor: "rgba(0,0,0,0.12)", marginBottom: 10, backgroundColor: "#FFFFFF" }}
          >
            <Text style={{ color: "#1A1A1A", fontWeight: "600", fontSize: 15 }}>Se connecter</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={{ paddingVertical: 10, alignItems: "center" }}>
            <Text style={{ color: "#6B6B7A", fontSize: 14 }}>Plus tard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
