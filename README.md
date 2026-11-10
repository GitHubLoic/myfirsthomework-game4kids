# Les Petites Îles Magiques

**myfirsthomework-game4kids** : une adaptation maternelle MS / GS de [homework-game4kids](https://github.com/GitHubLoic/homework-game4kids).

On garde le bateau personnalisable, les cinq mers illustrées, les quatre professeurs, les voyages en six escales et les coffres au trésor. Les activités sont conçues pour découvrir les lettres et les quantités avec un adulte, sans lecture autonome nécessaire.

## Découvertes

- **Moyenne section** : reconnaître les 26 lettres capitales, retrouver une lettre parmi deux choix avec un modèle permanent, dénombrer et construire des collections de 1 à 5.
- **Grande section** : reconnaître les capitales, associer capitale et minuscule avec un modèle permanent, choisir parmi trois réponses, dénombrer et construire des collections de 1 à 10.
- **Je compte** : toucher chaque coquillage une seule fois pour l’énumérer, entendre le nombre, puis retrouver le cardinal ; remplir et vider les cases du bateau pour construire une collection.
- **Les lettres** : entendre le nom de chaque lettre et comparer les formes. Ces activités travaillent la reconnaissance des lettres, pas la lecture ni les sons des lettres.
- **Tout explorer** : alterner les lettres et les nombres.

Les aides sont disponibles dès la première consigne. Après une erreur, le professeur explique et le jeu montre un modèle ou met la bonne réponse en évidence. Chaque escale terminée donne trois étoiles, quels que soient les essais et les aides utilisés. Aucun chronomètre.

## Jouer

```sh
python3 serve.py
```

Ouvrir <http://localhost:8765>. Aucun gestionnaire de paquets ni compilation nécessaire. Choisir MS ou GS dans l’atelier, puis les activités, le professeur et le bateau. Le prénom est facultatif. Les consignes et les modèles restent visibles si le son est coupé ou indisponible.

La synthèse vocale dépend des voix du navigateur et du système : une voix française est recommandée. Le test du son et le choix de voix se trouvent dans l’atelier. Les données sont enregistrées sur cet appareil dans `petitesIlesMagiques.v1`, séparément de la version CP / CE1. Les images et polices sont locales.

## Organisation

- `js/preschool.js` : quatre activités maternelle, noms des 26 lettres, modèles et manipulation.
- `js/game.js` : accueil MS / GS, navigation, voyages, aides et récompenses ; les anciens moteurs CP / CE1 sont conservés pour l’historique mais exclus des voyages maternelle.
- `css/preschool.css` : grandes cibles tactiles, modèles et collections.
- `js/prof.js`, `js/boat.js`, `js/scenes.js`, `js/archipelago.js` : univers et personnages du jeu d’origine.

## Vérification

Avec Node.js, Playwright et Chromium installés :

```sh
# Dans un autre terminal, laisser tourner python3 serve.py
node tests/preschool.cjs
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
