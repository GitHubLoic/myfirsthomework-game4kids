// Dessin du bateau-personnage (SVG) — animé en CSS (.sailing, .happy, .oops, .bonk)

let boatUid = 0;

function boatSVG(b, cls = '') {
  if (isDinoTheme()) return dinoSVG(S.dino, cls);
  const { hull, sail, pattern } = b;
  const id = `bt${++boatUid}`;
  const mainSail = 'M63 14 Q92 40 100 72 L63 72 Z';
  const jib = 'M57 22 Q40 48 30 70 L57 70 Z';
  const accent = hull;
  let deco = '';
  if (pattern === 'rayures') {
    deco = [0, 1, 2, 3, 4].map((i) => `<rect x="20" y="${22 + i * 12}" width="90" height="6" fill="${accent}" opacity=".75"/>`).join('');
  } else if (pattern === 'pois') {
    deco = [[72, 40], [84, 58], [70, 62], [48, 46], [44, 62], [79, 48]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="${accent}" opacity=".8"/>`).join('');
  } else if (pattern === 'coeur') {
    deco = `<path d="M78 46 C78 40 70 38 70 44 C70 38 62 40 62 46 C62 52 70 57 70 60 C70 57 78 52 78 46 Z" fill="${accent}" transform="translate(6 2)"/>`;
  } else if (pattern === 'etoile') {
    deco = `<path d="M78 34 L81 44 L91 44 L83 50 L86 60 L78 54 L70 60 L73 50 L65 44 L75 44 Z" fill="${accent}"/>`;
  }

  return `<svg class="boat-svg ${cls}" viewBox="0 0 120 112" aria-hidden="true">
    <defs><clipPath id="${id}"><path d="${mainSail}"/><path d="${jib}"/></clipPath><linearGradient id="${id}-hull" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${hull}"/><stop offset="1" stop-color="${hull}" stop-opacity=".78"/></linearGradient></defs>
    <g class="b-body">
      <rect x="58" y="8" width="5" height="68" rx="2" fill="#b77b42" stroke="#183452" stroke-width="1.5"/>
      <path class="b-flag" d="M63 8 L80 12 L63 17 Z" fill="${hull}" stroke="#183452" stroke-width="1.5" stroke-linejoin="round"/>
      <g class="b-sails">
        <path d="${mainSail}" fill="${sail}" stroke="#183452" stroke-width="1.7"/>
        <path d="${jib}" fill="${sail}" stroke="#183452" stroke-width="1.7"/>
        <g clip-path="url(#${id})">${deco}</g>
      </g>
      <path d="M10 72 L110 72 Q104 100 86 104 L34 104 Q16 100 10 72 Z" fill="url(#${id}-hull)" stroke="#183452" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M10 72 L110 72 L108 80 L12 80 Z" fill="#fff5d5" stroke="#183452" stroke-width="1.2"/>
      <path d="M17 84 30 86m60-1 12-2" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>
      <path d="M34 104 Q16 100 13 86 Q60 96 107 86 Q104 100 86 104 Z" fill="rgba(0,0,0,.15)"/>
      <g class="b-eyes">
        <ellipse cx="46" cy="89" rx="5" ry="6" fill="#fff"/><ellipse cx="74" cy="89" rx="5" ry="6" fill="#fff"/>
        <circle cx="47" cy="90" r="3" fill="#2b2340"/><circle cx="75" cy="90" r="3" fill="#2b2340"/>
        <circle cx="48" cy="88.6" r="1" fill="#fff"/><circle cx="76" cy="88.6" r="1" fill="#fff"/>
      </g>
      <circle cx="38" cy="96" r="3" fill="#ff8fab" opacity=".6"/><circle cx="82" cy="96" r="3" fill="#ff8fab" opacity=".6"/>
      <path class="m-smile" d="M55 96 Q60 100 65 96" stroke="#2b2340" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path class="m-happy" d="M53 95 Q60 104 67 95 Z" fill="#8a3b3b"/>
      <ellipse class="m-oops" cx="60" cy="98" rx="2.6" ry="3" fill="#8a3b3b"/>
    </g>
  </svg>`;
}

// Une image HTML rend la teinte de façon identique dans l’aperçu et dans le jeu.
function dinoSVG(colors, cls = '') {
  const hue = { '#76b65c': 0, '#68b6c2': 80, '#b08ad0': 155, '#e49c65': 290, '#df8193': 225 }[colors.body] || 0;
  return `<span class="boat-svg dino-svg ${cls}" aria-hidden="true"><span class="dino-facing"><img class="dino-illustration" src="assets/dinosaurs/dino.webp" alt="" draggable="false" width="1254" height="1254" style="filter:hue-rotate(${hue}deg)"></span></span>`;
}
