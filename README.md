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
| 👑 Memory | Choisir ses cartes (princesses, animaux, mer, fruits, véhicules, gourmandises), puis retrouver les paires : 3 paires au début, puis une de plus à chaque grille réussie (jusqu'à 6). Bouton « Suivant » à la fin. Après 5 parties d'affilée (réglable), le memory se repose jusqu'à ce que 3 autres jeux soient finis |
| 🧩 Puzzles | Choisir une image (château, licorne, tracteur…) et faire glisser les morceaux : 2 morceaux au début, puis 4, 6 et 9 à chaque puzzle réussi. Bouton « Suivant » : image suivante, un peu plus difficile |
| 📖 Lire | Toucher les syllabes une par une (LA · PIN), la voix les lit, puis lit le mot entier. Syllabes en bleu et rouge, comme à l'école |
| ✏️ Mon prénom | Remettre les lettres du prénom dans l'ordre, puis tracer chaque lettre au doigt en partant du point vert (la voix montre d'abord le chemin). Le prénom se règle dans le coin des parents. On peut y ajouter d'autres prénoms (famille, copains) : ils deviennent des niveaux, du plus court au plus long, avec une étoile une fois réussis et un bouton « Suivant » |
| 🔷 Formes et couleurs | « Où est le triangle rouge ? » : rond, carré, triangle, rectangle, étoile, cœur, losange × 7 couleurs (niveau 1 : formes seules) |
| 🐘 Grand, moyen, petit | Toucher le plus grand, le plus petit, puis le moyen (à tour de rôle) |
| 🦒 Les ombres | Retrouver l'ombre de l'animal ou de l'objet montré |
| 🖍️ Coloriage | 5 dessins (maison, fleur, poisson, papillon, voiture) : choisir une couleur, toucher une zone. Bouton vert pour finir, « Suivant » pour le dessin d'après |
| 🎵 Musique | Xylophone libre, ou 3 chansons guidées (la barre à toucher brille) : Au clair de la lune, Frère Jacques, Ah vous dirai-je maman |
| 🛤️ Le bon chemin | Un animal a faim, trois chemins emmêlés : un seul mène à son goûter. On suit un chemin au doigt depuis un point vert ; s'il mène ailleurs, on essaie un autre. Chemins de couleurs différentes au début, puis de la même couleur et plus emmêlés |
| 🐰 Le goûter | « Le lapin a faim ! Qu'est-ce qu'il mange ? » : retrouver le repas de 12 animaux (carotte, banane, miel, noisette, fromage…) |

**Accueil** : 9 jeux tirés au hasard à chaque ouverture de l'appli, en priorité ceux qui n'étaient pas affichés la fois précédente (réglable : « Tous les jeux »). Les jeux marqués ⭐ dans le coin des parents sont toujours affichés (Memory par défaut).

**Album d'autocollants** (📒 en haut de l'accueil) : chaque partie finie fait gagner un autocollant surprise (60 différents). On le colle sur 4 décors (prairie, mer, château, espace) et on le déplace au doigt ; le faire glisser vers le bas le remet dans la réserve.

Une partie = 5 questions (3 pour Compter, 3 mots pour Lire, une grille pour Memory et Puzzles), puis des confettis.
En cas d'erreur, l'image se grise et la voix dit ce que c'était (« Ça, c'est le brocoli. Où est la carotte ? ») : l'enfant finit toujours par trouver.

## Coin des parents

Appui long (2 secondes) sur la petite roue en haut à droite de l'écran des jeux.
Réglages : **difficulté jeu par jeu** (nombre d'images, formes seules ou avec couleurs, tracé facile ou précis, nombre de paires, de morceaux…), volume, vitesse de la voix, bruitages, prénom, autres prénoms à écrire, jeux affichés, « compter jusqu'à », lettres simples ou tout l'alphabet, jeux favoris ⭐, vider l'album, limite de temps d'écran par jour (avec « +10 min aujourd'hui »).
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

Après une modification, changer le numéro dans `sw.js` (`mon-petit-jeu-v10` → `v11`…).
Le téléphone prend la nouvelle version au lancement suivant.

## Technique

HTML, CSS et JavaScript simples, sans outil de build ni dépendance.
Images : emojis du téléphone. Sons : synthétisés dans le navigateur. Voix : synthèse vocale du téléphone.
