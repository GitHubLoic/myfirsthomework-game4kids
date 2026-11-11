# Univers dinosaures

Direction artistique dessin animé : couleurs vives, contours doux, ombres illustrées et reflets lumineux, en continuité avec les îles du jeu d’origine.

Illustrations créées pour cette adaptation et servies localement :

- `volcano.webp` : volcan illustré sur fond transparent, fougères, fleurs et œuf ; accueil, carte, réponses et trésor.
- `jungle.webp` : décor préhistorique lumineux, ciel bleu, volcans lointains et grand sentier dégagé pour les activités.
- `dino.webp` : bébé dinosaure souriant sur fond transparent, utilisé dans le personnage animé et ses aperçus.
- `egg.svg` : œuf tacheté pour le dénombrement et les collections.

Les trois illustrations WebP totalisent environ 860 Ko. Les originaux générés sont conservés dans l’espace de travail ; seules les versions optimisées pour le jeu sont publiées dans le dépôt.

`dinoSVG` dans `js/boat.js` place le personnage illustré dans le cadre de déplacement existant. Les cinq choix de couleur sont conservés par rotation de teinte ; le dino s’oriente vers sa destination, marche et rebondit lors des réussites. Les animations respectent la préférence de réduction des mouvements.

Les lettres, les chiffres, les consignes et les aides sont rendus en HTML, séparément du décor. Le thème des îles conserve ses illustrations. Aucun service externe n’est nécessaire au chargement du jeu.
