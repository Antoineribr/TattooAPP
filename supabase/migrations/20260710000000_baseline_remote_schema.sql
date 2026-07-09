-- ═══════════════════════════════════════════════════════════════════
-- BASELINE — Schéma complet généré depuis la base Supabase distante
-- (projet noeexgwelfrpixnmqmrp) le 2026-07-10.
--
-- SOURCE DE VÉRITÉ : cette baseline remplace les anciennes migrations
-- 001-003 (déplacées dans supabase/archive/, elles étaient en retard
-- sur la base réelle). Elle inclut les changements appliqués en SQL
-- ad hoc pendant les sessions précédentes :
--   • colonnes devis sur project_requests (quote_price/date/notes/status)
--   • table reviews + policies liées aux projets terminés
--   • table artist_invites + RPC claim/create + trigger anti-promotion
--   • policies durcies (posts insert artiste-only, update owner,
--     messages_mark_read) et lecture publique anon
--   • enum artist_availability_status : + 'paused'
--
-- ⚠️ NE PAS MODIFIER get_personalized_feed (algorithme du feed).
-- Ce fichier est destiné à recréer une base vierge iso-prod.
-- Aucune donnée utilisateur, aucun secret.
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── ENUMS ───────────────────────────────────────────────────────────

CREATE TYPE public.artist_availability_status AS ENUM ('open', 'waitlist', 'full', 'flash_only', 'guest_spot_soon', 'paused');

CREATE TYPE public.artist_location_type AS ENUM ('studio', 'home', 'guest_spot');

CREATE TYPE public.creation_type AS ENUM ('flash', 'custom');

CREATE TYPE public.media_type AS ENUM ('video', 'image');

CREATE TYPE public.post_status AS ENUM ('published', 'draft', 'paused', 'deleted');

CREATE TYPE public.report_reason AS ENUM ('spam', 'disrespectful', 'inappropriate', 'fake', 'stolen_content', 'scam', 'fraudulent_request', 'other');

CREATE TYPE public.user_role AS ENUM ('client', 'artist', 'admin');

-- ─── TABLES ──────────────────────────────────────────────────────────

CREATE TABLE public.artist_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  status artist_availability_status NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.artist_invites (
  code text NOT NULL,
  created_by uuid,
  used_by uuid,
  used_at timestamp with time zone,
  expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.artist_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  type artist_location_type NOT NULL,
  studio_name text,
  city text NOT NULL,
  address text,
  is_address_public boolean NOT NULL DEFAULT false,
  guest_spot_start date,
  guest_spot_end date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.board_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.boards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Inspirations'::text,
  cover_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid,
  body text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  artist_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  project_request_id uuid,
  last_message_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.follows (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  follower_id uuid NOT NULL,
  artist_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.likes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  entity_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  artist_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type media_type NOT NULL DEFAULT 'image'::media_type,
  thumbnail_url text,
  caption text,
  style_tags text[] NOT NULL DEFAULT '{}'::text[],
  city text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  media_urls text[] NOT NULL DEFAULT '{}'::text[],
  music_url text,
  music_name text,
  title text,
  body_placement text,
  size_category text,
  duration_minutes integer,
  price_type text DEFAULT 'on_quote'::text,
  price_min integer,
  price_max integer,
  availability_type text DEFAULT 'custom'::text,
  comments_enabled boolean DEFAULT true,
  status post_status NOT NULL DEFAULT 'published'::post_status,
  creation_type creation_type,
  certified_owner boolean NOT NULL DEFAULT false
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role user_role NOT NULL DEFAULT 'client'::user_role,
  display_name text NOT NULL DEFAULT ''::text,
  username text NOT NULL,
  avatar_url text,
  bio text,
  city text,
  lat double precision,
  lng double precision,
  instagram text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  style_tags text[] NOT NULL DEFAULT '{}'::text[],
  instagram_handle text,
  booking_url text,
  years_experience integer,
  starting_price integer,
  languages text[] DEFAULT '{}'::text[],
  accepts_projects boolean DEFAULT true,
  is_verified boolean NOT NULL DEFAULT false,
  is_founder boolean NOT NULL DEFAULT false,
  founder_expires_at timestamp with time zone
);

CREATE TABLE public.project_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  url text NOT NULL,
  position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.project_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  artist_id uuid NOT NULL,
  post_id uuid,
  request_type text DEFAULT 'custom'::text,
  description text,
  body_placement text,
  size_category text,
  color_preference text DEFAULT 'any'::text,
  desired_style text,
  budget_min integer,
  budget_max integer,
  desired_date text,
  city text,
  status text DEFAULT 'new'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  quote_price integer,
  quote_date text,
  quote_notes text,
  quote_status text DEFAULT 'pending'::text
);

