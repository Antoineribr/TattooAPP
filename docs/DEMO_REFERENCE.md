# Références de test — données démo INK

État au 2026-07-10 (commit de la baseline `supabase/migrations/20260710000000_baseline_remote_schema.sql`).

## Post vidéo de référence

| Champ | Valeur |
|---|---|
| `id` | `b1000000-0000-0000-0000-000000000003` |
| `media_type` | `video` |
| `media_url` | `https://videos.pexels.com/video-files/8334935/8334935-hd_720_1366_25fps.mp4` (HTTP 200, `video/mp4`, ~2,3 Mo, vérifié le 2026-07-10) |
| `music_name` | `Machine Hum — Lo-fi` |
| `music_url` | SoundHelix (libre de droits, HTTP 200 `audio/mpeg`) |
| Artiste | Maya Noir (`maya@ink.demo`) |

Ce post cumule **vidéo + musique** : il teste les deux pipelines d'un coup.

## Position dans le feed

⚠️ L'ordre du feed dépend du contexte — il n'y a PAS de position fixe :

- **Visiteur anonyme sans géolocalisation** : feed chronologique (`created_at DESC` sur `posts_with_counts`) — voir `lib/hooks/useFeed.ts`, branche "guest". Position actuelle du post de référence : **#30** (elle recule à chaque nouveau post ; les 24 posts des 8 artistes ajoutés le 09/07 sont devant).
- **Utilisateur connecté ou géolocalisé** : ordre décidé par la fonction Postgres `get_personalized_feed` (⚠️ ne pas modifier).

Pour retrouver la position à tout moment :

```sql
WITH feed AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS position
  FROM posts_with_counts
)
SELECT position FROM feed WHERE id = 'b1000000-0000-0000-0000-000000000003';
```

Pour tester la vidéo sans scroller : ouvrir directement `/post/b1000000-0000-0000-0000-000000000003`.

## Autres posts utiles

- **Musique seule (image + son)** : `4d264bbf-1dd4-4512-9a6d-f571da04c05b` — `music_name = Cinematic` (mp3 Pixabay).
- 10 posts `media_type='video'` au total, tous en `media_url` (jamais dans `media_urls[]` — ce champ est un `text[]` traité comme images uniquement par `FeedItem.tsx`).

## Musiques

Toutes les `music_url` sont libres de droits depuis le 2026-07-10 : SoundHelix (m4a/mp3) et Pixabay. Les 37 previews iTunes (noms d'artistes réels) ont été remplacées par des titres instrumentaux fictifs. Répartition déterministe par hash de l'id du post.

## Comptes démo

- 13 artistes `*@ink.demo`, 15 clients `*@demo.fr` — mot de passe unique : `demo-ink-2026!` (défini par le seed).
- Comptes de démo principaux d'Antoine : `maya@ink.demo` (pro), `lea.martin@demo.fr` (client).

## Base versionnée

- `supabase/migrations/20260710000000_baseline_remote_schema.sql` — schéma complet fidèle au distant (remplace 001-003, archivées dans `supabase/archive/`).
- `supabase/migrations/20260710000001_messages_read_at_media_url.sql` — colonnes `read_at`/`media_url` de `messages` (manquaient alors que le code les utilise ; appliquée au distant).
- `supabase/seed_demo.sql` — seed complet reproductible et idempotent.
- Reconstruction d'une base vierge : baseline → migration 0001 → seed.
