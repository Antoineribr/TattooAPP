-- Seed : insère d'abord des faux users dans auth.users, puis les profils et posts.
-- L'éditeur SQL Supabase tourne en tant que postgres (superuser), donc on peut écrire dans auth.users.

-- ─── Faux users dans auth.users ──────────────────────────────────────────────
insert into auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, aud, role
) values
(
  'a1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'maya@ink.demo', '$2a$10$placeholder', now(), now(), now(), 'authenticated', 'authenticated'
),
(
  'a1000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'lucas@ink.demo', '$2a$10$placeholder', now(), now(), now(), 'authenticated', 'authenticated'
),
(
  'a1000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'sofia@ink.demo', '$2a$10$placeholder', now(), now(), now(), 'authenticated', 'authenticated'
),
(
  'a1000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'karim@ink.demo', '$2a$10$placeholder', now(), now(), now(), 'authenticated', 'authenticated'
),
(
  'a1000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'elise@ink.demo', '$2a$10$placeholder', now(), now(), now(), 'authenticated', 'authenticated'
)
on conflict (id) do nothing;

-- ─── Profils tatoueurs ────────────────────────────────────────────────────────
insert into public.profiles (id, role, display_name, username, avatar_url, bio, city, instagram) values
('a1000000-0000-0000-0000-000000000001','artist','Maya Noir','maya_noir','https://i.pravatar.cc/150?img=47','Blackwork & dotwork depuis 10 ans. Paris 11e.','Paris','maya.noir.ink'),
('a1000000-0000-0000-0000-000000000002','artist','Lucas Shade','lucas_shade','https://i.pravatar.cc/150?img=12','Réalisme noir & gris. Lyon.','Lyon','lucas.shade.tattoo'),
('a1000000-0000-0000-0000-000000000003','artist','Sofia Encre','sofia_encre','https://i.pravatar.cc/150?img=32','Fine line & minimalisme. Bordeaux.','Bordeaux','sofia.encre'),
('a1000000-0000-0000-0000-000000000004','artist','Karim Ink','karim_ink','https://i.pravatar.cc/150?img=68','Japonais traditionnel. Marseille.','Marseille','karim.ink.official'),
('a1000000-0000-0000-0000-000000000005','artist','Élise Gris','elise_gris','https://i.pravatar.cc/150?img=25','Watercolor & illustratif. Nantes.','Nantes','elise.gris.art')
on conflict (id) do nothing;

-- ─── Posts ────────────────────────────────────────────────────────────────────
insert into public.posts (id, artist_id, media_url, media_type, thumbnail_url, caption, style_tags, city) values
('b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','https://picsum.photos/seed/tattoo1/800/1200','image','https://picsum.photos/seed/tattoo1/400/600','Mandala dorsal 6h de travail 🖤',ARRAY['blackwork','mandala','dotwork'],'Paris'),
('b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','https://picsum.photos/seed/tattoo2/800/1200','image','https://picsum.photos/seed/tattoo2/400/600','Sleeve géométrique — début de projet',ARRAY['blackwork','géométrique'],'Paris'),
('b1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001','https://picsum.photos/seed/tattoo3/800/1200','image','https://picsum.photos/seed/tattoo3/400/600','Dotwork sur côte — ultra précis',ARRAY['dotwork','fineline'],'Paris'),
('b1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000002','https://picsum.photos/seed/tattoo4/800/1200','image','https://picsum.photos/seed/tattoo4/400/600','Portrait réaliste bras gauche',ARRAY['réalisme','portrait','noir-gris'],'Lyon'),
('b1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000002','https://picsum.photos/seed/tattoo5/800/1200','image','https://picsum.photos/seed/tattoo5/400/600','Lion en noir & gris — cuisse',ARRAY['réalisme','animal','noir-gris'],'Lyon'),
('b1000000-0000-0000-0000-000000000006','a1000000-0000-0000-0000-000000000002','https://picsum.photos/seed/tattoo6/800/1200','image','https://picsum.photos/seed/tattoo6/400/600','Rose hyper-réaliste avant-bras',ARRAY['réalisme','floral'],'Lyon'),
('b1000000-0000-0000-0000-000000000007','a1000000-0000-0000-0000-000000000003','https://picsum.photos/seed/tattoo7/800/1200','image','https://picsum.photos/seed/tattoo7/400/600','Fine line botaniques — cheville',ARRAY['fineline','floral','minimaliste'],'Bordeaux'),
('b1000000-0000-0000-0000-000000000008','a1000000-0000-0000-0000-000000000003','https://picsum.photos/seed/tattoo8/800/1200','image','https://picsum.photos/seed/tattoo8/400/600','Script minimaliste derrière l''oreille',ARRAY['fineline','lettering','minimaliste'],'Bordeaux'),
('b1000000-0000-0000-0000-000000000009','a1000000-0000-0000-0000-000000000003','https://picsum.photos/seed/tattoo9/800/1200','image','https://picsum.photos/seed/tattoo9/400/600','Constellation sur la nuque',ARRAY['fineline','géométrique','minimaliste'],'Bordeaux'),
('b1000000-0000-0000-0000-000000000010','a1000000-0000-0000-0000-000000000004','https://picsum.photos/seed/tattoo10/800/1200','image','https://picsum.photos/seed/tattoo10/400/600','Carpe koi full color — cuisse',ARRAY['japonais','couleur','traditionnel'],'Marseille'),
('b1000000-0000-0000-0000-000000000011','a1000000-0000-0000-0000-000000000004','https://picsum.photos/seed/tattoo11/800/1200','image','https://picsum.photos/seed/tattoo11/400/600','Dragon japonais — dos complet en cours',ARRAY['japonais','couleur','dragon'],'Marseille'),
('b1000000-0000-0000-0000-000000000012','a1000000-0000-0000-0000-000000000004','https://picsum.photos/seed/tattoo12/800/1200','image','https://picsum.photos/seed/tattoo12/400/600','Sakura sleeve — bras droit',ARRAY['japonais','floral','couleur'],'Marseille'),
('b1000000-0000-0000-0000-000000000013','a1000000-0000-0000-0000-000000000005','https://picsum.photos/seed/tattoo13/800/1200','image','https://picsum.photos/seed/tattoo13/400/600','Watercolor lune & étoiles — épaule',ARRAY['watercolor','illustratif','couleur'],'Nantes'),
('b1000000-0000-0000-0000-000000000014','a1000000-0000-0000-0000-000000000005','https://picsum.photos/seed/tattoo14/800/1200','image','https://picsum.photos/seed/tattoo14/400/600','Renard aquarelle — omoplate',ARRAY['watercolor','animal','illustratif'],'Nantes'),
('b1000000-0000-0000-0000-000000000015','a1000000-0000-0000-0000-000000000005','https://picsum.photos/seed/tattoo15/800/1200','image','https://picsum.photos/seed/tattoo15/400/600','Fleurs watercolor pleine cuisse',ARRAY['watercolor','floral','couleur'],'Nantes')
on conflict (id) do nothing;

