# Univers dinosaures

Direction artistique dessin animé : couleurs vives, contours doux, ombres illustrées et reflets lumineux, en continuité avec les îles du jeu d’origine.

Illustrations créées pour cette adaptation et servies localement :

- `volcano.webp` : volcan illustré sur fond transparent, fougères, fleurs et œuf ; accueil, carte, décor et trésor.
- `jungle.webp` : décor préhistorique lumineux, ciel bleu, volcans lointains et grand sentier dégagé pour les activités.
- `dino.webp` : bébé dinosaure souriant sur fond transparent, utilisé dans le personnage animé et ses aperçus.
- `food.webp` : portion de fruits et de feuilles pour les propositions de réponse ; elle est mangée lorsque le dino rejoint la bonne réponse.
- `egg.svg` : œuf tacheté pour le dénombrement et les collections.

Les quatre illustrations WebP totalisent environ 1 Mo. Les originaux générés sont conservés dans l’espace de travail ; seules les versions optimisées pour le jeu sont publiées dans le dépôt.

`dinoSVG` dans `js/boat.js` conserve son nom pour les appels existants et rend désormais une image HTML : la rotation de teinte est appliquée directement à cette image pour que les cinq couleurs fonctionnent dans les paramètres et dans le jeu. Le personnage reste devant les repas et le décor, même au repos, tandis que les panneaux de réponse restent lisibles au-dessus de lui ; le dino s’oriente vers sa destination, marche et rebondit lors des réussites. Les animations respectent la préférence de réduction des mouvements.

Les lettres, les chiffres, les consignes et les aides sont rendus en HTML, séparément du décor. Le thème des îles conserve ses illustrations. Aucun service externe n’est nécessaire au chargement du jeu.
