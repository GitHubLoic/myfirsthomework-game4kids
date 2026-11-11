# Mots prononcés naturellement et extraits de leur début

Le bouton « Écouter le début » joue le début du **même enregistrement** que « Écouter le mot » : par exemple le début de « pomme » et non une consonne /p/ répétée artificiellement.

## Enregistrements et crédits

- 25 mots : **Poslovitch**, enregistrements français du projet [Lingua Libre](https://lingualibre.org/), via Wikimedia Commons, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- « yo-yo » : **WikiLucas00**, enregistrement de mot seul via [Lingua Libre / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:LL-Q150_(fra)-WikiLucas00-yo-yo.wav), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Les fichiers `Y.wav` et `Y-start.wav` restent sous cette licence ; ils sont adaptés uniquement par conversion, suppression du silence, normalisation et extrait avec fondu.

`manifest.json` conserve pour chaque mot l’auteur, la page source, l’URL du fichier original, la licence et les empreintes SHA-256. Les enregistrements sont des mots seuls, sans article avant le mot.

## Traitement

Le mot entier est débarrassé de son silence de début et de fin, converti en WAV mono 22 050 Hz et normalisé en crête. Le début est un extrait continu pris au commencement de ce mot, entre 180 et 340 ms selon sa longueur, avec un fondu de sortie de 25 ms pour éviter une coupure sèche.

**Aucune répétition, boucle, synthèse de phonème, juxtaposition de consonnes ou modification de vitesse n’est appliquée.** La partie commune de l’extrait et du mot entier contient exactement les mêmes échantillons, sauf le fondu final.

`scripts/build-word-audio.py` reproduit le traitement depuis les fichiers originaux et leur fichier `sources.json`. Les deux versions de chaque mot sont intégrées au jeu et se lisent sans voix système ni accès à un service externe.

Les enregistrements décrivent des mots : le début de « hibou » est donc bien entendu, et l’aide explique que le H initial ne se prononce pas.
