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
