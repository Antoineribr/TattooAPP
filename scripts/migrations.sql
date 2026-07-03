-- ============================================================
-- Migration INK / APP_NAME — Phase 1 refactor
-- À appliquer dans Supabase SQL Editor
-- ============================================================

-- 0. Ajouter 'admin' au type user_role AVANT tout le reste
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- 1. Nouveaux types ENUM
DO $$ BEGIN
  CREATE TYPE post_status AS ENUM ('published', 'draft', 'paused', 'deleted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE creation_type AS ENUM ('flash', 'custom');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE artist_location_type AS ENUM ('studio', 'home', 'guest_spot');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE artist_availability_status AS ENUM ('open', 'waitlist', 'full', 'flash_only', 'guest_spot_soon');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE report_reason AS ENUM ('spam', 'disrespectful', 'inappropriate', 'fake', 'stolen_content', 'scam', 'fraudulent_request', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Colonnes sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_founder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founder_expires_at timestamptz;

-- 3. Colonnes sur posts
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS status post_status NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS creation_type creation_type,
  ADD COLUMN IF NOT EXISTS certified_owner boolean NOT NULL DEFAULT false;

-- Rétrocompatibilité : poster existants = published
UPDATE posts SET status = 'published' WHERE status IS NULL;

-- 4. Table artist_locations
CREATE TABLE IF NOT EXISTS artist_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type artist_location_type NOT NULL,
  studio_name text,
  city text NOT NULL,
  address text,
  is_address_public boolean NOT NULL DEFAULT false,
  guest_spot_start date,
  guest_spot_end date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE artist_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists manage own locations" ON artist_locations
  USING (artist_id = auth.uid())
  WITH CHECK (artist_id = auth.uid());

CREATE POLICY "Public read locations" ON artist_locations
  FOR SELECT USING (true);

-- 5. Table artist_availability
CREATE TABLE IF NOT EXISTS artist_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status artist_availability_status NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(artist_id, status)
);

ALTER TABLE artist_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists manage own availability" ON artist_availability
  USING (artist_id = auth.uid())
  WITH CHECK (artist_id = auth.uid());

CREATE POLICY "Public read availability" ON artist_availability
  FOR SELECT USING (true);

-- 6. Table quick_replies
CREATE TABLE IF NOT EXISTS quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists manage own quick replies" ON quick_replies
  USING (artist_id = auth.uid())
  WITH CHECK (artist_id = auth.uid());

-- 7. Table reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reported_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  reason report_reason NOT NULL,
  note text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert own reports" ON reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins read all reports" ON reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Reporter reads own reports" ON reports
  FOR SELECT USING (reporter_id = auth.uid());

-- 8. Table blocks
CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage own blocks" ON blocks
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Read own blocks" ON blocks
  FOR SELECT USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

-- 9. Index utiles
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_artist_status ON posts(artist_id, status);
CREATE INDEX IF NOT EXISTS idx_artist_locations_artist ON artist_locations(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_availability_artist ON artist_availability(artist_id);
CREATE INDEX IF NOT EXISTS idx_reports_resolved ON reports(resolved);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

-- 10. Filtrer posts supprimés/draft dans la vue posts_with_counts (si elle existe)
-- Si tu as une vue posts_with_counts, ajoute : WHERE status = 'published'
-- Exemple (adapter selon ta vue existante) :
-- CREATE OR REPLACE VIEW posts_with_counts AS
--   SELECT p.*, ... FROM posts p WHERE p.status = 'published';