-- ─── Likes de démo ───────────────────────────────────────────────────────────
insert into public.likes (post_id, user_id) values
('b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002'),
('b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000003'),
('b1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000001'),
('b1000000-0000-0000-0000-000000000007','a1000000-0000-0000-0000-000000000004'),
('b1000000-0000-0000-0000-000000000010','a1000000-0000-0000-0000-000000000005'),
('b1000000-0000-0000-0000-000000000013','a1000000-0000-0000-0000-000000000001')
on conflict do nothing;

-- ─── Follows de démo ─────────────────────────────────────────────────────────
insert into public.follows (follower_id, artist_id) values
('a1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000004')
on conflict do nothing;

-- ─── Mise à jour media_type → video pour certains posts ───────────────────────
-- Vidéos Pexels tatouage (portrait 1080×1920)
-- Colle ce bloc dans l'éditeur SQL Supabase APRÈS le seed initial

UPDATE public.posts SET
  media_url     = 'https://videos.pexels.com/video-files/5760810/5760810-hd_1080_1920_25fps.mp4',
  thumbnail_url = 'https://images.pexels.com/videos/5760810/pictures/preview-0.jpg',
  media_type    = 'video'
WHERE id = 'b1000000-0000-0000-0000-000000000001';

UPDATE public.posts SET
  media_url     = 'https://videos.pexels.com/video-files/6498983/6498983-hd_1080_1920_25fps.mp4',
  thumbnail_url = 'https://images.pexels.com/videos/6498983/pictures/preview-0.jpg',
  media_type    = 'video'
WHERE id = 'b1000000-0000-0000-0000-000000000004';

UPDATE public.posts SET
  media_url     = 'https://videos.pexels.com/video-files/5186893/5186893-hd_1080_1920_25fps.mp4',
  thumbnail_url = 'https://images.pexels.com/videos/5186893/pictures/preview-0.jpg',
  media_type    = 'video'
WHERE id = 'b1000000-0000-0000-0000-000000000007';

UPDATE public.posts SET
  media_url     = 'https://videos.pexels.com/video-files/8539855/8539855-hd_1080_1920_25fps.mp4',
  thumbnail_url = 'https://images.pexels.com/videos/8539855/pictures/preview-0.jpg',
  media_type    = 'video'
WHERE id = 'b1000000-0000-0000-0000-000000000010';

UPDATE public.posts SET
  media_url     = 'https://videos.pexels.com/video-files/7698490/7698490-hd_1080_1920_25fps.mp4',
  thumbnail_url = 'https://images.pexels.com/videos/7698490/pictures/preview-0.jpg',
  media_type    = 'video'
WHERE id = 'b1000000-0000-0000-0000-000000000013';