CREATE TABLE public.quick_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  body text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid,
  reported_post_id uuid,
  reason report_reason NOT NULL,
  note text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  artist_id uuid NOT NULL,
  project_request_id uuid,
  rating integer NOT NULL,
  body text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.saves (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ─── CONTRAINTES ─────────────────────────────────────────────────────

ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD CONSTRAINT posts_pkey PRIMARY KEY (id);
ALTER TABLE public.posts ADD CONSTRAINT posts_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD CONSTRAINT posts_size_category_check CHECK ((size_category = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text, 'sleeve'::text, 'back'::text])));
ALTER TABLE public.posts ADD CONSTRAINT posts_price_type_check CHECK ((price_type = ANY (ARRAY['fixed'::text, 'range'::text, 'on_quote'::text])));
ALTER TABLE public.posts ADD CONSTRAINT posts_availability_type_check CHECK ((availability_type = ANY (ARRAY['flash_available'::text, 'flash_done'::text, 'custom'::text, 'commission'::text])));
ALTER TABLE public.likes ADD CONSTRAINT likes_pkey PRIMARY KEY (id);
ALTER TABLE public.likes ADD CONSTRAINT likes_post_id_user_id_key UNIQUE (post_id, user_id);
ALTER TABLE public.likes ADD CONSTRAINT likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE public.likes ADD CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.saves ADD CONSTRAINT saves_pkey PRIMARY KEY (id);
ALTER TABLE public.saves ADD CONSTRAINT saves_post_id_user_id_key UNIQUE (post_id, user_id);
ALTER TABLE public.saves ADD CONSTRAINT saves_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE public.saves ADD CONSTRAINT saves_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.follows ADD CONSTRAINT follows_pkey PRIMARY KEY (id);
ALTER TABLE public.follows ADD CONSTRAINT follows_follower_id_artist_id_key UNIQUE (follower_id, artist_id);
ALTER TABLE public.follows ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.follows ADD CONSTRAINT follows_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);
ALTER TABLE public.conversations ADD CONSTRAINT conversations_client_id_artist_id_key UNIQUE (client_id, artist_id);
ALTER TABLE public.conversations ADD CONSTRAINT conversations_client_id_fkey FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_project_request_id_fkey FOREIGN KEY (project_request_id) REFERENCES project_requests(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);
ALTER TABLE public.messages ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.boards ADD CONSTRAINT boards_pkey PRIMARY KEY (id);
ALTER TABLE public.boards ADD CONSTRAINT boards_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.board_items ADD CONSTRAINT board_items_pkey PRIMARY KEY (id);
ALTER TABLE public.board_items ADD CONSTRAINT board_items_board_id_post_id_key UNIQUE (board_id, post_id);
ALTER TABLE public.board_items ADD CONSTRAINT board_items_board_id_fkey FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE;
ALTER TABLE public.board_items ADD CONSTRAINT board_items_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE public.project_requests ADD CONSTRAINT project_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.project_requests ADD CONSTRAINT project_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.project_requests ADD CONSTRAINT project_requests_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.project_requests ADD CONSTRAINT project_requests_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL;
ALTER TABLE public.project_requests ADD CONSTRAINT project_requests_request_type_check CHECK ((request_type = ANY (ARRAY['flash'::text, 'custom'::text, 'question'::text])));
ALTER TABLE public.project_requests ADD CONSTRAINT project_requests_color_preference_check CHECK ((color_preference = ANY (ARRAY['color'::text, 'black_grey'::text, 'any'::text])));
ALTER TABLE public.project_requests ADD CONSTRAINT project_requests_status_check CHECK ((status = ANY (ARRAY['new'::text, 'awaiting_reply'::text, 'in_discussion'::text, 'quote_sent'::text, 'deposit_requested'::text, 'confirmed'::text, 'done'::text, 'archived'::text])));
ALTER TABLE public.project_media ADD CONSTRAINT project_media_pkey PRIMARY KEY (id);
ALTER TABLE public.project_media ADD CONSTRAINT project_media_request_id_fkey FOREIGN KEY (request_id) REFERENCES project_requests(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD CONSTRAINT comments_pkey PRIMARY KEY (id);
ALTER TABLE public.comments ADD CONSTRAINT comments_body_check CHECK (((char_length(body) > 0) AND (char_length(body) <= 500)));
ALTER TABLE public.comments ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE public.artist_locations ADD CONSTRAINT artist_locations_pkey PRIMARY KEY (id);
ALTER TABLE public.artist_locations ADD CONSTRAINT artist_locations_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.artist_availability ADD CONSTRAINT artist_availability_pkey PRIMARY KEY (id);
ALTER TABLE public.artist_availability ADD CONSTRAINT artist_availability_artist_id_status_key UNIQUE (artist_id, status);
ALTER TABLE public.artist_availability ADD CONSTRAINT artist_availability_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.quick_replies ADD CONSTRAINT quick_replies_pkey PRIMARY KEY (id);
ALTER TABLE public.quick_replies ADD CONSTRAINT quick_replies_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD CONSTRAINT reports_pkey PRIMARY KEY (id);
ALTER TABLE public.reports ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD CONSTRAINT reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.reports ADD CONSTRAINT reports_reported_post_id_fkey FOREIGN KEY (reported_post_id) REFERENCES posts(id) ON DELETE SET NULL;
ALTER TABLE public.blocks ADD CONSTRAINT blocks_pkey PRIMARY KEY (id);
ALTER TABLE public.blocks ADD CONSTRAINT blocks_blocker_id_blocked_id_key UNIQUE (blocker_id, blocked_id);
ALTER TABLE public.blocks ADD CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.blocks ADD CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
ALTER TABLE public.reviews ADD CONSTRAINT reviews_client_id_artist_id_project_request_id_key UNIQUE (client_id, artist_id, project_request_id);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_client_id_fkey FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_project_request_id_fkey FOREIGN KEY (project_request_id) REFERENCES project_requests(id) ON DELETE SET NULL;
ALTER TABLE public.artist_invites ADD CONSTRAINT artist_invites_pkey PRIMARY KEY (code);
ALTER TABLE public.artist_invites ADD CONSTRAINT artist_invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public.artist_invites ADD CONSTRAINT artist_invites_used_by_fkey FOREIGN KEY (used_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ─── INDEX ───────────────────────────────────────────────────────────

CREATE INDEX comments_post_id_idx ON public.comments USING btree (post_id);
CREATE INDEX comments_parent_id_idx ON public.comments USING btree (parent_id);
CREATE INDEX idx_posts_artist_status ON public.posts USING btree (artist_id, status);
CREATE INDEX idx_posts_status ON public.posts USING btree (status);
CREATE INDEX idx_artist_locations_artist ON public.artist_locations USING btree (artist_id);
CREATE INDEX idx_artist_availability_artist ON public.artist_availability USING btree (artist_id);
CREATE INDEX idx_reports_resolved ON public.reports USING btree (resolved);
CREATE INDEX idx_blocks_blocker ON public.blocks USING btree (blocker_id);
CREATE INDEX idx_blocks_blocked ON public.blocks USING btree (blocked_id);
CREATE UNIQUE INDEX reviews_one_per_project ON public.reviews USING btree (project_request_id);

-- ─── VUES, FONCTIONS, TRIGGERS ───────────────────────────────────────

CREATE OR REPLACE VIEW public.comments_with_profile AS
 SELECT c.id,
    c.post_id,
    c.user_id,
    c.parent_id,
    c.body,
    c.created_at,
    p.display_name,
    p.avatar_url,
    p.username
   FROM comments c
     JOIN profiles p ON p.id = c.user_id;

CREATE OR REPLACE VIEW public.posts_with_counts AS
 SELECT p.id,
    p.artist_id,
    p.media_url,
    p.media_type,
    p.thumbnail_url,
    p.caption,
    p.style_tags,
    p.city,
    p.created_at,
    p.media_urls,
    p.music_url,
    p.music_name,
    p.title,
    p.body_placement,
    p.size_category,
    p.duration_minutes,
    p.price_type,
    p.price_min,
    p.price_max,
    p.availability_type,
    p.comments_enabled,
    pr.display_name,
    pr.avatar_url,
    pr.username,
    pr.city AS artist_city,
    pr.lat,
    pr.lng,
    pr.style_tags AS artist_styles,
    COALESCE(( SELECT count(*) AS count
           FROM likes l
          WHERE l.post_id = p.id), 0::bigint)::integer AS likes_count,
    COALESCE(( SELECT count(*) AS count
           FROM saves s
          WHERE s.post_id = p.id), 0::bigint)::integer AS saves_count,
    COALESCE(( SELECT count(*) AS count
           FROM comments c
          WHERE c.post_id = p.id), 0::bigint)::integer AS comments_count
   FROM posts p
     JOIN profiles pr ON pr.id = p.artist_id;

	EXECUTE 'CREATE TRIGGER check_auth BEFORE UPDATE OR DELETE ON '
		|| quote_ident(schema) || '.' || quote_ident($2)
		||' FOR EACH ROW EXECUTE PROCEDURE CheckAuthTrigger('
		|| quote_literal($3) || ')';

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || left(new.id::text, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', '')
  );
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.conversations SET last_message_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_personalized_feed(p_user_id uuid DEFAULT NULL::uuid, p_user_lat double precision DEFAULT NULL::double precision, p_user_lng double precision DEFAULT NULL::double precision, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(post_id uuid, feed_score double precision)
 LANGUAGE sql
 STABLE
AS $function$
  WITH
  -- Poids par style basé sur les likes passés de l'utilisateur
  user_style_prefs AS (
    SELECT
      tag,
      COUNT(*)::float8 /
        NULLIF((SELECT COUNT(*) FROM likes WHERE user_id = p_user_id), 0) AS weight
    FROM likes l
    JOIN posts po ON po.id = l.post_id
    CROSS JOIN LATERAL unnest(po.style_tags) AS t(tag)
    WHERE l.user_id = p_user_id
    GROUP BY tag
  ),

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_verified IS DISTINCT FROM OLD.is_verified) THEN
    IF current_setting('app.bypass_role_guard', true) = 'on' THEN
      RETURN NEW; -- via fonction serveur (invitation)
    END IF;
    IF (auth.jwt() ->> 'email') = 'antoine.ribeiro02@gmail.com' THEN
      RETURN NEW; -- admin
    END IF;
    IF auth.uid() IS NULL THEN
      RETURN NEW; -- accès direct SQL / service role
    END IF;
    -- Exception : un nouvel inscrit peut confirmer le rôle client (jamais artiste)
    IF NEW.role = 'client' AND NEW.is_verified IS NOT DISTINCT FROM OLD.is_verified THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Modification du rôle non autorisée';
  END IF;
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.claim_artist_invite(invite_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_code artist_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT * INTO v_code FROM artist_invites
    WHERE code = upper(trim(invite_code)) AND used_by IS NULL AND (expires_at IS NULL OR expires_at > now())
    FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE artist_invites SET used_by = auth.uid(), used_at = now() WHERE code = v_code.code;
  PERFORM set_config('app.bypass_role_guard', 'on', true);
  UPDATE profiles SET role = 'artist' WHERE id = auth.uid();
  RETURN true;
END $function$
;

CREATE OR REPLACE FUNCTION public.create_artist_invite()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_code text;
BEGIN
  IF (auth.jwt() ->> 'email') <> 'antoine.ribeiro02@gmail.com' THEN
    RAISE EXCEPTION 'Réservé à l''admin';
  END IF;
  v_code := upper(substr(md5(random()::text), 1, 8));
  INSERT INTO artist_invites (code, created_by) VALUES (v_code, auth.uid());
  RETURN v_code;
END $function$
;

CREATE TRIGGER project_requests_updated_at BEFORE UPDATE ON public.project_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER messages_update_conv AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

CREATE TRIGGER trg_protect_profile_privileges BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION protect_profile_privileges();
-- Trigger sur auth.users : crée le profil à l'inscription
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- ─── POLICIES ────────────────────────────────────────────────────────

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING ((auth.uid() = id));

CREATE POLICY "posts_select" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON public.posts FOR INSERT WITH CHECK (((auth.uid() = artist_id) AND (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'artist'::user_role))))));
CREATE POLICY "posts_update" ON public.posts FOR UPDATE USING ((auth.uid() = artist_id)) WITH CHECK ((auth.uid() = artist_id));
CREATE POLICY "posts_delete" ON public.posts FOR DELETE USING ((auth.uid() = artist_id));

