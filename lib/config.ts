export const APP_CONFIG = {
  brandName: "APP_NAME",
  tagline: "Trouve ton tatoueur.",
  supportEmail: "support@app-name.fr",
  social: {
    instagram: "",
    tiktok: "",
  },
  legal: {
    privacyUrl: "https://app-name.fr/confidentialite",
    termsUrl: "https://app-name.fr/cgu",
    cookiesUrl: "https://app-name.fr/cookies",
  },
  colors: {
    gold: "#B8903E",
    goldLight: "#C9A24B",
    cream: "#F5F3EE",
    dark: "#0A0A0B",
    darkCard: "#1A1A1A",
    text: "#1A1A1A",
    textMuted: "#6B6B7A",
    white: "#FFFFFF",
  },
};

export const ADMIN_EMAILS = ["antoine.ribeiro02@gmail.com"];

export const STYLES_LIST = [
  "blackwork",
  "fine line",
  "réalisme",
  "japonais",
  "dotwork",
  "minimaliste",
  "lettering",
  "old school",
  "neo-trad",
  "watercolor",
  "mandala",
  "géométrique",
  "portrait",
  "couleur",
  "illustratif",
];

export const BODY_PLACEMENTS_FULL: Record<string, string[]> = {
  "Tête et cou": [
    "crâne", "front", "tempe", "visage", "joue", "contour de l'œil",
    "nez", "lèvres", "oreille", "derrière l'oreille",
    "cou avant", "cou côté", "nuque",
  ],
  "Torse et dos": [
    "clavicule", "épaule", "pectoral", "sternum", "sous poitrine",
    "côtes", "flanc", "ventre", "abdomen", "hanche",
    "haut du dos", "omoplate", "milieu du dos", "bas du dos",
    "colonne", "dos complet",
  ],
  "Bras et mains": [
    "haut du bras", "biceps", "triceps", "deltoïde", "coude",
    "avant-bras intérieur", "avant-bras extérieur", "avant-bras complet",
    "poignet", "main", "doigts", "paume",
  ],
  "Jambes et pieds": [
    "cuisse avant", "cuisse arrière", "cuisse intérieure", "cuisse extérieure",
    "genou", "mollet", "tibia", "cheville", "pied", "orteils", "jambe complète",
  ],
  "Autres": ["fesses", "aine", "zone intime", "plusieurs zones", "autre"],
};

export const QUICK_REPLIES_DEFAULT = [
  "Merci pour ta demande, je regarde ton projet.",
  "Peux-tu préciser la taille souhaitée ?",
  "Ton projet correspond à mon style.",
  "Je n'ai malheureusement pas de créneau actuellement.",
  "Je peux te proposer un devis après quelques précisions.",
];

export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "disrespectful", label: "Comportement irrespectueux" },
  { value: "inappropriate", label: "Contenu inapproprié" },
  { value: "fake", label: "Faux profil" },
  { value: "stolen_content", label: "Contenu volé" },
  { value: "scam", label: "Arnaque" },
  { value: "fraudulent_request", label: "Demande frauduleuse" },
  { value: "other", label: "Autre" },
];

export const AVAILABILITY_LABELS: Record<string, string> = {
  open: "Ouvert aux projets",
  waitlist: "Liste d'attente ouverte",
  full: "Complet actuellement",
  flash_only: "Flashs uniquement",
  guest_spot_soon: "Guest spot prochainement",
};
