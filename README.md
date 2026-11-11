# Les Petites Îles Magiques

**myfirsthomework-game4kids** : une adaptation maternelle MS / GS de [homework-game4kids](https://github.com/GitHubLoic/homework-game4kids).

On garde le bateau personnalisable, les cinq mers illustrées, les quatre professeurs, les voyages en six escales et les coffres au trésor. Les activités sont conçues pour découvrir les lettres et les quantités avec un adulte, sans lecture autonome nécessaire.

## Choisir un univers

Dans **Coin des parents → Ton univers**, choisir **Les Îles** ou **Les Dinosaures**. Le choix est sauvegardé sur l’appareil.

- **Les Îles** : bateau personnalisable, océan, cinq mers et coquillages à compter.
- **Les Dinosaures** : petit dino illustré à la couleur personnalisable, jungle dessin animé aux couleurs vives, cinq régions à volcans et œufs à compter ou à placer dans un nid. Des portions de fruits et de feuilles remplacent les volcans sous les propositions : le dino avance vers la bonne réponse et mange sa portion avant la récompense. Les volcans restent dans le décor et sur la carte.

Les activités MS / GS, les professeurs, les étoiles et les mondes débloqués sont partagés entre les thèmes : changer d’univers ne remet pas la progression à zéro. Les sauvegardes antérieures restent compatibles et démarrent dans le thème des îles.

## Découvertes

- **Moyenne section** : reconnaître les 26 lettres capitales, retrouver une lettre parmi deux choix à partir d’une consigne sonore et d’une image repère, dénombrer et construire des collections de 1 à 5.
- **Grande section** : reconnaître les capitales, retrouver une capitale ou une minuscule à partir d’une consigne sonore et d’une image repère, choisir parmi trois réponses, dénombrer et construire des collections de 1 à 10.
- **Je compte** : toucher chaque coquillage une seule fois pour l’énumérer, entendre le nombre, puis retrouver le cardinal ; remplir et vider les cases du bateau pour construire une collection.
- **Les lettres** : entendre le début naturel du mot de l’image (« po… » pour pomme, « tor… » pour tortue), puis retrouver sa première lettre. Le bouton « Écouter le début » et celui de la bulle jouent un extrait court du même enregistrement que le bouton « Écouter le mot ». Aucune consonne n’est fabriquée, répétée ou mise en boucle. Les fichiers sont intégrés au jeu, sans synthèse vocale pour ces écoutes. Les débuts proches ne sont pas proposés ensemble ; le H silencieux reste expliqué dans l’aide.
- **Tout explorer** : alterner les lettres et les nombres.

Les images repères sont disponibles pour les 26 lettres. Les aides sont disponibles dès la première consigne. Après une erreur, le professeur explique et le jeu montre un modèle ou met la bonne réponse en évidence. Chaque escale terminée donne trois étoiles, quels que soient les essais et les aides utilisés. Aucun chronomètre.

## Jouer

```sh
python3 serve.py
```

Ouvrir <http://localhost:8765>. Aucun gestionnaire de paquets ni compilation nécessaire. L’enfant peut choisir directement L’île des lettres ou Le trésor à compter. Le coin des parents regroupe le choix MS / GS, le thème, le professeur et la personnalisation du bateau ou du dino. Le prénom est facultatif. Les activités de lettres demandent d’écouter : utiliser le bouton Écouter. Si la synthèse vocale est indisponible, un adulte peut nommer l’image et la lettre, ou ouvrir l’aide.

Les mots et leurs débuts sont enregistrés dans le jeu et fonctionnent sans voix système. La synthèse vocale des mots et des consignes dépend des voix du navigateur : une voix française est recommandée. Le test du son et le choix de voix se trouvent dans l’atelier. Les données sont enregistrées sur cet appareil dans `petitesIlesMagiques.v1`, séparément de la version CP / CE1. Les images et polices sont locales.

## Organisation

- `js/themes.js`, `css/themes.css`, `assets/dinosaurs` : thèmes, textes, décors et personnage préhistorique.
- `js/word-audio.js`, `assets/words` : mots enregistrés et extraits de leur début, lecture Web Audio et crédits.
- `js/preschool.js` : quatre activités maternelle, débuts de mots, modèles et manipulation.
- `js/game.js` : accueil MS / GS, navigation, voyages, aides et récompenses ; les anciens moteurs CP / CE1 sont conservés pour l’historique mais exclus des voyages maternelle.
- `css/preschool.css` : grandes cibles tactiles, modèles et collections.
- `js/prof.js`, `js/boat.js`, `js/scenes.js`, `js/archipelago.js` : univers et personnages du jeu d’origine.

## Vérification

Avec Node.js, Playwright et Chromium installés :

```sh
# Dans un autre terminal, laisser tourner python3 serve.py
node tests/preschool.cjs
node tests/audio-letters.cjs
node tests/voyage-choices.cjs
node tests/themes.cjs
node tests/dino-food-colors.cjs
```

Le test vérifie les générateurs MS / GS, la séparation lettres / nombres, les erreurs et les aides, le comptage sans doublons, les collections, les récompenses, la sauvegarde et la largeur mobile. Par défaut, Chromium est attendu dans `/usr/bin/chromium` ; définir `CHROMIUM_PATH` pour utiliser une autre installation.

## Origine et publication

L’historique Git du projet d’origine est conservé. `upstream` pointe vers `GitHubLoic/homework-game4kids` ; `origin` est préparé pour `GitHubLoic/myfirsthomework-game4kids`. Le dépôt d’origine n’est pas modifié. GitHub ne permet pas de créer un fork sous le même propriétaire : cette version se publie dans un dépôt indépendant.

Après création du dépôt vide `myfirsthomework-game4kids` sur GitHub :

```sh
git push -u origin main
```

## Crédits

Illustrations, personnages et univers repris du projet d’origine. Pictogrammes Twemoji (Twitter et autres contributeurs), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), attribution et licence dans `assets/pictures`. Polices Andika et Fredoka sous SIL Open Font License, licences dans `assets/fonts`.