CREATE POLICY "likes_select" ON public.likes FOR SELECT USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "likes_insert" ON public.likes FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "likes_delete" ON public.likes FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY "saves_select" ON public.saves FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "saves_insert" ON public.saves FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "saves_delete" ON public.saves FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY "follows_select" ON public.follows FOR SELECT USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "follows_insert" ON public.follows FOR INSERT WITH CHECK ((auth.uid() = follower_id));
CREATE POLICY "follows_delete" ON public.follows FOR DELETE USING ((auth.uid() = follower_id));

CREATE POLICY "boards_owner" ON public.boards FOR ALL USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "board_items_owner" ON public.board_items FOR ALL USING ((board_id IN ( SELECT boards.id FROM boards WHERE (boards.user_id = auth.uid())))) WITH CHECK ((board_id IN ( SELECT boards.id FROM boards WHERE (boards.user_id = auth.uid()))));

CREATE POLICY "conversations_select" ON public.conversations FOR SELECT USING (((auth.uid() = client_id) OR (auth.uid() = artist_id)));
CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT WITH CHECK ((auth.uid() = client_id));

CREATE POLICY "messages_select" ON public.messages FOR SELECT USING ((EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = messages.conversation_id) AND ((c.client_id = auth.uid()) OR (c.artist_id = auth.uid()))))));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = messages.conversation_id) AND ((c.client_id = auth.uid()) OR (c.artist_id = auth.uid())))))));
CREATE POLICY "messages_participants" ON public.messages FOR ALL USING ((conversation_id IN ( SELECT conversations.id FROM conversations WHERE ((conversations.client_id = auth.uid()) OR (conversations.artist_id = auth.uid()))))) WITH CHECK ((auth.uid() = sender_id));
CREATE POLICY "messages_mark_read" ON public.messages FOR UPDATE USING ((EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = messages.conversation_id) AND ((c.client_id = auth.uid()) OR (c.artist_id = auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = messages.conversation_id) AND ((c.client_id = auth.uid()) OR (c.artist_id = auth.uid()))))));

