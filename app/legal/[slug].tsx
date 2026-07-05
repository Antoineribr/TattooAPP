import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONFIG } from "@/lib/config";

// Textes de base à faire valider juridiquement avant lancement public.
const PAGES: Record<string, { title: string; sections: { h: string; p: string }[] }> = {
  cgu: {
    title: "Conditions générales d'utilisation",
    sections: [
      { h: "1. Objet", p: `${APP_CONFIG.brandName} est une plateforme de découverte et de mise en relation entre clients et artistes tatoueurs. ${APP_CONFIG.brandName} n'est pas partie aux contrats conclus entre clients et tatoueurs : les prestations, devis, acomptes et rendez-vous relèvent de la seule responsabilité des parties.` },
      { h: "2. Comptes", p: "L'inscription client est libre. Les comptes artistes sont créés sur invitation et vérifiés. Chaque utilisateur est responsable de la confidentialité de ses identifiants et de l'exactitude des informations publiées." },
      { h: "3. Contenus", p: "Les artistes conservent l'entière propriété intellectuelle de leurs œuvres. En publiant, ils accordent à la plateforme une licence limitée d'affichage. Tout contenu volé, trompeur ou inapproprié peut être retiré et le compte suspendu." },
      { h: "4. Demandes de projet et devis", p: "Les demandes de projet et devis échangés via la messagerie ont valeur d'échange précontractuel entre le client et l'artiste. Les prix affichés sont indicatifs jusqu'à confirmation par l'artiste." },
      { h: "5. Comportement", p: "Le respect est non négociable : harcèlement, spam, discrimination ou tentative d'arnaque entraînent la suppression du compte. Les signalements sont examinés par l'équipe de modération." },
      { h: "6. Contact", p: `Pour toute question : ${APP_CONFIG.supportEmail}` },
    ],
  },
  confidentialite: {
    title: "Politique de confidentialité",
    sections: [
      { h: "1. Données collectées", p: "Compte (email, nom d'affichage), profil (ville, styles, photo), contenus publiés, demandes de projet et messages. La position précise n'est utilisée qu'avec ton accord, pour le tri par distance, et n'est pas conservée." },
      { h: "2. Utilisation", p: "Les données servent uniquement au fonctionnement du service : personnalisation du feed, mise en relation, messagerie et statistiques des artistes. Aucune vente de données à des tiers." },
      { h: "3. Hébergement", p: "Les données sont hébergées chez Supabase (infrastructure conforme RGPD). Les mots de passe sont chiffrés et jamais accessibles à l'équipe." },
      { h: "4. Tes droits", p: `Conformément au RGPD, tu peux demander l'accès, la rectification ou la suppression de tes données à tout moment : ${APP_CONFIG.supportEmail}. La suppression du compte entraîne l'effacement des données personnelles.` },
      { h: "5. Cookies", p: "L'application n'utilise pas de cookies publicitaires. Seules des données techniques de session sont stockées localement pour te maintenir connecté·e." },
    ],
  },
};

export default function LegalScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const page = PAGES[slug ?? ""] ?? PAGES.cgu;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EE" }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#B8903E", fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>{APP_CONFIG.brandName}</Text>
          <Text style={{ color: "#1A1A1A", fontSize: 18, fontWeight: "800" }}>{page.title}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 20 }}>
        {page.sections.map((s) => (
          <View key={s.h}>
            <Text style={{ color: "#1A1A1A", fontWeight: "800", fontSize: 15, marginBottom: 6 }}>{s.h}</Text>
            <Text style={{ color: "#6B6B7A", fontSize: 14, lineHeight: 22 }}>{s.p}</Text>
          </View>
        ))}
        <Text style={{ color: "#9A9AA5", fontSize: 12, marginTop: 8 }}>
          Dernière mise à jour : juillet 2026 — document de travail, à valider juridiquement avant lancement public.
        </Text>
      </ScrollView>
    </View>
  );
}
