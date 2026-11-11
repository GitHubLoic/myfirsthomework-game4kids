'use strict';

// On conserve les identifiants des mondes et leur progression en changeant d’univers.
const ISLAND_WORLDS = JSON.parse(JSON.stringify(WORLDS));
const ISLAND_CHART_LABELS = ['Tropiques', 'Pirates', 'Glaces', 'Bonbons', 'Étoiles'];
const DINO_REGIONS = [
  ['La Vallée des Dinos', 'Vallée', '#4e8055', '#c6df9e', 'la feuille magique', '🌿', ['La clairière aux œufs', 'Le sentier des tricératops', 'Le grand diplodocus', 'Les fougères géantes', 'Les empreintes mystérieuses', 'Le nid des petits dinos']],
  ['Les Volcans Dorés', 'Volcans', '#b47145', '#f3d394', 'le cristal du volcan', '💎', ['Le volcan endormi', 'La grotte aux cristaux', 'Les rochers dorés', 'La montagne qui fume', 'Le pont de pierre', 'Le volcan aux trésors']],
  ['La Forêt des Géants', 'Forêt', '#326b50', '#a7cf86', 'la fleur des géants', '🌸', ['Le grand séquoia', 'Les pas du stégosaure', 'La forêt des lianes', 'Le passage des fougères', 'Le grand rocher', 'La clairière enchantée']],
  ['Le Canyon des Fossiles', 'Fossiles', '#a87956', '#efc79b', 'le fossile doré', '🦴', ['Le petit canyon', 'Les traces dans le sable', 'La falaise aux fossiles', 'Le rocher des lézards', 'Les pierres arc-en-ciel', 'La découverte du fossile']],
  ['Le Volcan des Étoiles', 'Étoiles', '#414d66', '#b4c6b0', 'l’étoile des dinos', '🌟', ['Le coucher du soleil', 'Les lucioles de la forêt', 'Le dino sous la lune', 'Les empreintes étoilées', 'Le volcan lumineux', 'Le grand nid des étoiles']],
];
const DINO_COLORS = [['#76b65c', 'Vert'], ['#68b6c2', 'Bleu'], ['#b08ad0', 'Violet'], ['#e49c65', 'Orange'], ['#df8193', 'Rose']];
const isDinoTheme = () => S.theme === 'dinosaurs';
const themeText = (islands, dinosaurs) => isDinoTheme() ? dinosaurs : islands;
const gameTitle = () => themeText('Les Petites Îles Magiques', 'Les Petits Dinos Magiques');
const worldArtPath = (id) => themeText(`assets/marine/${id}.webp`, 'assets/dinosaurs/volcano.webp');
const answerFoodHTML = () => isDinoTheme() ? '<span class="choice-food" aria-hidden="true"><img src="assets/dinosaurs/food.webp" alt="" draggable="false" width="1448" height="1086"></span>' : '';
const countWord = (n = 2) => themeText(`coquillage${n > 1 ? 's' : ''}`, `œuf${n > 1 ? 's' : ''}`);
const countToken = () => themeText('🐚', '<img class="picture theme-count-token" src="assets/dinosaurs/egg.svg" alt="" aria-hidden="true">');

function applyGameTheme() {
  if (!['islands', 'dinosaurs'].includes(S.theme)) S.theme = 'islands';
  WORLDS.forEach((world, i) => {
    Object.assign(world, ISLAND_WORLDS[i]);
    if (isDinoTheme()) {
      const [name, label, c1, c2, rewardName, reward, steps] = DINO_REGIONS[i];
      Object.assign(world, { name, c1, c2, rewardName, reward, steps, decor: ['🌿', '🌋', '🦕', '🦖', '🥚', '🌳'] });
      CHART_LABELS[world.id] = label;
    } else CHART_LABELS[world.id] = ISLAND_CHART_LABELS[i];
  });
  document.body.dataset.gameTheme = S.theme;
  document.title = `${gameTitle()} • MS / GS`;
}
