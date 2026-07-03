-- Table commentaires
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 500),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_post_id_idx ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments lisibles par tous" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Utilisateur crée ses commentaires" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Utilisateur supprime ses commentaires" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Vue enrichie
CREATE OR REPLACE VIEW public.comments_with_profile AS
  SELECT c.*, p.display_name, p.avatar_url, p.username
  FROM public.comments c
  JOIN public.profiles p ON p.id = c.user_id;

-- Ajouter comments_count dans posts_with_counts
DROP VIEW IF EXISTS public.posts_with_counts;
CREATE VIEW public.posts_with_counts AS
  SELECT
    p.*,
    pr.display_name, pr.avatar_url, pr.username,
    pr.city AS artist_city, pr.lat, pr.lng,
    pr.style_tags AS artist_styles,
    COALESCE((SELECT COUNT(*) FROM public.likes l WHERE l.post_id = p.id), 0)::int AS likes_count,
    COALESCE((SELECT COUNT(*) FROM public.saves s WHERE s.post_id = p.id), 0)::int AS saves_count,
    COALESCE((SELECT COUNT(*) FROM public.comments c WHERE c.post_id = p.id), 0)::int AS comments_count
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.artist_id;
