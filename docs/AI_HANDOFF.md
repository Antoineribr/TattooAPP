# INK — AI handoff

Ce fichier est la source de vérité entre les assistants et Antoine. Il complète les PRs et ne remplace pas les décisions explicites d’Antoine.

## Protocole

1. Lire ce fichier avant toute intervention.
2. Travailler sur une branche dédiée ; ne pas modifier `main` ou la production sans validation explicite.
3. Mettre ce fichier à jour après chaque intervention : branche, commit, décisions, vérifications et prochaine action.
4. Ne jamais modifier `get_personalized_feed` sans demande explicite d’Antoine.

## État de référence

- Branche de référence : `main`
- Dernier commit de référence : `c9acd33447efa0629649e1ebcd15f624da1c7d2f`
- Supabase : projet `noeexgwelfrpixnmqmrp` (Tattoo app), actif.
- Vercel : projet `tattoo-app`, déploiement de production via `main`.
- Schéma distant versionné dans :
  - `supabase/migrations/20260710000000_baseline_remote_schema.sql`
  - `supabase/migrations/20260710000001_messages_read_at_media_url.sql`
- Données de démo et post de test : voir `docs/DEMO_REFERENCE.md`.

## Décisions produit non négociables

- INK est une app de découverte et de mise en relation client ↔ tatoueur ; ce n’est pas un réseau social généraliste.
- Entrée artiste uniquement sur invitation.
- Pas de commentaires publics ni de compteur de likes public.
- Demandes de projet qualifiées.
- Expérience client sombre ; espace pro clair.
- Les contenus de démo ne doivent pas être présentés comme le travail réel d’un artiste.

## Musique et médias

- Les vidéos actuelles sont uniquement dans `posts.media_url` lorsque `media_type = 'video'`.
- `media_urls[]` est un tableau d’images ; ne pas y introduire de vidéos sans évolution de schéma documentée.
- Le web démarre muet pour respecter les règles d’autoplay des navigateurs.
- Les previews iTunes sont actuellement utilisées pour les données de démo. Elles ne doivent pas être considérées comme une solution de licence pour une diffusion publique ou commerciale : prévoir un catalogue adapté avant lancement.
- Ne pas modifier les médias ou les données Supabase sans décision explicite d’Antoine et migration/seed versionnés si nécessaire.

## PRs Codex ouvertes — à rebaser sur `main`

- #1 `codex/tattoo-web-foundations` : métadonnées web françaises et accessibilité de navigation/accueil.
- #2 `codex/tattoo-feed-playback` : amélioration de robustesse audio et détection de médias. Ne pas merger sans réévaluation : le post vidéo de référence fonctionne déjà et les carrousels actuels ne contiennent pas de vidéo.

## Dernière intervention

- 2026-07-10 — Codex
  - Branche `codex/ink-video-audio-repair`, basée sur `codex/ai-handoff`.
  - `app/post/[id].tsx` : les posts `media_type = 'video'` utilisent désormais `VideoView` au lieu d’être rendus comme une image ; les carrousels existants restent images-only.
  - `components/feed/FeedItem.tsx` : sur web, la piste est créée/reprise à l’activation explicite du bouton son ; le lecteur tente de reprendre la lecture et affiche un retour visible en cas d’échec.
  - Aucun changement de schéma, de données, de policy, de médias Supabase ou de production.
  - Prochaine action : vérifier le build et le preview Vercel de la PR, en particulier le post vidéo de référence et l’activation du son.

## Questions / blocages actifs

- Définir la stratégie de contenus de démo : vidéos cohérentes et autorisées, sans fausse attribution d’artistes.
- Décider du traitement audio pour la version publique.
