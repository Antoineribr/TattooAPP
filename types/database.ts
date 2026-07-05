export type UserRole = "client" | "artist" | "admin";
export type MediaType = "video" | "image";
export type AvailabilityType = "flash_available" | "flash_done" | "custom" | "commission";
export type PostStatus = "published" | "draft" | "paused" | "deleted";
export type CreationType = "flash" | "custom";
export type PriceType = "fixed" | "range" | "on_quote";
export type SizeCategory = "small" | "medium" | "large" | "sleeve" | "back";
export type ProjectStatus = "new" | "awaiting_reply" | "in_discussion" | "quote_sent" | "deposit_requested" | "confirmed" | "done" | "archived";
export type RequestType = "flash" | "custom" | "question";
export type ArtistLocationType = "studio" | "home" | "guest_spot";
export type ArtistAvailabilityStatus = "open" | "waitlist" | "full" | "flash_only" | "guest_spot_soon" | "paused";
export type ReportReason = "spam" | "disrespectful" | "inappropriate" | "fake" | "stolen_content" | "scam" | "fraudulent_request" | "other";
export type ContactType = "adapt_tattoo" | "custom_project" | "question";

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  instagram: string | null;
  instagram_handle: string | null;
  booking_url: string | null;
  years_experience: number | null;
  starting_price: number | null;
  languages: string[];
  style_tags: string[];
  accepts_projects: boolean;
  is_verified: boolean;
  is_founder: boolean;
  founder_expires_at: string | null;
  created_at: string;
  push_token?: string | null;
}

export interface Post {
  id: string;
  artist_id: string;
  title: string | null;
  media_url: string;
  media_type: MediaType;
  thumbnail_url: string | null;
  caption: string | null;
  style_tags: string[];
  city: string | null;
  body_placement: string | null;
  size_category: SizeCategory | null;
  duration_minutes: number | null;
  price_type: PriceType;
  price_min: number | null;
  price_max: number | null;
  availability_type: AvailabilityType;
  creation_type: CreationType | null;
  status: PostStatus;
  certified_owner: boolean;
  comments_enabled: boolean;
  media_urls: string[];
  music_url: string | null;
  music_name: string | null;
  created_at: string;
}

export interface PostWithCounts extends Post {
  display_name: string;
  username: string;
  avatar_url: string | null;
  artist_city: string | null;
  instagram_handle: string | null;
  booking_url: string | null;
  is_verified: boolean;
  is_founder: boolean;
  likes_count: number;
  saves_count: number;
  comments_count: number;
  is_liked?: boolean;
  is_saved?: boolean;
  is_following?: boolean;
}

export interface Board {
  id: string;
  user_id: string;
  name: string;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  items_count?: number;
}

export interface BoardItem {
  id: string;
  board_id: string;
  post_id: string;
  created_at: string;
  post?: PostWithCounts;
}

export interface ProjectRequest {
  id: string;
  client_id: string;
  artist_id: string;
  post_id: string | null;
  request_type: RequestType;
  description: string | null;
  body_placement: string | null;
  size_category: SizeCategory | null;
  color_preference: "color" | "black_grey" | "any";
  desired_style: string | null;
  budget_min: number | null;
  budget_max: number | null;
  desired_date: string | null;
  city: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  client?: Profile;
  artist?: Profile;
  post?: PostWithCounts;
  media?: ProjectMedia[];
}

export interface ProjectMedia {
  id: string;
  request_id: string;
  url: string;
  position: number;
}

export interface Like { id: string; post_id: string; user_id: string; created_at: string; }
export interface Save { id: string; post_id: string; user_id: string; created_at: string; }
export interface Follow { id: string; follower_id: string; artist_id: string; created_at: string; }

export interface Conversation {
  id: string;
  client_id: string;
  artist_id: string;
  project_request_id: string | null;
  last_message_at: string | null;
  created_at: string;
  client?: Profile;
  artist?: Profile;
  project_request?: ProjectRequest;
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  media_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ArtistLocation {
  id: string;
  artist_id: string;
  type: ArtistLocationType;
  studio_name: string | null;
  city: string;
  address: string | null;
  is_address_public: boolean;
  guest_spot_start: string | null;
  guest_spot_end: string | null;
  created_at: string;
}

export interface ArtistAvailability {
  id: string;
  artist_id: string;
  status: ArtistAvailabilityStatus;
  note: string | null;
  created_at: string;
}

export interface QuickReply {
  id: string;
  artist_id: string;
  body: string;
  sort_order: number;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_post_id: string | null;
  reason: ReportReason;
  note: string | null;
  resolved: boolean;
  created_at: string;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  new: "Nouveau projet",
  awaiting_reply: "À répondre",
  in_discussion: "En discussion",
  quote_sent: "Devis envoyé",
  deposit_requested: "Acompte demandé",
  confirmed: "RDV confirmé",
  done: "Terminé",
  archived: "Archivé",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  new: "#C9A24B",
  awaiting_reply: "#FF8C42",
  in_discussion: "#4B9AC9",
  quote_sent: "#9B59B6",
  deposit_requested: "#E74C3C",
  confirmed: "#27AE60",
  done: "#6B6B6E",
  archived: "#3A3A3C",
};

export const CLIENT_STATUS_LABELS: Record<ProjectStatus, string> = {
  new: "Envoyé",
  awaiting_reply: "En attente",
  in_discussion: "En discussion",
  quote_sent: "Devis reçu",
  deposit_requested: "Acompte demandé",
  confirmed: "Accepté",
  done: "Terminé",
  archived: "Refusé",
};

export const BODY_PLACEMENTS = [
  "Avant-bras", "Bras intérieur", "Biceps", "Épaule", "Nuque",
  "Cou", "Poitrine", "Côtes", "Ventre", "Dos complet", "Haut du dos",
  "Bas du dos", "Cuisse", "Mollet", "Cheville", "Pied",
  "Doigt", "Main", "Derrière l'oreille", "Autre",
];

export const SIZE_LABELS: Record<SizeCategory, string> = {
  small: "Petit (< 5 cm)",
  medium: "Moyen (5–15 cm)",
  large: "Grand (15–30 cm)",
  sleeve: "Sleeve",
  back: "Dos complet",
};

export const AVAILABILITY_STATUS_LABELS: Record<ArtistAvailabilityStatus, string> = {
  open: "Ouvert aux projets",
  waitlist: "Liste d'attente ouverte",
  full: "Complet actuellement",
  flash_only: "Flashs uniquement",
  guest_spot_soon: "Guest spot prochainement",
  paused: "En pause",
};

export const AVAILABILITY_STATUS_COLORS: Record<ArtistAvailabilityStatus, string> = {
  open: "#27AE60",
  waitlist: "#FF8C42",
  full: "#E74C3C",
  flash_only: "#C9A24B",
  guest_spot_soon: "#4B9AC9",
  paused: "#9A9AA5",
};
