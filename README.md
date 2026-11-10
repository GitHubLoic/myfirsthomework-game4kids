# Les Petites Îles Magiques

**myfirsthomework-game4kids** : une adaptation maternelle MS / GS de [homework-game4kids](https://github.com/GitHubLoic/homework-game4kids).

On garde le bateau personnalisable, les cinq mers illustrées, les quatre professeurs, les voyages en six escales et les coffres au trésor. Les activités sont conçues pour découvrir les lettres et les quantités avec un adulte, sans lecture autonome nécessaire.

## Découvertes

- **Moyenne section** : reconnaître les 26 lettres capitales, retrouver une lettre parmi deux choix à partir d’une consigne sonore et d’une image repère, dénombrer et construire des collections de 1 à 5.
- **Grande section** : reconnaître les capitales, retrouver une capitale ou une minuscule à partir d’une consigne sonore et d’une image repère, choisir parmi trois réponses, dénombrer et construire des collections de 1 à 10.
- **Je compte** : toucher chaque coquillage une seule fois pour l’énumérer, entendre le nombre, puis retrouver le cardinal ; remplir et vider les cases du bateau pour construire une collection.
- **Les lettres** : entendre le nom de la lettre, voir une image dont le nom commence par cette lettre (T comme tortue), puis choisir la lettre sur une île. La réponse écrite apparaît uniquement dans l’aide. Le bateau rejoint l’île choisie avant de valider ; après une erreur, il revient au départ. Les chiffres et les lettres sont centrés dans les panneaux. Les deux activités proposent des capitales ou des minuscules ; la voix utilise le nom des lettres, sans prétendre produire leurs phonèmes isolés. La consigne complète est dite au début. Le bouton de la bulle rejoue uniquement le nom de la lettre ; celui de l’image dit uniquement le mot repère, même lorsque la narration automatique est désactivée.
- **Tout explorer** : alterner les lettres et les nombres.

Les images repères sont disponibles pour les 26 lettres. Les aides sont disponibles dès la première consigne. Après une erreur, le professeur explique et le jeu montre un modèle ou met la bonne réponse en évidence. Chaque escale terminée donne trois étoiles, quels que soient les essais et les aides utilisés. Aucun chronomètre.

## Jouer

```sh
python3 serve.py
```

Ouvrir <http://localhost:8765>. Aucun gestionnaire de paquets ni compilation nécessaire. L’enfant peut choisir directement L’île des lettres ou Le trésor à compter. Le coin des parents regroupe le choix MS / GS, le professeur et le bateau. Le prénom est facultatif. Les activités de lettres demandent d’écouter : utiliser le bouton Écouter. Si la synthèse vocale est indisponible, un adulte peut nommer l’image et la lettre, ou ouvrir l’aide.

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
node tests/audio-letters.cjs
node tests/voyage-choices.cjs
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
