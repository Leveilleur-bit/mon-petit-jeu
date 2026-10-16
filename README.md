# Mon petit jeu

Petits jeux éducatifs pour les tout-petits (3-4 ans), à utiliser sur téléphone.
Sans publicité, sans compte, consignes à l'oral, jamais de « perdu ».

## Les jeux

| Jeu | Ce que fait l'enfant |
|---|---|
| 🥕 Fruits et légumes | « Où est la carotte ? » : 3 images, il touche la bonne |
| 🍓 Compter | Il touche chaque objet, la voix compte avec lui, puis il retrouve le chiffre. Commence jusqu'à 5 et monte de 2 à chaque partie (jusqu'à 30 maximum, réglable) |
| 🎨 Couleurs | « Où est le rouge ? » : 11 couleurs |
| 🔤 Lettres | « Où est la lettre B ? B comme ballon » : majuscules, lettres simples d'abord, celles du prénom en priorité |
| 🐮 Animaux | « Qui fait meuh ? » |
| 👑 Memory princesse | Retourner les cartes pour trouver les paires : 3 paires au début, puis une de plus à chaque grille réussie (jusqu'à 6). Bouton « Suivant » à la fin |
| 🧩 Puzzles | Choisir une image (château, licorne, tracteur…) et faire glisser les morceaux : 2 morceaux au début, puis 4, 6 et 9 à chaque puzzle réussi. Bouton « Suivant » : image suivante, un peu plus difficile |
| 📖 Lire | Toucher les syllabes une par une (LA · PIN), la voix les lit, puis lit le mot entier. Syllabes en bleu et rouge, comme à l'école |

Une partie = 5 questions (3 pour Compter, 4 mots pour Lire, une grille pour Memory et Puzzles), puis des confettis.
En cas d'erreur, l'image se grise et la voix dit ce que c'était (« Ça, c'est le brocoli. Où est la carotte ? ») : l'enfant finit toujours par trouver.

## Coin des parents

Appui long (2 secondes) sur la petite roue en haut à droite de l'écran des jeux.
Réglages : volume, vitesse de la voix, bruitages, prénom, jeux affichés, « compter jusqu'à », lettres simples ou tout l'alphabet, retour au niveau facile pour Memory et Puzzles, limite de temps d'écran par jour (avec « +10 min aujourd'hui »).
Tout est enregistré sur le téléphone uniquement.

## Mettre en ligne (GitHub Pages)

1. Pousser ces fichiers à la racine du dépôt, branche `main`.
2. Sur GitHub : **Settings → Pages → Build and deployment → Deploy from a branch**, choisir `main` et `/ (root)`.
3. L'appli est disponible à `https://<utilisateur>.github.io/<dépôt>/`.

## Installer sur le Samsung

1. Ouvrir l'adresse dans Chrome (ou Samsung Internet).
2. Menu ⋮ → **Ajouter à l'écran d'accueil** (ou **Installer l'application**).
3. Lancer une première fois avec du réseau : ensuite l'appli marche sans connexion.

**Pour une voix française hors connexion** : Paramètres → Gestion globale → Langue et saisie → Synthèse vocale → moteur **Google** → réglages ⚙ → Installer les données vocales → Français (France).
Le coin des parents indique la voix utilisée, avec un bouton « Tester ».

## Mettre à jour l'appli

Après une modification, changer le numéro dans `sw.js` (`mon-petit-jeu-v3` → `v4`…).
Le téléphone prend la nouvelle version au lancement suivant.

## Technique

HTML, CSS et JavaScript simples, sans outil de build ni dépendance.
Images : emojis du téléphone. Sons : synthétisés dans le navigateur. Voix : synthèse vocale du téléphone.
