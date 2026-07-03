-- ============================================================
-- INK V1 — Migration complète
-- ============================================================

-- 1. ENRICHIR LA TABLE POSTS
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS body_placement text,
  ADD COLUMN IF NOT EXISTS size_category text CHECK (size_category IN ('small','medium','large','sleeve','back')),
  ADD COLUMN IF NOT EXISTS duration_minutes int,
  ADD COLUMN IF NOT EXISTS price_type text CHECK (price_type IN ('fixed','range','on_quote')) DEFAULT 'on_quote',
  ADD COLUMN IF NOT EXISTS price_min int,
  ADD COLUMN IF NOT EXISTS price_max int,
  ADD COLUMN IF NOT EXISTS availability_type text CHECK (availability_type IN ('flash_available','flash_done','custom','commission')) DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS comments_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS music_url text,
  ADD COLUMN IF NOT EXISTS music_name text;

-- 2. ENRICHIR PROFILES
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS style_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS booking_url text,
  ADD COLUMN IF NOT EXISTS years_experience int,
  ADD COLUMN IF NOT EXISTS starting_price int,
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accepts_projects boolean DEFAULT true;

-- 3. BOARDS
CREATE TABLE IF NOT EXISTS public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Inspirations',
  cover_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "boards_owner" ON public.boards;
CREATE POLICY "boards_owner" ON public.boards
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. BOARD_ITEMS
CREATE TABLE IF NOT EXISTS public.board_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(board_id, post_id)
);

ALTER TABLE public.board_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "board_items_owner" ON public.board_items;
CREATE POLICY "board_items_owner" ON public.board_items
  USING (
    board_id IN (SELECT id FROM public.boards WHERE user_id = auth.uid())
  )
  WITH CHECK (
    board_id IN (SELECT id FROM public.boards WHERE user_id = auth.uid())
  );

-- 5. PROJECT REQUESTS
CREATE TABLE IF NOT EXISTS public.project_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  request_type text CHECK (request_type IN ('flash','custom','question')) DEFAULT 'custom',
  description text,
  body_placement text,
  size_category text,
  color_preference text CHECK (color_preference IN ('color','black_grey','any')) DEFAULT 'any',
  desired_style text,
  budget_min int,
  budget_max int,
  desired_date text,
  city text,
  status text CHECK (status IN (
    'new','awaiting_reply','in_discussion','quote_sent',
    'deposit_requested','confirmed','done','archived'
  )) DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.project_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_requests_client" ON public.project_requests;
CREATE POLICY "project_requests_client" ON public.project_requests
  USING (auth.uid() = client_id OR auth.uid() = artist_id)
  WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "project_requests_artist_update" ON public.project_requests;
CREATE POLICY "project_requests_artist_update" ON public.project_requests
  FOR UPDATE USING (auth.uid() = artist_id);

-- 6. PROJECT REFERENCE MEDIA
CREATE TABLE IF NOT EXISTS public.project_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.project_requests(id) ON DELETE CASCADE,
  url text NOT NULL,
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_media_access" ON public.project_media;
CREATE POLICY "project_media_access" ON public.project_media
  USING (
    request_id IN (
      SELECT id FROM public.project_requests
      WHERE client_id = auth.uid() OR artist_id = auth.uid()
    )
  );

-- 7. AJOUTER project_request_id AUX CONVERSATIONS
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS project_request_id uuid REFERENCES public.project_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz DEFAULT now();

-- 8. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  entity_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_owner" ON public.notifications;
CREATE POLICY "notifications_owner" ON public.notifications
  USING (auth.uid() = user_id);

-- 9. RECRÉER LA VUE posts_with_counts avec nouveaux champs
DROP VIEW IF EXISTS public.posts_with_counts;
CREATE VIEW public.posts_with_counts AS
SELECT
  p.id,
  p.artist_id,
  p.title,
  p.media_url,
  p.media_type,
  p.thumbnail_url,
  p.caption,
  p.style_tags,
  p.city,
  p.body_placement,
  p.size_category,
  p.duration_minutes,
  p.price_type,
  p.price_min,
  p.price_max,
  p.availability_type,
  p.comments_enabled,
  p.media_urls,
  p.music_url,
  p.music_name,
  p.created_at,
  pr.display_name,
  pr.username,
  pr.avatar_url,
  pr.city AS artist_city,
  pr.instagram_handle,
  pr.booking_url,
  COALESCE(lc.cnt, 0)::int AS likes_count,
  COALESCE(sc.cnt, 0)::int AS saves_count
FROM public.posts p
LEFT JOIN public.profiles pr ON pr.id = p.artist_id
LEFT JOIN (
  SELECT post_id, COUNT(*) AS cnt FROM public.likes GROUP BY post_id
) lc ON lc.post_id = p.id
LEFT JOIN (
  SELECT post_id, COUNT(*) AS cnt FROM public.saves GROUP BY post_id
) sc ON sc.post_id = p.id;

-- 10. RLS manquantes sur messages
DROP POLICY IF EXISTS "messages_participants" ON public.messages;
CREATE POLICY "messages_participants" ON public.messages
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE client_id = auth.uid() OR artist_id = auth.uid()
    )
  )
  WITH CHECK (auth.uid() = sender_id);

-- 11. Trigger updated_at sur project_requests
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS project_requests_updated_at ON public.project_requests;
CREATE TRIGGER project_requests_updated_at
  BEFORE UPDATE ON public.project_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 12. Trigger last_message_at sur conversations
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_update_conv ON public.messages;
CREATE TRIGGER messages_update_conv
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

