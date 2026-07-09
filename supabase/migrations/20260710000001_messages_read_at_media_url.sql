-- Le code (chat, liste des messages, types TS) lit et écrit ces colonnes
-- mais elles n'existaient pas : badges "non lu" et pièces jointes cassés.
-- Appliquée au distant le 2026-07-10 (version 20260710..., nom messages_read_at_media_url).
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url text;
CREATE INDEX IF NOT EXISTS idx_messages_conv_unread ON public.messages (conversation_id) WHERE read_at IS NULL;
