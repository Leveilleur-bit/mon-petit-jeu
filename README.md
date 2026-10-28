# Mon petit jeu

Petits jeux éducatifs pour les tout-petits (3-4 ans), à utiliser sur téléphone.
Sans publicité, sans compte, consignes à l'oral, jamais de « perdu ».

## Les jeux

| Jeu | Ce que fait l'enfant |
|---|---|
| 👑 Memory | Choisir ses cartes (princesses, animaux, mer, fruits, véhicules, gourmandises ; un thème réussi est coché ✓ jusqu'à ce que tous soient faits), puis retrouver les paires (3 à 10, ou des trios). Options : coup d'œil au début, temps d'affichage des cartes ratées. Après 5 parties d'affilée (réglable), le memory se repose jusqu'à ce que 3 autres jeux soient finis |
| 🧩 Puzzles | Choisir parmi 18 images et faire glisser les morceaux (2, 4, 6, 9, 12, puis 16 au choix) ; une image réussie est cochée ✓ |
| ✏️ Mon prénom | Remettre les lettres du prénom dans l'ordre, puis les tracer au doigt ; autres prénoms en niveaux |
| 🔤 Lettres et mots | Mélange : « Où est la lettre B ? B comme ballon » et lecture des syllabes (LA · PIN) |
| 🔢 Les nombres | Compter les objets, retrouver le chiffre, puis tracer ce nombre au doigt |
| 🎨 Formes et couleurs | Mélange : « Où est le rouge ? », « Où est le triangle rouge ? » et suites logiques (🔴🔵🔴🔵❓ : A B A B, puis A A B, puis A B C) |
| 🐾 Les animaux | Mélange : qui fait ce bruit ? (cris), qu'est-ce qu'il mange ? (goûter), où est son ombre ? |
| 🌱 La nature | Mélange : fruits et légumes, vivant ou pas vivant (deux paniers), remettre dans l'ordre comment ça grandit (poule, papillon, fleur, grenouille, personne) |
| ⏰ Le temps | Mélange : « Et maintenant, c'est quand ? » (d'après l'heure du téléphone), « Le bain, c'est quand ? » (matin, midi, après-midi, soir, nuit), remettre sa journée dans l'ordre (réveil → petit-déjeuner → école → goûter → bain → dodo), les saisons (bonhomme de neige, plage, feuilles qui tombent…) |
| 🐘 Grand, moyen, petit | Toucher le plus grand, le plus petit, puis le moyen |
| 🖍️ Coloriage | 15 dessins à colorier (maison, fleur, poisson, papillon, voiture, licorne, château, fusée, chat, arc-en-ciel, bateau, glace, gâteau, princesse, escargot), cochés ✓ une fois faits, et dessin libre au doigt avec gomme |
| 🎵 Musique | Xylophone libre ou 3 chansons guidées |
| 🌿 Le labyrinthe | Un jardin de haies : faire glisser l'animal dans les allées jusqu'à son goûter (impasses, un seul bon chemin). De 3 × 4 à 6 × 8 cases, la taille monte seule. Le haut-parleur fait briller les prochaines cases du bon chemin |

Les jeux regroupés gardent un réglage de difficulté et une ligne de bilan pour chaque thème (Lettres, Lire, Compter, Chiffres, Couleurs, Formes, Suites, Moments, Journée, Saisons, Cris, Goûter, Ombres, Fruits et légumes, Vivant ou pas, Ça grandit). Maximum prévu : 20 jeux.

**Accueil** : 9 jeux tirés au hasard à chaque ouverture de l'appli, en priorité ceux qui n'étaient pas affichés la fois précédente (réglable : « Tous les jeux »). Les jeux marqués ⭐ dans le coin des parents sont toujours affichés (Memory par défaut).

**Album d'autocollants** (📒 en haut de l'accueil) : chaque partie finie fait gagner un autocollant surprise (60 différents). On le colle sur 4 décors (prairie, mer, château, espace) et on le déplace au doigt ; le faire glisser vers le bas le remet dans la réserve. Une fois le temps d'écran écoulé, l'album reste accessible 5 minutes depuis l'écran « C'est la pause ».

Une partie = 5 questions (3 pour Compter, 3 mots pour Lire, une grille pour Memory et Puzzles), puis des confettis.
En cas d'erreur, l'image se grise et la voix dit ce que c'était (« Ça, c'est le brocoli. Où est la carotte ? ») : l'enfant finit toujours par trouver.

## Coin des parents

Appui long (2 secondes) sur la petite roue en haut à droite de l'écran des jeux. Les rubriques se replient.

**📊 Bilan** : pour chaque jeu, nombre de parties, pourcentage trouvé du premier coup, confusions fréquentes (ex. « violet → bleu »), et une suggestion pour monter ou baisser la difficulté.

**☁️ Sauvegarde et suivi** : avec un jeton GitHub (accès « Contents : Read and write » au seul dépôt privé `mon-petit-jeu-data`), l'appli envoie `data.json` après chaque partie : bilan, journal des parties (jeu, durée, réussites, erreurs, niveau), minutes de jeu par jour, niveaux, album, réglages. Au lancement, elle lit `config.json` (réglages préparés par Claude ou les parents : `version`, `date`, `note`, `settings`, `progress`) et l'applique si sa version est nouvelle. Bouton « Restaurer depuis GitHub » pour un nouveau téléphone.

**🐮 Cris des animaux** : écouter chaque cri, l'enregistrer au micro (4 s max), importer un fichier son (📁, ex. depuis bigsoundbank.com, sons libres de droits), ou revenir au cri de l'appli.

Réglages : **difficulté jeu par jeu** (nombre d'images, formes seules ou avec couleurs, tracé facile ou précis, nombre de paires, de morceaux…), volume, vitesse de la voix, bruitages, prénom, autres prénoms à écrire, jeux affichés, « compter jusqu'à », lettres simples ou tout l'alphabet, jeux favoris ⭐, vider l'album, limite de temps d'écran par jour (temps cumulé sur toute la journée, liste des utilisations du jour, alerte vocale 2 minutes avant, « − 10 min », « + 10 min » et remise à zéro).
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

Après une modification, changer le numéro dans `sw.js` (`mon-petit-jeu-v23` → `v24`…).
Le téléphone prend la nouvelle version au lancement suivant.

## Technique

HTML, CSS et JavaScript simples, sans outil de build ni dépendance.
Images : emojis du téléphone. Sons : synthétisés dans le navigateur. Voix : synthèse vocale du téléphone.
