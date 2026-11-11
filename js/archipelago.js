// Illustrations locales séparées du texte et des interactions.
const CHART_LABELS = { tropical: 'Tropiques', pirates: 'Pirates', ice: 'Glaces', candy: 'Bonbons', stars: 'Étoiles' };

function islandArt(id) {
  return `<img class="island-art" src="${worldArtPath(id)}" alt="" width="1448" height="1086" decoding="async" draggable="false">`;
}

function chartScenery() {
  return `<svg class="chart-scenery chart-desktop-route" viewBox="0 0 1200 650" preserveAspectRatio="none" aria-hidden="true"><path class="chart-route" d="M430 540C590 625 780 625 950 540S1120 350 1010 230 810 160 600 230 350 310 190 230"/></svg>
    <svg class="chart-scenery chart-mobile-route" viewBox="0 0 400 1300" preserveAspectRatio="none" aria-hidden="true"><path class="chart-route" d="M130 175C90 245 330 220 290 365S80 400 120 615 340 660 290 865 90 920 125 1150"/></svg>`;
}

function chartProfessor() {
  return `<span class="chart-professor chart-professor-svg">${profSVG('happy')}</span>`;
}