CREATE POLICY "project_requests_client" ON public.project_requests FOR ALL USING (((auth.uid() = client_id) OR (auth.uid() = artist_id))) WITH CHECK ((auth.uid() = client_id));
CREATE POLICY "project_requests_artist_update" ON public.project_requests FOR UPDATE USING ((auth.uid() = artist_id));
CREATE POLICY "project_media_access" ON public.project_media FOR ALL USING ((request_id IN ( SELECT project_requests.id FROM project_requests WHERE ((project_requests.client_id = auth.uid()) OR (project_requests.artist_id = auth.uid())))));

CREATE POLICY "notifications_owner" ON public.notifications FOR ALL USING ((auth.uid() = user_id));

CREATE POLICY "Comments lisibles par tous" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Utilisateur crée ses commentaires" ON public.comments FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Utilisateur supprime ses commentaires" ON public.comments FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY "Artists manage own locations" ON public.artist_locations FOR ALL USING ((artist_id = auth.uid())) WITH CHECK ((artist_id = auth.uid()));
CREATE POLICY "Public read locations" ON public.artist_locations FOR SELECT USING (true);
CREATE POLICY "Artists manage own availability" ON public.artist_availability FOR ALL USING ((artist_id = auth.uid())) WITH CHECK ((artist_id = auth.uid()));
CREATE POLICY "Public read availability" ON public.artist_availability FOR SELECT USING (true);
CREATE POLICY "Artists manage own quick replies" ON public.quick_replies FOR ALL USING ((artist_id = auth.uid())) WITH CHECK ((artist_id = auth.uid()));

