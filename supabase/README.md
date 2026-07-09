# Base de données INK

## Source de vérité
La base Supabase distante (projet `noeexgwelfrpixnmqmrp`) est reflétée par :

1. `migrations/20260710000000_baseline_remote_schema.sql` — schéma complet
   généré depuis le distant le 2026-07-10 (tables, vues, fonctions dont
   `get_personalized_feed` — NE PAS MODIFIER —, triggers, RLS, policies, grants).
   Intègre tous les changements SQL ad hoc antérieurs (invitations artistes,
   reviews, colonnes devis, policies durcies, lecture publique anon).
2. `migrations/20260710000001_messages_read_at_media_url.sql` — correctif
   colonnes messages (appliqué au distant sous le même nom).
3. `seed_demo.sql` — données démo reproductibles (comptes @ink.demo / @demo.fr,
   mot de passe `demo-ink-2026!`, médias Pexels, musiques libres de droits).

Reconstruction d'une base vierge : baseline → 0001 → seed.

## Archive
`../archive/` contient les migrations 001-003 historiques : elles étaient en
retard sur la base réelle et sont conservées pour référence uniquement.
`seed.sql` et `storage.sql` à la racine datent de la même époque (le bucket
`posts` public avec ses policies reste décrit dans storage.sql).

## Références de test
Voir `../docs/DEMO_REFERENCE.md` (post vidéo fiable, position feed, comptes).
