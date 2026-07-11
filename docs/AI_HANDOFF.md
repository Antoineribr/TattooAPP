# INK — Passation IA

## État actuel

- Branche Codex : `agent/mobile-feed-shell`
- Base : `main` au commit `e1d9284`
- Statut : changements testés localement, prêts pour une pull request

## Changements de cette intervention

- Le feed utilise désormais un viewport mobile commun et réactif.
- Les photos et vidéos occupent toutes le même cadre plein écran avec `cover` : les fichiers originaux ne sont pas modifiés, seul leur affichage est recadré proprement.
- Sur ordinateur, toute l'application est présentée dans une coque téléphone centrée, limitée à 430 × 764 px et au ratio 9:16.
- Les écrans secondaires utilisent la même largeur logique afin d'éviter les débordements ou les éléments coupés sur le Web.
- Le shell Web est injecté une seule fois, y compris pendant les rechargements de développement.

## Vérifications

- TypeScript : OK (`tsc --noEmit`).
- Export Web Expo : OK (`npm run build:web`).
- Contrôle des différences Git : OK (`git diff --check`).

## Données de démonstration déjà en place

- 13 nouveaux posts photo répartis sur trois artistes de démonstration, avec musiques iTunes.
- 10 posts vidéo de tatouage conservés.
- Les anciens posts hors sujet ont été retirés.

## Prochaine action

- Vérifier la preview Vercel de la pull request sur ordinateur et téléphone avant fusion.
- Claude doit lire ce fichier avant toute nouvelle intervention et le mettre à jour ensuite.

---

## Intervention Claude — 2026-07-10 (branche `agent/hide-empty-artists`)

- Base : `agent/mobile-feed-shell` (cette branche doit être mergée après la PR de Codex).
- Décision d'Antoine appliquée : pas de contenu générique de remplacement.

### Changements

- `app/(tabs)/search.tsx` : les artistes sans publication (`status='published'`)
  n'apparaissent plus sur la carte ni dans la liste ni dans « Dispo maintenant ».
  Réactivation automatique dès leur première publication — aucun flag en base.
  Les 8 profils démo sans portfolio restent accessibles par URL directe.
- `supabase/seed_demo.sql` : régénéré depuis la base distante (v3) — reflète
  exactement les 23 posts actuels (10 vidéos + 13 photos tattoo), 28 comptes,
  dispos, lieux, avis, interactions.

### Vérifications

- TypeScript : OK. Export web : OK. Recherche vérifiée en preview (voir PR).

### Prochaine action

- Antoine : valider la preview de la PR #5 (`agent/mobile-feed-shell`) puis merger.
- Merger ensuite `agent/hide-empty-artists` (PR de suivi, basée dessus).
- Ne PAS merger sans l'accord explicite d'Antoine.


---

## Intervention Claude — 2026-07-10 (suite, même branche `agent/hide-empty-artists`)

Retours d'Antoine sur la preview de la coque téléphone :

- **Photos du feed dézoomées** : `contentFit="contain"` sur fond flou (la même
  photo en `cover` + blur 50 derrière) — on voit désormais tout le tatouage,
  jamais recadré. Les vidéos restent en `cover`.
- **Coque téléphone limitée au feed** : la CSS est gatée par la classe
  `body.ink-feed-shell`, posée/retirée par l'écran feed au focus/blur.
  Recherche, boards, messages, profil et écrans secondaires repassent en
  plein écran (reverts des contraintes de largeur sur les écrans secondaires).
- **Fix onglet Boards visiteur** : le segment "board" de l'onglet matchait la
  règle de protection prévue pour la route `board/[id]` → redirection forcée
  vers la connexion sans barre d'onglets. Corrigé : seul `segments[0]==="board"`
  (route racine) est protégé. L'onglet montre son écran d'invitation.

Vérifié en preview : coque 430px arrondie sur le feed, plein écran sur
Recherche, écran d'invitation + barre d'onglets sur Boards visiteur,
photo entière sur fond flou.

---

## Intervention Codex — 2026-07-11 (reprise de la lightbox Claude)

- Branche : `agent/hide-empty-artists` (PR #6), toujours non mergée.
- Les trois modifications locales inachevées de Claude ont été récupérées.

### Changements

- **Lightbox desktop robuste** : le feed utilise désormais un vrai `Modal`
  plein écran, indépendant du conteneur Expo qui le coinçait dans un angle.
- L'arrière-plan représente une page de découverte tattoo floutée. Un clic sur
  cet arrière-plan, sur le bouton `×` ou la touche Échap renvoie vers Recherche.
- La barre d'onglets mobile est masquée uniquement dans cette lightbox desktop.
  Sur téléphone, le feed reste plein écran avec sa navigation native.
- **Présentation INK** : déplacée au niveau du layout des onglets pour que son
  délai survive aux changements de page. Sur ordinateur elle apparaît après
  60 secondes sous forme de carte compacte ; sur téléphone elle reste une
  feuille mobile native. Elle ne bloque plus l'arrivée sur le site desktop.

### Vérifications

- TypeScript : OK (`tsc --noEmit`).
- Export Web Expo : OK (`npm run build:web`).
- Diff Git : OK (`git diff --check`).

### Prochaine action

- Contrôler la nouvelle preview Vercel de la PR #6 sur desktop et téléphone.
- Ne rien merger sans validation explicite d'Antoine ; ordre inchangé : #5 puis #6.

### Correctif interaction — 2026-07-11

- Cause du blocage : Expo conserve les écrans d'onglets montés. La lightbox
  restait donc visible même après la navigation vers Recherche.
- La visibilité est maintenant liée au focus réel de l'onglet Feed et coupée
  immédiatement avant la navigation.
- La page visible derrière est désormais le véritable écran Recherche, pas une
  imitation en grille. Le flou est appliqué au-dessus de cette page réelle.
- Clic sur le fond, `×` ou Échap : fermeture immédiate puis Recherche pleinement
  utilisable avec la barre Feed, Recherche, Boards, Messages et Profil.