CREATE POLICY "Insert own reports" ON public.reports FOR INSERT WITH CHECK ((reporter_id = auth.uid()));
CREATE POLICY "Reporter reads own reports" ON public.reports FOR SELECT USING ((reporter_id = auth.uid()));
CREATE POLICY "Admins read all reports" ON public.reports FOR SELECT USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role)))));

CREATE POLICY "Manage own blocks" ON public.blocks FOR ALL USING ((blocker_id = auth.uid())) WITH CHECK ((blocker_id = auth.uid()));
CREATE POLICY "Read own blocks" ON public.blocks FOR SELECT USING (((blocker_id = auth.uid()) OR (blocked_id = auth.uid())));

CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (((auth.uid() = client_id) AND (EXISTS ( SELECT 1 FROM project_requests pr WHERE ((pr.id = reviews.project_request_id) AND (pr.client_id = auth.uid()) AND (pr.artist_id = reviews.artist_id) AND (pr.status = 'done'::text))))));
CREATE POLICY "reviews_delete" ON public.reviews FOR DELETE USING ((auth.uid() = client_id));

CREATE POLICY "invites_admin_read" ON public.artist_invites FOR SELECT USING (((auth.jwt() ->> 'email'::text) = 'antoine.ribeiro02@gmail.com'::text));

-- ─── GRANTS ──────────────────────────────────────────────────────────
-- Note : Supabase accorde par défaut tous les privilèges à anon/authenticated
-- sur le schéma public (la protection réelle est la RLS ci-dessus).
-- On explicite ici les accès dont l'app anonyme dépend :

GRANT SELECT ON public.profiles, public.posts, public.posts_with_counts,
  public.reviews, public.artist_availability, public.artist_locations TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_personalized_feed TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_artist_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_artist_invite() TO authenticated;
