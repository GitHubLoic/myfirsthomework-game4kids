'use strict';

// ================= Sauvegarde =================
const STORE_KEY = 'petitesIlesMagiques.v1';
const DEFAULTS = {
  name: '', nameSay: '', level: 'MS', mode: 'mix', sound: true, voice: true, prof: 'bulle', profVoices: {}, worlds: {},
  boat: { hull: '#e63946', sail: '#ffffff', pattern: 'rayures' },
  dailyWords: DAILY_WORDS, wordStats: {},
};

function load() {
  const base = JSON.parse(JSON.stringify(DEFAULTS));
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return Object.assign(base, saved, { boat: Object.assign(base.boat, saved.boat) });
    }
  } catch (e) { /* stockage indisponible : on garde les valeurs par défaut */ }
  return base;
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* ignoré */ }
}
const S = load();

// ================= Outils =================
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

const app = document.getElementById('app');

// ================= Sons (synthétisés, aucun fichier) =================
const SFX = (() => {
  let ctx;
  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    return ctx;
  }
  function tone(f, d, type = 'sine', v = 0.15, t0 = 0, slide) {
    if (!S.sound) return;
    const x = getCtx();
    if (!x) return;
    const t = x.currentTime + t0;
    const o = x.createOscillator();
    const g = x.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(x.destination);
    o.start(t);
    o.stop(t + d + 0.05);
  }
  return {
    ctx: getCtx,
    click: () => tone(660, 0.06, 'triangle', 0.08),
    pop: () => tone(520, 0.12, 'sine', 0.2, 0, 1040),
    good: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.16, i * 0.09)),
    bad: () => { tone(220, 0.18, 'square', 0.05, 0, 160); tone(165, 0.25, 'square', 0.05, 0.15, 110); },
    door: () => { tone(160, 0.5, 'sawtooth', 0.04, 0, 80); tone(400, 0.5, 'sine', 0.08, 0.1, 1200); },
    star: (i) => tone(784 * Math.pow(1.26, i), 0.22, 'triangle', 0.16),
    whoosh: () => { tone(300, 0.6, 'sine', 0.07, 0, 900); tone(200, 0.6, 'triangle', 0.04, 0.05, 600); },
    step: (i) => tone(i % 2 ? 300 : 260, 0.05, 'triangle', 0.05),
    unlock: () => { tone(900, 0.08, 'square', 0.05); tone(1300, 0.15, 'triangle', 0.1, 0.08); },
    magic: () => { for (let i = 0; i < 8; i++) tone(1200 + i * 160, 0.1, 'sine', 0.06, i * 0.05); },
    win: () => [523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i === 6 ? 0.6 : 0.22, 'triangle', 0.18, i * 0.14)),
  };
})();

// iPhone / iPad : le son et la voix ne marchent qu'une fois « débloqués » pendant un toucher.
// On joue donc un son muet et une phrase quasi muette au premier toucher.
function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      const x = SFX.ctx();
      const src = x.createBufferSource();
      src.buffer = x.createBuffer(1, 1, 22050);
      src.connect(x.destination);
      src.start(0);
    }
    if ('speechSynthesis' in window && !speechSynthesis.speaking) {
      // iOS ignore une phrase vide : il faut une vraie phrase, quasi muette
      const u = new SpeechSynthesisUtterance('bonjour');
      u.volume = 0.01;
      speechSynthesis.speak(u);
    }
  } catch (e) { /* pas de son disponible */ }
  const c = SFX.ctx();
  if (!c || c.state === 'running') {
    ['touchend', 'pointerup', 'keydown'].forEach((t) => removeEventListener(t, unlockAudio, true));
  }
}
['touchend', 'pointerup', 'keydown'].forEach((t) => addEventListener(t, unlockAudio, true));

// ================= Voix (synthèse vocale du navigateur) =================
function canSpeak() {
  return S.voice && 'speechSynthesis' in window;
}

function speak(text, { queue = false, rate = 0.9, force = false } = {}) {
  if (!force && !canSpeak()) return null;
  if (!('speechSynthesis' in window)) return null;
  try {
    // Safari (iPhone) perd parfois la phrase si on annule pour rien juste avant
    const busy = speechSynthesis.speaking || speechSynthesis.pending;
    if (!queue && busy) speechSynthesis.cancel();
    let clean = text.replace(/[^\p{L}\p{N}\s.,!?'’:-]/gu, '').trim();
    if (S.name && S.nameSay) clean = clean.replace(new RegExp(`(^|[^\\p{L}])${S.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'giu'), `$1${S.nameSay}`);
    if (!clean) return null;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'fr-FR';
    const { voice } = curProf();
    u.rate = rate * voice.rate;
    u.pitch = voice.pitch;
    const v = voiceFor(S.prof);
    if (v) u.voice = v;
    speechSynthesis.speak(u);
    return u;
  } catch (e) { return null; /* pas de voix disponible */ }
}

// Voix françaises triées de la plus naturelle à la moins naturelle
const FUNNY_VOICES = /Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Jacques|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Zarvox|Trinoids|Whisper|Organ|Superstar|Jester|Junior|Ralph|Kathy|Fred/i;
function voiceScore(v) {
  let n = 0;
  if (/natural|neural|premium|online/i.test(v.name)) n += 50;
  if (/enhanced|amélioré/i.test(v.name)) n += 35;
  if (/google/i.test(v.name)) n += 30;
  if (/Audrey|Thomas|Marie|Denise|Henri|Vivienne|Eloise|Céline/i.test(v.name)) n += 15;
  if (v.lang.toLowerCase() === 'fr-fr') n += 20;
  if (FUNNY_VOICES.test(v.name)) n -= 60;
  return n;
}
function frenchVoices() {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices()
    .filter((v) => v.lang && v.lang.toLowerCase().startsWith('fr'))
    .sort((a, b) => voiceScore(b) - voiceScore(a));
}
// Voix d'un professeur : celle choisie par le parent, sinon la première de ses préférences
function voiceFor(id) {
  const voices = frenchVoices();
  const prefer = (PROFS[id] || PROFS.bulle).voice.prefer;
  const rank = (v) => {
    const i = prefer.findIndex((name) => v.name.toLowerCase().includes(name.toLowerCase()));
    return voiceScore(v) + (i < 0 ? 0 : 1000 - i * 100);
  };
  return voices.find((v) => v.name === S.profVoices[id])
    || voices.slice().sort((a, b) => rank(b) - rank(a))[0] || null;
}
if ('speechSynthesis' in window) speechSynthesis.getVoices();

// ================= Confettis =================
const Confetti = (() => {
  const cv = document.getElementById('confetti');
  const ctx = cv.getContext('2d');
  const colors = ['#ff5d8f', '#ffd23f', '#3bceac', '#5aa9e6', '#a06cd5', '#ff8c42'];
  let parts = [];
  let running = false;
  function resize() {
    const r = window.devicePixelRatio || 1;
    cv.width = innerWidth * r;
    cv.height = innerHeight * r;
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }
  addEventListener('resize', resize);
  resize();
  function add(p) {
    parts.push(Object.assign({ r: 4 + Math.random() * 5, c: pick(colors), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, life: 1, sq: Math.random() < 0.5 }, p));
    if (!running) { running = true; requestAnimationFrame(loop); }
  }
  function burst(x = innerWidth / 2, y = innerHeight / 2, n = 80) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * 9;
      add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6 });
    }
  }
  function rain(n = 160) {
    for (let i = 0; i < n; i++) {
      add({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.6, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3 });
    }
  }
  function loop() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.22; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.006;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      if (p.sq) ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      else { ctx.beginPath(); ctx.arc(0, 0, p.r / 1.4, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
    if (parts.length) requestAnimationFrame(loop);
    else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  return { burst, rain };
})();

// ================= Thème du monde =================
function setTheme(w) {
  const st = document.body.style;
  st.setProperty('--bg1', w ? w.c1 : '#5b3cc4');
  st.setProperty('--bg2', w ? w.c2 : '#ff7eb3');
  st.setProperty('--accent', w ? w.accent : '#ffd23f');
  const items = w ? w.decor : ['⛵', '🏝️', '🐠', '⭐', '🐚', '🧭', '🌊'];
  document.getElementById('decor').innerHTML = Array.from({ length: 14 }, (_, i) =>
    `<span style="left:${rand(0, 94)}%;top:${rand(0, 90)}%;--s:${rand(28, 64)}px;--t:${rand(5, 11)}s;animation-delay:-${rand(0, 8)}s">${items[i % items.length]}</span>`
  ).join('');
}

// ================= Générateurs d'exercices =================
function makeSentence(level) {
  const n = level === 'CE1' ? pick([1, 1, 2, 3]) : 1;
  const s = pick(SUBJECTS);
  const a = pick(ACTIONS);
  const text = n === 1 ? `${cap(s.sg)} ${a.sg}.` : `${cap(NUM_WORDS[n])} ${s.pl} ${a.pl}.`;
  const distractors = [
    { s: pick(SUBJECTS.filter((x) => x !== s)), a, n },
    { s, a: pick(ACTIONS.filter((x) => x !== a)), n },
  ];
  if (level === 'CE1') distractors.push({ s, a, n: pick([1, 2, 3].filter((x) => x !== n)) });
  return { text, correct: { s, a, n }, distractors };
}

function sceneHTML(o, cls = '') {
  return `<div class="scene ${cls}"><span class="who">${o.s.e.repeat(o.n)}</span><span class="what">${o.a.e}</span></div>`;
}

// Choix proches du bon nombre (inversion dizaines/unités, ±1, ±10...)
function numberOptions(n, count, min = 10, max = 99) {
  const d = Math.floor(n / 10);
  const u = n % 10;
  const cands = [];
  if (u !== d && u > 0) cands.push(u * 10 + d);
  cands.push(...shuffle([n + 10, n - 10, n + 1, n - 1, n + 2, n - 2]));
  const opts = [n];
  for (const x of cands) {
    if (opts.length >= count) break;
    if (x >= min && x <= max && !opts.includes(x)) opts.push(x);
  }
  while (opts.length < count) {
    const x = rand(min, max);
    if (!opts.includes(x)) opts.push(x);
  }
  return shuffle(opts);
}

function blocksHTML(n, cls = '') {
  const d = Math.floor(n / 10);
  const u = n % 10;
  const tens = Array.from({ length: d }, () => `<span class="ten">${'<i></i>'.repeat(10)}</span>`).join('');
  return `<div class="blocks ${cls}" style="--t:${d}"><div class="tens">${tens}</div><div class="units">${'<i class="unit"></i>'.repeat(u)}</div></div>`;
}

function duText(n) {
  const d = Math.floor(n / 10);
  const u = n % 10;
  return `${plural(d, 'dizaine')} et ${plural(u, 'unité')}`;
}

// ================= Centaines =================
const cdu = (n) => ({ c: Math.floor(n / 100), d: Math.floor(n / 10) % 10, u: n % 10 });

function cduText(n, order = ['c', 'd', 'u']) {
  const p = cdu(n);
  const names = { c: 'centaine', d: 'dizaine', u: 'unité' };
  const parts = order.map((k) => plural(p[k], names[k]));
  return `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
}

// Un nombre en lettres (orthographe traditionnelle : « deux cent soixante-cinq »)
const UNIT_WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const TEN_WORDS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
function below100Words(n) {
  if (n <= 16) return UNIT_WORDS[n];
  if (n < 20) return `dix-${UNIT_WORDS[n - 10]}`;
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7) return n === 71 ? 'soixante et onze' : `soixante-${below100Words(n - 60)}`;
  if (t === 8) return u ? `quatre-vingt-${UNIT_WORDS[u]}` : 'quatre-vingts';
  if (t === 9) return `quatre-vingt-${below100Words(n - 80)}`;
  if (!u) return TEN_WORDS[t];
  return u === 1 ? `${TEN_WORDS[t]} et un` : `${TEN_WORDS[t]}-${UNIT_WORDS[u]}`;
}
// renvoie [partie centaines, reste] pour pouvoir les colorier
function numberWordParts(n) {
  const c = Math.floor(n / 100);
  const r = n % 100;
  if (!c) return ['', below100Words(r)];
  const head = c === 1 ? 'cent' : `${UNIT_WORDS[c]} cent${r ? '' : 's'}`;
  return [head, r ? below100Words(r) : ''];
}
const numberWords = (n) => numberWordParts(n).filter(Boolean).join(' ');
const wordsSplitHTML = (n) => numberWordParts(n).map((p, i) => (p ? `<mark class="${i ? 'w-r' : 'w-c'}">${p}</mark>` : '')).filter(Boolean).join(' ');

const HUNDRED = '<span class="hundred"></span>';
const TEN = `<span class="ten">${'<i></i>'.repeat(10)}</span>`;
const UNIT = '<i class="unit"></i>';
// plaques de 100, barres de 10, cubes de 1
function hBlocksHTML(n, cls = '') {
  const { c, d, u } = cdu(n);
  return `<div class="blocks hblocks ${cls}"><div class="hundreds">${HUNDRED.repeat(c)}</div><div class="tens">${TEN.repeat(d)}</div><div class="units">${UNIT.repeat(u)}</div></div>`;
}

// Le tableau C | D | U
function cduTableHTML(n, cls = '') {
  const { c, d, u } = cdu(n);
  return `<div class="cdu ${cls}"><span class="c"><small>C</small><b>${c}</b></span><span class="d"><small>D</small><b>${d}</b></span><span class="u"><small>U</small><b>${u}</b></span></div>`;
}
const digits3HTML = (n) => { const { c, d, u } = cdu(n); return `<b class="ex-c">${c}</b><b class="ex-d">${d}</b><b class="ex-u">${u}</b>`; };

// Nombres « pièges » proches : chiffres échangés, zéro oublié, ±100, ±10…
function hundredOptions(n, count, join = false) {
  const { c, d, u } = cdu(n);
  const cands = [];
  if (join && n % 100 > 9 && Math.random() < 0.6) cands.push(Number(`${c * 100}${n % 100}`)); // « 200 » + « 65 » = 20065
  const near = [];
  if (d !== u) near.push(c * 100 + u * 10 + d);
  if (d && d !== c) near.push(d * 100 + c * 10 + u);
  if (d) near.push(c * 100 + u);
  else near.push(c * 100 + u * 10);
  near.push(n + 100, n - 100, n + 10, n - 10, n + 1);
  cands.push(...shuffle(near));
  const opts = [n];
  for (const x of cands) {
    if (opts.length >= count) break;
    if ((x >= 100 && x <= 999) || x > 9999) { if (!opts.includes(x)) opts.push(x); }
  }
  while (opts.length < count) {
    const x = rand(100, 999);
    if (!opts.includes(x)) opts.push(x);
  }
  return shuffle(opts);
}

// Un nombre à 3 chiffres expliqué : chiffres en couleur, blocs et texte
function numberCard3HTML(n, label) {
  return `<div class="ex-num"><small>${label}</small><div class="ex-digits">${digits3HTML(n)}</div>
    <div class="ex-blocks">${hBlocksHTML(n, 'tiny')}</div>
    <span>${cduText(n)}</span></div>`;
}

function explainNumber3(n, wrong) {
  const N = cdu(n);
  if (wrong > 999) {
    const r = n % 100;
    return {
      show: `${n} s’écrit avec 3 chiffres seulement ! ☝️`,
      html: `<div class="ex-pair">${numberCard3HTML(n, 'Le bon nombre ✅')}
        <div class="ex-num"><small>Ton choix ❌</small><div class="ex-digits">${wrong}</div><span>trop de chiffres !</span></div></div>
        <p class="ex-note">On ne colle pas ${N.c * 100} et ${r} ! ${cduText(n)} : chaque chiffre a <b>une seule</b> case.</p>`,
      say: `${n} s'écrit avec trois chiffres seulement. On ne colle pas ${N.c * 100} et ${r}. ${n}, c'est ${cduText(n)}.`,
    };
  }
  const W = cdu(wrong);
  const mixed = [N.c, N.d, N.u].sort().join() === [W.c, W.d, W.u].sort().join();
  const where = 'À gauche les centaines, au milieu les dizaines, à droite les unités.';
  return {
    show: mixed ? 'Attention, tu as mélangé l’ordre des chiffres ! 🔄' : `${n}, c’est ${cduText(n)} 👇`,
    html: `<div class="ex-pair">${numberCard3HTML(n, 'Le bon nombre ✅')}${numberCard3HTML(wrong, 'Ton choix ❌')}</div>
      <p class="ex-note">${where}</p>`,
    say: `${mixed ? 'Attention, tu as mélangé l’ordre des chiffres. ' : ''}${n}, c'est ${cduText(n)}. ${where} Toi, tu as choisi ${wrong}, c'est ${cduText(wrong)}.`,
  };
}

// « deux cent » → 2 centaines, « soixante-cinq » → 65
function wordsHint(n) {
  const [head, rest] = numberWordParts(n);
  const { c } = cdu(n);
  const r = n % 100;
  const show = [head && `« ${head} » → ${plural(c, 'centaine')}`, rest && `« ${rest} » → ${r}`].filter(Boolean).join(' ; ');
  const say = [head && `${head}, ça fait ${plural(c, 'centaine')}`, rest && `${rest}, c'est ${r}`].filter(Boolean).join('. ');
  return { show: `${show} 👇`, say: `${say}. ${r ? '' : 'Pas de dizaines ni d’unités : on écrit des zéros.'}`, html: `<div class="ex-line">${wordsSplitHTML(n)}</div>${cduTableHTML(n)}` };
}

// Tirer un nombre entre 101 et 999, avec parfois un zéro au milieu ou à la fin
function pickHundred() {
  const k = Math.random();
  const c = rand(1, 9);
  if (k < 0.15) return c * 100 + rand(1, 9); // 305
  if (k < 0.25) return c * 100 + rand(1, 9) * 10; // 340
  return c * 100 + rand(11, 99);
}

// La cale : on charge des cubes, des barres de 10 (et des plaques de 100 pour les grands nombres)
function renderVault(body, q, api) {
  const big = q.n >= 100;
  let c = 0;
  let d = 0;
  let u = 0;
  let solved = false;
  const el = h(`<div class="vault">
    <div class="big-number">🎯 ${q.n}</div>
    <div class="vault-box"><div class="blocks ${big ? 'hblocks vh' : 'large'}">${big ? '<div class="hundreds"></div>' : ''}<div class="tens"></div><div class="units"></div></div></div>
    <div class="du ${big ? 'three' : ''}">
      ${big ? '<div class="du-col c"><span>centaines</span><b class="ccount">0</b></div>' : ''}
      <div class="du-col d"><span>dizaines</span><b class="dcount">0</b></div>
      <div class="du-col u"><span>unités</span><b class="ucount">0</b></div>
    </div>
    <div class="vault-btns">
      ${big ? `<button class="btn add-hundred"><span class="blocks mini">${HUNDRED}</span> + 100</button>` : ''}
      <button class="btn add-ten"><span class="blocks mini">${TEN}</span> + 10</button>
      <button class="btn add-unit"><span class="blocks mini">${UNIT}</span> + 1</button>
    </div>
    <div class="vault-btns">
      <button class="btn ghost reset">↺ Vider</button>
      <button class="btn go check">Lever l’ancre ⚓</button>
    </div>
    <p class="vault-tip">Touche un bloc dans la cale pour l’enlever.</p>
  </div>`);
  const box = el.querySelector('.vault-box');
  const hundredsEl = el.querySelector('.vault-box .hundreds');
  const tensEl = el.querySelector('.vault-box .tens');
  const unitsEl = el.querySelector('.vault-box .units');
  function draw(anim) {
    if (hundredsEl) hundredsEl.innerHTML = HUNDRED.repeat(c);
    tensEl.innerHTML = TEN.repeat(d);
    unitsEl.innerHTML = UNIT.repeat(u);
    if (big) el.querySelector('.ccount').textContent = c;
    el.querySelector('.dcount').textContent = d;
    el.querySelector('.ucount').textContent = u;
    const last = { hundred: hundredsEl, ten: tensEl, unit: unitsEl, merge: tensEl, merge100: hundredsEl }[anim];
    if (last && last.lastElementChild) last.lastElementChild.classList.add(anim.startsWith('merge') ? 'flash' : 'drop');
  }
  if (hundredsEl) hundredsEl.addEventListener('click', (e) => { if (!solved && e.target.closest('.hundred')) { c--; SFX.click(); draw(); } });
  tensEl.addEventListener('click', (e) => { if (!solved && e.target.closest('.ten')) { d--; SFX.click(); draw(); } });
  unitsEl.addEventListener('click', (e) => { if (!solved && e.target.closest('.unit')) { u--; SFX.click(); draw(); } });
  const full = () => api.say('La cale est pleine !');
  // 10 dizaines se collent en 1 centaine
  function addTen(fromUnits) {
    if (d < 9) { d++; return fromUnits ? 'merge' : 'ten'; }
    if (!big || c >= 9) return null;
    d = 0; c++;
    return 'merge100';
  }
  if (big) {
    el.querySelector('.add-hundred').addEventListener('click', () => {
      if (solved) return;
      if (c >= 9) { full(); return; }
      c++; SFX.pop(); draw('hundred');
    });
  }
  el.querySelector('.add-ten').addEventListener('click', () => {
    if (solved) return;
    if (d >= 9 && !big) { api.say('La cale est pleine de dizaines !'); return; }
    const a = addTen(false);
    if (!a) { full(); return; }
    if (a === 'merge100') {
      SFX.magic(); draw(a);
      api.say('✨ 10 dizaines = 1 centaine ! Elles se sont collées en une plaque !');
      speak('Dix dizaines, ça fait une centaine !');
      return;
    }
    SFX.pop(); draw(a);
  });
  el.querySelector('.add-unit').addEventListener('click', () => {
    if (solved) return;
    if (u < 9) { u++; SFX.pop(); draw('unit'); return; }
    const prev = [c, d];
    const a = addTen(true);
    if (!a) { [c, d] = prev; full(); return; }
    u = 0; SFX.magic(); draw(a);
    if (a === 'merge100') {
      api.say('✨ 10 unités = 1 dizaine… et 10 dizaines = 1 centaine !');
      speak('Dix unités font une dizaine, et dix dizaines font une centaine !');
    } else {
      api.say('✨ 10 unités = 1 dizaine ! Elles se sont collées !');
      speak('Dix unités, ça fait une dizaine !');
    }
  });
  el.querySelector('.reset').addEventListener('click', () => { if (!solved) { c = 0; d = 0; u = 0; SFX.click(); draw(); } });
  el.querySelector('.check').addEventListener('click', () => {
    if (solved) return;
    const got = c * 100 + d * 10 + u;
    if (got === q.n) {
      solved = true;
      box.classList.add('open');
      SFX.unlock();
      setTimeout(() => api.success(), 500);
    } else {
      restart(box, 'shake');
      const what = big ? 'des blocs' : 'des cubes';
      api.fail(`Tu as chargé ${got}. Il en faut ${q.n} ! ${got < q.n ? 'Ajoute' : 'Enlève'} ${what}.`, { c, d, u });
    }
  });
  body.append(el);
}

// ================= Le bateau =================
const boatEl = () => document.getElementById('boat');

function placeBoat(x, bottom, dur = 0, scale = 1) {
  const el = boatEl();
  el.style.transition = dur
    ? `left ${dur}s ease-in-out, bottom ${dur}s ease-in-out, transform ${dur}s ease-in-out, opacity .4s`
    : 'opacity .4s';
  el.style.left = `${x}px`;
  el.style.bottom = `${bottom}px`;
  el.style.setProperty('--scale', scale);
}

function boatHome() {
  return { x: innerWidth / 2 - boatEl().offsetWidth / 2, b: Math.max(6, innerHeight * 0.015) };
}

async function sailTo(x, b, scale = 1) {
  const el = boatEl();
  const r = el.getBoundingClientRect();
  const dist = Math.hypot(x - r.left, b - (innerHeight - r.bottom));
  const dur = Math.min(2, Math.max(0.7, dist / 300));
  const deltaBottom = b - (innerHeight - r.bottom);
  el.style.setProperty('--trail-angle', `${Math.atan2(x - r.left, deltaBottom) * 180 / Math.PI}deg`);
  el.style.setProperty('--tilt', `${x > r.left + 4 ? 7 : x < r.left - 4 ? -7 : 0}deg`);
  el.classList.add('sailing');
  placeBoat(x, b, dur, scale);
  await sleep(dur * 1000);
  el.classList.remove('sailing');
}

// Navigue vers une île (frac < 1 : s'arrête en chemin)
async function sailToIsland(isle, frac = 1) {
  const el = boatEl();
  if (!el || !isle.isConnected) return;
  const shore = isle.querySelector('.isle-land') || isle;
  let r = shore.getBoundingClientRect();
  const topbar = document.querySelector('.topbar');
  const safeTop = (topbar ? topbar.getBoundingClientRect().bottom : 0) + 20;
  const safeBottom = Math.max(32, el.offsetHeight * 0.25);
  if (r.top < safeTop || r.bottom > innerHeight - safeBottom) {
    isle.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    await new Promise(requestAnimationFrame);
    if (!el.isConnected || !isle.isConnected) return;
    r = shore.getBoundingClientRect();
  }
  const bw = el.offsetWidth;
  const tx = r.left + r.width / 2 - bw / 2;
  const tb = innerHeight - r.bottom - el.offsetHeight * 0.22;
  const cur = el.getBoundingClientRect();
  const cx = cur.left;
  const cb = innerHeight - cur.bottom;
  await sailTo(cx + (tx - cx) * frac, cb + (tb - cb) * frac, 1 - 0.25 * frac);
}

async function sailHome() {
  const p = boatHome();
  await sailTo(p.x, p.b, 1);
  if (boatEl()) boatEl().classList.remove('answer-voyage');
}

function boatMood(mood) {
  const el = boatEl();
  if (!el) return;
  el.classList.remove('happy', 'oops');
  void el.offsetWidth;
  el.classList.add(mood);
  setTimeout(() => el.classList.remove(mood), 1300);
}

// Îles cliquables : une seule est la bonne
function islandsRow(count) {
  const land = LANDS[RUN.zone.land];
  return h(`<div class="islands n${count}" style="--g1:${land.g1};--g2:${land.g2};--top:${land.top}"></div>`);
}

function islandEl(html, i) {
  return h(`<button class="island" style="--i:${i}" aria-label="Île ${i + 1}">
    <span class="isle-sign"><span class="isle-card">${html}</span><span class="isle-post"></span></span>
    <span class="isle-land"><img class="answer-island-art" src="assets/marine/${RUN.w.id}.webp" alt="" aria-hidden="true" draggable="false"></span>
  </button>`);
}

function buildIslands(container, items, api, onWin) {
  const row = islandsRow(items.length);
  const run = RUN;
  let done = false;
  let busy = false;
  items.forEach((it, i) => {
    const isle = islandEl(it.html, i);
    isle.addEventListener('click', async () => {
      if (done || busy || isle.classList.contains('rocky') || !stillHere(run)) return;
      busy = true;
      row.classList.add('navigating');
      row.setAttribute('aria-busy', 'true');
      isle.classList.add('sailing-to');
      const status = document.getElementById('sailing-status');
      if (status) status.textContent = `Le bateau navigue vers l’île ${i + 1}.`;
      try {
        if (it.correct) {
          done = true;
          row.classList.add('resolved');
          isle.classList.add('chosen');
          await sailToIsland(isle, 1);
          if (!stillHere(run)) return;
          isle.classList.add('won');
          SFX.unlock();
          if (onWin) onWin();
          await sleep(400);
          if (!stillHere(run)) return;
          api.success();
        } else {
          await sailToIsland(isle, 0.55);
          if (!stillHere(run)) return;
          restart(boatEl(), 'bonk');
          isle.classList.add('rocky');
          api.fail(undefined, it.value);
          await sleep(450);
          if (!stillHere(run)) return;
          await sailHome();
        }
      } finally {
        busy = false;
        isle.classList.remove('sailing-to');
        row.classList.remove('navigating');
        row.removeAttribute('aria-busy');
      }
    });
    row.append(isle);
  });
  container.append(row);
}

// ================= Singulier / pluriel =================
// Un groupe découpé en morceaux : { t: texte, clue: indice ?, glue: collé au morceau précédent }
const SG_DETS = { m: ['un', 'le'], f: ['une', 'la'] };
const PL_DETS = ['des', 'les', 'des', 'les', 'deux', 'trois'];

function pluralPieces(word) {
  const end = word.endsWith('x') ? 'x' : 's';
  return [{ t: word.slice(0, -1) }, { t: end, clue: true, glue: true, kind: 'fin' }];
}

// Les deux formes d'un même groupe : { sg: morceaux au singulier, pl: morceaux au pluriel }
function makePair(withVerb) {
  // un nom (« une banane », « des vaches »)
  if (!withVerb) {
    if (Math.random() < 0.6) {
      const n = pick(NOUNS.filter((x) => x.sg !== x.pl));
      return {
        sg: [{ t: pick(SG_DETS[n.g]), clue: true, kind: 'det' }, { t: n.sg }],
        pl: [{ t: pick(PL_DETS), clue: true, kind: 'det' }, ...pluralPieces(n.pl)],
      };
    }
    const s = pick(SUBJECTS.filter((x) => !x.sg.includes('’') && !x.sg.endsWith(x.pl)));
    const [det, noun] = s.sg.split(' ');
    return {
      sg: [{ t: det, clue: true, kind: 'det' }, { t: noun }],
      pl: [{ t: pick(PL_DETS), clue: true, kind: 'det' }, ...pluralPieces(s.pl)],
    };
  }
  // une petite phrase avec un verbe en -er (« Les lapins mangent une carotte. »)
  const s = pick(SUBJECTS.filter((x) => !x.sg.includes('’') && !x.sg.endsWith(x.pl)));
  const a = pick(ACTIONS.filter((x) => x.pl.split(' ')[0] === `${x.sg.split(' ')[0]}nt`));
  const [det, noun] = s.sg.split(' ');
  const verb = a.sg.split(' ')[0];
  const rest = { t: `${a.sg.slice(verb.length + 1)}.` };
  return {
    sg: [{ t: cap(det), clue: true, kind: 'det' }, { t: noun }, { t: verb }, rest],
    pl: [{ t: cap(pick(['les', 'les', 'deux', 'trois'])), clue: true, kind: 'det' }, ...pluralPieces(s.pl), { t: verb }, { t: 'nt', clue: true, glue: true, kind: 'verbe' }, rest],
  };
}

function makeGroup(plural, withVerb) {
  const pair = makePair(withVerb);
  return { plural, pieces: plural ? pair.pl : pair.sg, other: plural ? pair.sg : pair.pl };
}

const groupText = (g) => g.pieces.reduce((acc, p, i) => acc + (i && !p.glue ? ' ' : '') + p.t, '');

// La petite règle qui résume les indices trouvés
function clueRule(g) {
  const det = g.pieces.find((p) => p.kind === 'det').t.toLowerCase();
  if (!g.plural) return `« ${det} » → il n’y en a qu’un. Et pas de s à la fin${g.pieces.length > 2 ? ', ni de « nt » au verbe' : ''} !`;
  const fin = g.pieces.find((p) => p.kind === 'fin').t;
  const verbe = g.pieces.some((p) => p.kind === 'verbe');
  return `Les indices du pluriel : « ${det} » + le « ${fin} » à la fin${verbe ? ' + « nt » au verbe' : ''} !`;
}

// ================= Explications après une erreur =================
const digits = (n) => ({ d: Math.floor(n / 10), u: n % 10 });
const digitsHTML = (n) => { const { d, u } = digits(n); return `${d ? `<b class="ex-d">${d}</b>` : ''}<b class="ex-u">${u}</b>`; };

// Un nombre : ses chiffres en couleur, ses blocs, et « D dizaines et U unités »
function numberCardHTML(n, label) {
  const { d, u } = digits(n);
  return `<div class="ex-num"><small>${label}</small><div class="ex-digits">${digitsHTML(n)}</div>
    <div class="ex-blocks">${blocksHTML(n)}</div>
    <span><b class="ex-d">${plural(d, 'dizaine')}</b> et <b class="ex-u">${plural(u, 'unité')}</b></span></div>`;
}

// Comparer le bon nombre et celui choisi (dizaines / unités)
function explainNumber(n, wrong) {
  const N = digits(n);
  const W = digits(wrong);
  const swapped = W.d === N.u && W.u === N.d;
  const where = `Le chiffre de gauche, ce sont les dizaines : ${plural(N.d, 'barre')} de dix. Le chiffre de droite, ce sont les unités : ${plural(N.u, 'cube')}.`;
  return {
    show: swapped ? 'Attention, tu as inversé les dizaines et les unités ! 🔄' : `${n}, c’est ${duText(n)} 👇`,
    html: `<div class="ex-pair">${numberCardHTML(n, 'Le bon nombre ✅')}${numberCardHTML(wrong, 'Ton choix ❌')}</div>
      <p class="ex-note">${where}</p>`,
    say: `${swapped ? 'Attention, tu as inversé les dizaines et les unités. ' : ''}${n}, c'est ${duText(n)}. ${where} Toi, tu as choisi ${wrong}, c'est ${duText(wrong)}.`,
  };
}

// Mettre en couleur les lettres qui changent entre deux mots
function diffParts(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  let j = 0;
  while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
  return [a.slice(0, i), a.slice(i, a.length - j), a.slice(a.length - j)];
}
const markDiff = (a, b, cls) => { const [p, m, e] = diffParts(a, b); return `${esc(p)}${m ? `<mark class="${cls}">${esc(m)}</mark>` : ''}${esc(e)}`; };

function explainWord(right, wrong, fmt = (w) => w) {
  return {
    show: 'Les deux mots se ressemblent… regarde les lettres en couleur 👀',
    html: `<div class="ex-pair">
      <div class="ex-word"><small>Ton choix ❌</small><span>${markDiff(fmt(wrong), fmt(right), 'bad')}</span></div>
      <div class="ex-word"><small>Le bon mot ✅</small><span>${markDiff(fmt(right), fmt(wrong), 'good')}</span></div>
    </div>`,
    say: `Tu as choisi ${wrong}. Le bon mot, c'est ${right}. Les deux se ressemblent, mais regarde bien les lettres en couleur : elles changent tout !`,
  };
}

// Une phrase en morceaux, avec les indices singulier / pluriel en couleur
const piecesHTML = (pieces) => pieces.reduce((acc, p, i) => acc + (i && !p.glue ? ' ' : '')
  + (p.clue ? `<mark class="k-${p.kind}">${esc(p.t)}</mark>` : esc(p.t)), '');

// ================= Types d'étapes =================
const ROOM_TYPES = {
  // 📖 Lire une phrase et trouver l'île qui l'illustre
  phrase: {
    subject: 'lecture',
    make: (level) => makeSentence(level),
    instruction: () => 'Lis la phrase, puis navigue vers l’île qui montre la même chose !',
    hint: (q) => ({ show: 'Écoute bien la phrase 👂', say: q.text }),
    explain(q, o) {
      const { s: who, a, n } = q.correct;
      const subj = (x, k) => (k === 1 ? x.sg : `${NUM_WORDS[k]} ${x.pl}`);
      const count = (k) => (k === 1 ? 'un seul' : NUM_WORDS[k]);
      let part; let say;
      if (o.s !== who) {
        part = 's';
        say = `La phrase parle de ${subj(who, n)}. Sur ton île, c'est ${subj(o.s, n)}.`;
      } else if (o.a !== a) {
        part = 'a';
        say = `La phrase dit : ${n === 1 ? a.sg : a.pl}. Sur ton île, ce n'est pas ça !`;
      } else {
        part = 'n';
        say = `Dans la phrase, il y en a ${count(n)}. Sur ton île, il y en a ${count(o.n)}.`;
      }
      const [, art, noun] = who.sg.match(/^(l’|le |la )(.*)$/);
      const words = n === 1 ? { n: cap(art.trim()), s: noun, a: a.sg } : { n: cap(NUM_WORDS[n]), s: who.pl, a: a.pl };
      const mk = (k) => (k === part ? `<mark class="good">${words[k]}</mark>` : words[k]);
      return {
        show: 'Relis bien le morceau en couleur 👇',
        html: `<div class="sentence ex-sentence">${mk('n')}${words.n.endsWith('’') ? '' : ' '}${mk('s')} ${mk('a')}.</div>
          <div class="ex-pair"><div class="ex-word"><small>La phrase ✅</small>${sceneHTML(q.correct)}</div><div class="ex-word"><small>Ton île ❌</small>${sceneHTML(o)}</div></div>`,
        say,
      };
    },
    render(body, q, api) {
      body.append(h(`<div class="sentence">${q.text}</div>`));
      const items = shuffle([{ ...q.correct, ok: true }, ...q.distractors]).map((o) => ({ correct: !!o.ok, html: sceneHTML(o), value: o }));
      buildIslands(body, items, api);
    },
  },

  // 📖 Lire des mots qui se ressemblent et trouver le bon
  mot: {
    subject: 'lecture',
    make() {
      const w = pick(WORDS);
      return { e: w[0], answer: w[1], options: shuffle(w.slice(1)) };
    },
    instruction: () => 'Regarde l’image. Sur quelle île est écrit le bon mot ?',
    hint: (q) => ({ show: 'Écoute le mot 👂', say: q.answer }),
    explain: (q, w) => explainWord(q.answer, w),
    render(body, q, api) {
      body.append(h(`<div class="big-emoji">${q.e}</div>`));
      buildIslands(body, q.options.map((o) => ({ correct: o === q.answer, value: o, html: `<div class="word" style="--len:${o.length}">${o}</div>` })), api);
    },
  },

  // 📖 Repêcher les mots d'une phrase dans l'ordre
  ordreMots: {
    subject: 'lecture',
    make(level) {
      const q = makeSentence(level);
      q.words = q.text.split(' ');
      return q;
    },
    instruction: () => 'Repêche les mots dans l’ordre pour écrire la phrase de l’image !',
    hint: (q) => ({ show: 'Écoute la phrase 👂 Le premier mot a une majuscule !', say: q.text }),
    explain(q, { w, pos }) {
      const next = q.words[pos];
      const rule = pos === 0
        ? `Une phrase commence toujours par une majuscule. Le premier mot, c'est ${next}.`
        : `Après ${q.words[pos - 1].replace('.', '')}, le mot qui suit, c'est ${next.replace('.', '')}.${next.endsWith('.') ? ' Il a le point : c’est la fin de la phrase !' : ''}`;
      return {
        show: 'Regarde quel mot vient ensuite 👇',
        html: `<div class="sentence ex-sentence">${q.words.slice(0, pos).map(esc).join(' ')} <mark class="good">${esc(next)}</mark> <span class="ex-rest">…</span></div>
          <p class="ex-note">« ${esc(w)} » vient plus tard dans la phrase.</p>`,
        say: `${rule} Le mot ${w.replace('.', '')} vient plus tard.`,
      };
    },
    render(body, q, api) {
      body.append(h(sceneHTML(q.correct, 'big')));
      const slots = h(`<div class="slots">${q.words.map(() => '<span class="slot"></span>').join('')}</div>`);
      const pool = h('<div class="pool"></div>');
      let order;
      do { order = shuffle(q.words); } while (order.join(' ') === q.words.join(' '));
      let pos = 0;
      order.forEach((w, i) => {
        const b = h(`<button class="tile" style="--i:${i}">${w}</button>`);
        b.addEventListener('click', () => {
          if (pos >= q.words.length) return;
          if (q.words[pos] === w) {
            const slot = slots.children[pos];
            slot.textContent = w;
            slot.classList.add('filled');
            b.classList.add('used');
            b.disabled = true;
            SFX.pop();
            pos++;
            if (pos === q.words.length) {
              slots.classList.add('complete');
              setTimeout(() => api.success(), 450);
            }
          } else {
            restart(b, 'shake');
            api.fail(undefined, { w, pos });
          }
        });
        pool.append(b);
      });
      body.append(slots, pool);
    },
  },

  // 📖 CE1 : singulier ou pluriel ? puis trouver les indices qui le montrent
  indices: {
    subject: 'lecture',
    make() {
      const plurals = shuffle([true, false, Math.random() < 0.6]);
      return { phase: 'choix', items: plurals.map((p, i) => makeGroup(p, i === 2 && Math.random() < 0.6)) };
    },
    instruction: () => 'Singulier ou pluriel ? Lis bien, puis choisis l’île !',
    hint: (q) => (q.phase === 'choix'
      ? { show: 'Regarde le petit mot devant et la fin des mots 👀', say: 'Regarde le petit mot devant, et la fin des mots.' }
      : { show: 'Les indices : le petit mot devant (le, la, un, les, des…) et les lettres à la fin (s, x, nt).', say: 'Les indices, ce sont le petit mot devant, et les lettres à la fin : s, x, ou n t.' }),
    explain(q, { g, piece }) {
      const sg = g.plural ? g.other : g.pieces;
      const pl = g.plural ? g.pieces : g.other;
      const det = g.pieces.find((p) => p.kind === 'det').t.toLowerCase();
      const fin = pl.find((p) => p.kind === 'fin').t;
      const verbe = pl.some((p) => p.kind === 'verbe');
      const ends = `Au pluriel, le nom prend un ${fin} à la fin${verbe ? ', et le verbe prend n t' : ''}.`;
      const say = piece
        ? `${piece.t}, c'est pareil au singulier et au pluriel : ce n'est pas un indice. Les indices, ce sont les morceaux qui changent. ${ends}`
        : `${det}, c'est un petit mot du ${g.plural ? 'pluriel : il y en a plusieurs' : 'singulier : il n’y en a qu’un'}. ${ends}`;
      return {
        show: piece ? 'Les indices, ce sont les morceaux qui changent 👇' : `« ${det} » → ${g.plural ? 'pluriel, il y en a plusieurs' : 'singulier, il n’y en a qu’un'} 👇`,
        html: `<div class="ex-compare">
            <div class="ex-form ${g.plural ? '' : 'cur'}"><small>🐟 un seul = <b>singulier</b></small><p>${piecesHTML(sg)}</p></div>
            <div class="ex-form ${g.plural ? 'cur' : ''}"><small>🐟🐟🐟 plusieurs = <b>pluriel</b></small><p>${piecesHTML(pl)}</p></div>
          </div>
          <div class="ex-dets">
            <div><b>Singulier</b><span>le · la · l’ · un · une · mon · ton · son · ma · ta · sa</span></div>
            <div><b>Pluriel</b><span>les · des · mes · tes · ses · deux · trois</span></div>
          </div>
          <p class="ex-note">${ends.replace('n t', '« nt »')}</p>`,
        say,
      };
    },
    render(body, q, api) {
      let idx = 0;
      let busy = false;
      const run = RUN;
      const card = h('<div class="clue-card"><span class="tri-count"></span><div class="sentence clue-text"></div><div class="clue-tap hidden"></div><div class="clue-rule hidden"></div></div>');
      const text = card.querySelector('.clue-text');
      const tap = card.querySelector('.clue-tap');
      let nudgeTimer;
      // si l'enfant ne trouve pas, on fait clignoter le prochain indice
      const nudgeLater = () => {
        clearTimeout(nudgeTimer);
        nudgeTimer = setTimeout(() => {
          const next = [...text.querySelectorAll('.piece.clue:not(.found)')][0];
          if (next && next.isConnected) restart(next, 'nudge');
        }, 7000);
      };
      const count = card.querySelector('.tri-count');
      const rule = card.querySelector('.clue-rule');
      const row = islandsRow(2);
      const isles = [false, true].map((plural, i) => {
        const isle = islandEl(`<div class="tri-label">
          <span class="tri-pic">${plural ? '🐟🐟🐟' : '🐟'}</span>
          <b>${plural ? 'Pluriel' : 'Singulier'}</b>
          <small>${plural ? 'plusieurs' : 'un seul'}</small>
        </div>`, i);
        isle.classList.add('tri-isle');
        isle.addEventListener('click', () => choose(plural, isle));
        row.append(isle);
        return isle;
      });

      function showItem() {
        const g = q.items[idx];
        q.phase = 'choix';
        busy = false;
        count.textContent = `${idx + 1} / ${q.items.length}`;
        text.textContent = groupText(g);
        text.classList.remove('pieces');
        rule.classList.add('hidden');
        tap.classList.add('hidden');
        clearTimeout(nudgeTimer);
        row.classList.remove('faded');
        isles.forEach((isl) => isl.classList.remove('chosen-ok'));
        api.clearWhy();
        restart(text, 'tri-in');
        if (idx > 0) { api.say('Singulier ou pluriel ? Lis bien, puis choisis l’île !'); }
      }

      async function choose(plural, isle) {
        if (q.phase === 'indices' && !busy) {
          // les îles ne servent plus : on montre où toucher
          api.say('Maintenant, touche les indices dans les mots 👆');
          restart(tap, 'bump');
          return;
        }
        if (busy || q.phase !== 'choix' || !stillHere(run)) return;
        const g = q.items[idx];
        busy = true;
        row.classList.add('navigating');
        row.setAttribute('aria-busy', 'true');
        isle.classList.add('sailing-to');
        try {
          await sailToIsland(isle, g.plural === plural ? 1 : 0.55);
          if (!stillHere(run)) return;
          if (g.plural !== plural) {
            restart(boatEl(), 'bonk');
            api.fail(plural ? 'Non, il n’y en a qu’un seul ! Regarde bien 👀' : 'Non, il y en a plusieurs ! Regarde bien 👀', { g });
            await sleep(450);
            if (stillHere(run)) await sailHome();
            return;
          }
          SFX.pop();
          isle.classList.add('chosen-ok');
          row.classList.add('faded');
          startClues(g);
        } finally {
          busy = false;
          row.classList.remove('navigating');
          row.removeAttribute('aria-busy');
          isle.classList.remove('sailing-to');
        }
      }

      // 2e temps : toucher les indices dans les mots
      function startClues(g) {
        q.phase = 'indices';
        const total = g.pieces.filter((p) => p.clue).length;
        let found = 0;
        text.classList.add('pieces');
        text.innerHTML = '';
        g.pieces.forEach((p, i) => {
          const b = h(`<button class="piece tappable ${p.glue ? 'glue' : ''} ${p.clue ? 'clue' : ''}" style="--i:${i}">${esc(p.t)}</button>`);
          if (i && !p.glue) text.append(document.createTextNode(' '));
          b.addEventListener('click', async () => {
            if (busy || b.classList.contains('found')) return;
            if (!p.clue) {
              restart(b, 'shake');
              api.fail('Ce morceau-là ne change pas entre un et plusieurs. Cherche ailleurs !', { g, piece: p });
              return;
            }
            b.classList.add('found', `k-${p.kind}`);
            SFX.unlock();
            found++;
            nudgeLater();
            if (found < total) {
              // sous la phrase (et pas dans la bulle) pour que les mots ne bougent pas sous le doigt
              tap.textContent = `✅ Oui ! Encore ${total - found} indice${total - found > 1 ? 's' : ''} à trouver 🔍`;
              restart(tap, 'bump');
              return;
            }
            busy = true;
            clearTimeout(nudgeTimer);
            tap.classList.add('hidden');
            text.querySelectorAll('.piece').forEach((x) => x.classList.remove('tappable'));
            rule.textContent = `✨ ${clueRule(g)}`;
            rule.classList.remove('hidden');
            restart(rule, 'tri-in');
            speak(clueRule(g).replace(/«|»/g, ''));
            await sleep(2600);
            idx++;
            if (idx >= q.items.length) api.success();
            else showItem();
          });
          text.append(b);
        });
        const msg = g.plural
          ? `Oui, c’est le pluriel ! Qu’est-ce qui te le dit ? Touche les ${total} indices.`
          : 'Oui, c’est le singulier ! Qu’est-ce qui te le dit ? Touche l’indice.';
        tap.textContent = total > 1 ? `👆 Touche les ${total} indices dans les mots` : '👆 Touche le mot qui le montre';
        tap.classList.remove('hidden');
        restart(tap, 'bump');
        nudgeLater();
        api.say(msg);
        speak(msg);
      }

      body.append(card, row);
      showItem();
    },
  },

  // 🔢 Nombre -> représentation en dizaines / unités
  dizaines: {
    subject: 'maths',
    make: (level) => {
      const n = level === 'CE1' ? rand(21, 99) : rand(11, 59);
      return { n, options: numberOptions(n, level === 'CE1' ? 4 : 3) };
    },
    instruction: (q) => `Quelle île montre le nombre ${q.n} ?`,
    hint: (q) => ({ show: `Une barre = 10, un cube = 1. ${q.n} c’est ${duText(q.n)}.`, say: `Une barre vaut dix, un cube vaut un. ${q.n}, c'est ${duText(q.n)}.` }),
    explain: (q, w) => explainNumber(q.n, w),
    render(body, q, api) {
      body.append(h(`<div class="big-number">${q.n}</div>`));
      buildIslands(body, q.options.map((o) => ({ correct: o === q.n, value: o, html: blocksHTML(o) })), api);
    },
  },

  // 🔢 Dizaines / unités -> nombre
  blocs: {
    subject: 'maths',
    make: (level) => {
      const n = level === 'CE1' ? rand(21, 99) : rand(11, 59);
      return { n, asText: level === 'CE1' && Math.random() < 0.4, options: numberOptions(n, 3) };
    },
    instruction: (q) => q.asText ? 'Lis bien, puis navigue vers le bon nombre !' : 'Compte les barres de dix et les cubes. Quelle île a le bon nombre ?',
    hint: () => ({ show: 'Les dizaines s’écrivent à gauche, les unités à droite ✋', say: 'Compte d’abord les dizaines, elles s’écrivent à gauche. Puis les unités, à droite.' }),
    explain: (q, w) => explainNumber(q.n, w),
    render(body, q, api) {
      body.append(q.asText
        ? h(`<div class="sentence">${duText(q.n)}</div>`)
        : h(`<div class="blocks-card">${blocksHTML(q.n, 'large')}</div>`));
      buildIslands(body, q.options.map((o) => ({ correct: o === q.n, value: o, html: `<div class="isle-number">${o}</div>` })), api);
    },
  },

  // 🔢 Charger la cale avec des barres de 10 et des cubes
  coffre: {
    subject: 'maths',
    make: (level) => ({ n: level === 'CE1' ? rand(21, 99) : rand(11, 49) }),
    instruction: (q) => `Charge exactement ${q.n} cubes dans la cale, puis lève l’ancre !`,
    hint: (q) => ({ show: `${q.n} = ${duText(q.n)}`, say: `${q.n}, c'est ${duText(q.n)}.` }),
    explain(q, { d, u }) {
      const N = digits(q.n);
      return {
        show: `Pour ${q.n} : ${plural(N.d, 'barre')} de 10 et ${plural(N.u, 'cube')} 👇`,
        html: `<div class="ex-pair">${numberCardHTML(q.n, 'Il faut ✅')}${numberCardHTML(d * 10 + u, 'Dans ta cale ❌')}</div>
          <p class="ex-note">Le chiffre de gauche dit combien de <b class="ex-d">barres de 10</b>, celui de droite combien de <b class="ex-u">cubes</b>.</p>`,
        say: `Pour ${q.n}, il faut ${plural(N.d, 'barre')} de dix et ${plural(N.u, 'cube')}. Dans ta cale, il y a ${plural(d, 'barre')} et ${plural(u, 'cube')}, ça fait ${d * 10 + u}.`,
      };
    },
    render: (body, q, api) => renderVault(body, q, api),
  },

  // 🔢 La cale avec des plaques de 100 (CE1)
  coffre100: {
    subject: 'maths',
    make: () => ({ n: pickHundred() }),
    instruction: (q) => `Charge exactement ${q.n} cubes dans la cale, puis lève l’ancre !`,
    hint: (q) => ({ show: `${q.n} = ${cduText(q.n)}`, say: `${q.n}, c'est ${cduText(q.n)}.`, html: cduTableHTML(q.n) }),
    explain(q, { c, d, u }) {
      const N = cdu(q.n);
      const got = c * 100 + d * 10 + u;
      return {
        show: `Pour ${q.n} : ${plural(N.c, 'plaque')} de 100, ${plural(N.d, 'barre')} de 10 et ${plural(N.u, 'cube')} 👇`,
        html: `<div class="ex-pair">${numberCard3HTML(q.n, 'Il faut ✅')}${numberCard3HTML(got, 'Dans ta cale ❌')}</div>
          <p class="ex-note">Le 1er chiffre dit combien de <b class="ex-c">plaques de 100</b>, le 2e combien de <b class="ex-d">barres de 10</b>, le 3e combien de <b class="ex-u">cubes</b>.</p>`,
        say: `Pour ${q.n}, il faut ${plural(N.c, 'plaque')} de cent, ${plural(N.d, 'barre')} de dix et ${plural(N.u, 'cube')}. Dans ta cale, ça fait ${got}.`,
      };
    },
    render: (body, q, api) => renderVault(body, q, api),
  },

  // 🔢 Centaines : blocs / texte -> nombre, ou nombre -> tableau C D U (CE1)
  centaines: {
    subject: 'maths',
    make() {
      const n = pickHundred();
      const k = Math.random();
      const kind = k < 0.4 ? 'blocs' : k < 0.7 ? 'texte' : 'tableau';
      const order = kind === 'texte' && Math.random() < 0.4 ? shuffle(['c', 'd', 'u']) : ['c', 'd', 'u'];
      return { n, kind, order, options: hundredOptions(n, kind === 'tableau' ? 3 : 4) };
    },
    instruction: (q) => ({
      blocs: 'Compte les plaques de 100, les barres de 10 et les cubes. Quelle île a le bon nombre ?',
      texte: 'Lis bien, puis navigue vers le bon nombre !',
      tableau: `Quelle île range bien le nombre ${q.n} ?`,
    })[q.kind],
    hint: (q) => (q.kind === 'tableau'
      ? { show: 'Le 1er chiffre, ce sont les centaines, puis les dizaines, puis les unités ✋', say: 'Le premier chiffre, ce sont les centaines. Ensuite les dizaines, puis les unités.' }
      : { show: 'Une plaque = 100, une barre = 10, un cube = 1. Écris les centaines, puis les dizaines, puis les unités.', say: 'Une plaque vaut cent, une barre vaut dix, un cube vaut un. On écrit les centaines, puis les dizaines, puis les unités.' }),
    explain: (q, w) => explainNumber3(q.n, w),
    render(body, q, api) {
      if (q.kind === 'tableau') {
        body.append(h(`<div class="big-number">${q.n}</div>`));
        buildIslands(body, q.options.map((o) => ({ correct: o === q.n, value: o, html: cduTableHTML(o, 'isle') })), api);
        return;
      }
      body.append(q.kind === 'texte'
        ? h(`<div class="sentence">${cduText(q.n, q.order)}</div>`)
        : h(`<div class="blocks-card">${hBlocksHTML(q.n, 'big')}</div>`));
      buildIslands(body, q.options.map((o) => ({ correct: o === q.n, value: o, html: `<div class="isle-number">${o}</div>` })), api);
    },
  },

  // 🔢 Nombre écrit en lettres <-> en chiffres (CE1)
  lettres: {
    subject: 'maths',
    make() {
      const n = pickHundred();
      const toWords = Math.random() < 0.4;
      return { n, toWords, options: hundredOptions(n, toWords ? 3 : 4, !toWords) };
    },
    instruction: (q) => (q.toWords ? `Comment s’écrit ${q.n} en lettres ? Navigue vers la bonne île !` : 'Lis le nombre écrit en lettres. Quelle île l’écrit en chiffres ?'),
    hint: (q) => wordsHint(q.n),
    explain(q, w) {
      if (!q.toWords) {
        const ex = explainNumber3(q.n, w);
        return Object.assign(ex, { html: `<div class="ex-line">${wordsSplitHTML(q.n)}</div>${cduTableHTML(q.n)}${ex.html}`, say: `${wordsHint(q.n).say} ${ex.say}` });
      }
      return {
        show: `${q.n}, ça se lit « ${numberWords(q.n)} » 👇`,
        html: `<div class="ex-pair">
          <div class="ex-word"><small>Le bon ✅</small><div class="ex-digits">${digits3HTML(q.n)}</div><span class="ex-nw">${wordsSplitHTML(q.n)}</span></div>
          <div class="ex-word"><small>Ton choix ❌</small><div class="ex-digits">${digits3HTML(w)}</div><span class="ex-nw">${wordsSplitHTML(w)}</span></div>
        </div><p class="ex-note">On lit d’abord les centaines, puis le reste.</p>`,
        say: `${q.n}, ça se lit ${numberWords(q.n)}. Toi, tu as choisi ${numberWords(w)}, c'est le nombre ${w}.`,
      };
    },
    render(body, q, api) {
      if (q.toWords) {
        body.append(h(`<div class="big-number">${q.n}</div>`));
        buildIslands(body, q.options.map((o) => ({ correct: o === q.n, value: o, html: `<div class="isle-words">${numberWords(o)}</div>` })), api);
        return;
      }
      body.append(h(`<div class="sentence num-words">${numberWords(q.n)}</div>`));
      buildIslands(body, q.options.map((o) => ({ correct: o === q.n, value: o, html: `<div class="isle-number ${o > 999 ? 'long' : ''}">${o}</div>` })), api);
    },
  },

  // 🔢 Calcul mental
  calcul: {
    subject: 'maths',
    make(level) {
      let a;
      let b;
      let op = '+';
      const k = Math.random();
      if (level === 'CP') {
        if (k < 0.45) { a = rand(1, 9); b = rand(1, 9); }
        else if (k < 0.65) { a = 10; b = rand(1, 9); if (Math.random() < 0.5) [a, b] = [b, a]; }
        else if (k < 0.8) { a = b = rand(1, 10); }
        else { op = '-'; a = rand(5, 12); b = rand(1, Math.min(5, a - 1)); }
      } else if (k < 0.25) { a = rand(2, 8) * 10 + rand(0, 5); b = rand(1, 9 - (a % 10)); }
      else if (k < 0.42) { a = rand(1, 5) * 10; b = rand(1, 4) * 10; }
      else if (k < 0.57) { a = rand(11, 89); b = 10; }
      else if (k < 0.72) { a = rand(6, 9); b = rand(5, 9); }
      else if (k < 0.86) { op = '-'; a = rand(20, 99); b = 10; }
      else { op = '-'; a = rand(2, 9) * 10 + rand(5, 9); b = rand(1, a % 10); }
      const ans = op === '+' ? a + b : a - b;
      const near = shuffle([ans + 1, ans - 1, ans + 2, ans - 2]);
      if (ans >= 20) near.unshift(pick([ans + 10, ans - 10]));
      const options = [ans];
      for (const x of near) if (options.length < (level === 'CE1' ? 4 : 3) && x >= 0 && !options.includes(x)) options.push(x);
      return { a, b, op, ans, options: shuffle(options), small: a <= 10 && b <= 10 };
    },
    instruction: (q) => `Combien font ${q.a} ${q.op === '+' ? 'plus' : 'moins'} ${q.b} ? Navigue vers la bonne île !`,
    hint(q) {
      if (q.small) {
        const dots = q.op === '+'
          ? `${'<span>🔵</span>'.repeat(q.a)} + ${'<span>🟠</span>'.repeat(q.b)}`
          : `${'<span>🔵</span>'.repeat(q.a - q.b)}${'<span class="cross">🔵</span>'.repeat(q.b)}`;
        return { show: 'Compte les ronds avec ton doigt ☝️', say: 'Compte les ronds avec ton doigt.', html: `<div class="dots">${dots}</div>` };
      }
      return { show: 'Commence par les dizaines, puis les unités 💪', say: 'Commence par les dizaines, puis les unités.' };
    },
    explain(q, w) {
      const { a, b, ans } = q;
      const plus = q.op === '+';
      const sign = plus ? '+' : '−';
      const word = plus ? 'plus' : 'moins';
      const gap = w - ans;
      const oops = Math.abs(gap) === 10 ? `Tu as choisi ${w} : attention aux dizaines !`
        : Math.abs(gap) <= 2 ? `Tu as choisi ${w} : c’est ${Math.abs(gap) === 1 ? 'un' : 'deux'} de ${gap > 0 ? 'trop' : 'moins'}. Recompte doucement !`
        : `Tu as choisi ${w}.`;
      const QMARK = '<span class="qmark">?</span>';
      let steps; let say;
      if (plus && a < 10 && b < 10 && ans > 10) {
        // on passe par 10 : 8 + 5 = 8 + 2 + 3 = 10 + 3
        const c = 10 - a;
        steps = `<div class="dots">${'<span>🔵</span>'.repeat(a)}${'<span>🟠</span>'.repeat(c)}<span class="ex-sep">|</span>${'<span>🟠</span>'.repeat(b - c)}</div>
          <div class="ex-line">${a} + ${b} = ${a} + <b class="ex-u">${c}</b> + ${b - c}</div>
          <div class="ex-line">= <b class="ex-d">10</b> + ${b - c} = ${QMARK}</div>`;
        say = `On passe par dix. ${a} plus ${c}, ça fait dix. Il reste encore ${b - c}. Dix plus ${b - c}, ça fait combien ?`;
      } else if (q.small) {
        // on compte sur la file des nombres
        const hops = Array.from({ length: b }, (_, i) => (plus ? a + i + 1 : a - i - 1));
        steps = `<div class="ex-line">Je pars de <b>${a}</b> et ${plus ? 'j’avance' : 'je recule'} de <b>${b}</b> :</div>
          <div class="ex-hops"><span class="ex-hop start">${a}</span>${hops.map((x, i) => `<span class="ex-arrow">${plus ? '➜' : '⬅'}</span><span class="ex-hop ${i === b - 1 ? 'end' : ''}">${i === b - 1 ? '?' : x}</span>`).join('')}</div>`;
        say = `Je pars de ${a}, et ${plus ? "j'avance" : 'je recule'} de ${b}, en comptant sur mes doigts : ${hops.slice(0, -1).join(', ')}${b > 1 ? ', et…' : ''} À toi de trouver le dernier !`;
      } else {
        // dizaines avec dizaines, unités avec unités
        const A = digits(a);
        const B = digits(b);
        const R = digits(ans);
        const du = plus ? A.u + B.u : A.u - B.u;
        const dd = plus ? A.d + B.d : A.d - B.d;
        const carry = plus && du >= 10;
        steps = `<div class="ex-line big">${digitsHTML(a)} ${sign} ${digitsHTML(b)}</div>
          <div class="ex-grid">
            <span class="ex-d">Dizaines</span><span>${A.d} ${sign} ${B.d} = <b class="ex-d">${dd}</b></span>
            <span class="ex-u">Unités</span><span>${A.u} ${sign} ${B.u} = <b class="ex-u">${du}</b></span>
          </div>
          ${carry ? '<p class="ex-note">10 unités = 1 dizaine de plus !</p>' : ''}
          <div class="ex-line">= <b class="ex-d">${plural(R.d, 'dizaine')}</b> et <b class="ex-u">${plural(R.u, 'unité')}</b> = ${QMARK}</div>`;
        say = `On calcule les dizaines avec les dizaines : ${A.d} ${word} ${B.d}, ça fait ${dd}. Puis les unités avec les unités : ${A.u} ${word} ${B.u}, ça fait ${du}.${carry ? ' Dix unités, ça fait une dizaine de plus.' : ''} Alors, ça fait combien ?`;
      }
      return {
        show: oops,
        html: `<div class="ex-op">${a} ${sign} ${b} = ${QMARK}</div>${steps}<p class="ex-note">À toi de finir le calcul ! 💪</p>`,
        say: `${oops} ${say}`,
      };
    },
    render(body, q, api) {
      const op = h(`<div class="big-number">${q.a} ${q.op === '+' ? '+' : '−'} ${q.b} = <span class="qmark">?</span></div>`);
      body.append(op);
      buildIslands(body, q.options.map((o) => ({ correct: o === q.ans, value: o, html: `<div class="isle-number">${o}</div>` })), api, () => {
        op.querySelector('.qmark').outerHTML = `<span class="ans">${q.ans}</span>`;
      });
    },
  },

  // 📚 Mot du jour : écouter le mot et trouver l'île où il est écrit
  ecouteMot: {
    subject: 'lecture',
    make() {
      const word = pickDailyWord();
      const listen = canSpeak();
      return { word, listen, options: shuffle([word, ...wordTraps(word, listen, 2)]) };
    },
    instruction: (q) => q.listen
      ? 'Mot du jour ! Écoute bien le mot, puis navigue vers l’île où il est écrit.'
      : 'Mot du jour ! Trouve l’île où est écrit le même mot.',
    hint: (q) => ({ show: `Le mot commence par « ${q.word[0]} » 👀`, say: q.word }),
    explain: (q, w) => explainWord(q.word, w),
    track: (q, firstTry) => recordWord(q.word, firstTry),
    render(body, q, api) {
      if (q.listen) {
        const btn = h('<button class="listen-btn" title="Réécouter le mot">🔊<small>Écoute</small></button>');
        btn.addEventListener('click', () => { restart(btn, 'bump'); speak(q.word, { rate: 0.75 }); });
        body.append(btn);
        setTimeout(() => speak(q.word, { queue: true, rate: 0.75 }), 500);
      } else {
        body.append(h(`<div class="sentence daily-word">${q.word}</div>`));
      }
      buildIslands(body, q.options.map((o) => ({ correct: o === q.word, value: o, html: `<div class="word" style="--len:${Math.max(o.length, 4)}">${o}</div>` })), api);
    },
  },

  // 📚 Mot du jour : compléter une phrase à trou
  phraseTrou: {
    subject: 'lecture',
    make() {
      const withSentences = dailyWords().filter((w) => WORD_BANK[w]);
      const word = pickDailyWord(withSentences.length ? withSentences : null);
      const bank = WORD_BANK[word];
      if (!bank) return ROOM_TYPES.ecouteMot.make();
      const [text, pic] = pick(bank.sentences);
      const atStart = text.startsWith('___');
      const fmt = (w) => (atStart ? cap(w) : w);
      return { word, text, pic, fmt, options: shuffle([word, ...shuffle(bank.near).slice(0, 2)]) };
    },
    instruction: (q) => q.text
      ? 'Mot du jour ! Quel mot manque dans la phrase ? Navigue vers la bonne île.'
      : ROOM_TYPES.ecouteMot.instruction(q),
    hint: (q) => (q.text
      ? { show: 'Écoute la phrase entière 👂', say: q.text.replace('___', q.word) }
      : ROOM_TYPES.ecouteMot.hint(q)),
    explain(q, w) {
      if (!q.text) return explainWord(q.word, w);
      const ex = explainWord(q.word, w, q.fmt);
      const full = q.text.replace('___', q.fmt(q.word));
      return {
        show: 'Écoute la phrase avec le bon mot 👂',
        html: `<div class="sentence ex-sentence">${esc(q.text).replace('___', `<mark class="good">${esc(q.fmt(q.word))}</mark>`)}</div>${ex.html}`,
        say: `On dit : ${full} ${ex.say}`,
      };
    },
    track: (q, firstTry) => recordWord(q.word, firstTry),
    render(body, q, api) {
      if (!q.text) { ROOM_TYPES.ecouteMot.render(body, q, api); return; }
      body.append(h(`<div class="big-emoji small">${q.pic}</div>`));
      const sentence = h(`<div class="sentence">${q.text.replace('___', '<span class="blank">?</span>')}</div>`);
      body.append(sentence);
      buildIslands(body, q.options.map((o) => ({ correct: o === q.word, value: o, html: `<div class="word" style="--len:${Math.max(o.length, 4)}">${q.fmt(o)}</div>` })), api, () => {
        const b = sentence.querySelector('.blank');
        b.textContent = q.fmt(q.word);
        b.classList.add('filled');
      });
    },
  },

  // 🔢 Ranger des nombres : allumer les lanternes
  ordre: {
    subject: 'maths',
    make(level) {
      const ce1 = level === 'CE1';
      const set = new Set();
      if (ce1) {
        const a = rand(1, 9);
        let b = rand(1, 9);
        while (b === a) b = rand(1, 9);
        set.add(a * 10 + b);
        set.add(b * 10 + a);
      }
      while (set.size < (ce1 ? 5 : 4)) set.add(ce1 ? rand(10, 99) : rand(1, 40));
      const nums = [...set];
      const desc = ce1 && Math.random() < 0.4;
      return { nums: shuffle(nums), desc, target: [...nums].sort((x, y) => (desc ? y - x : x - y)) };
    },
    instruction: (q) => q.desc
      ? 'Allume les lanternes : touche les bouées du plus GRAND au plus petit !'
      : 'Allume les lanternes : touche les bouées du plus petit au plus grand !',
    hint: (q) => ({
      show: `Cherche le plus ${q.desc ? 'grand' : 'petit'} nombre qui reste. Regarde d’abord les dizaines 👀`,
      say: `Cherche le plus ${q.desc ? 'grand' : 'petit'} nombre qui reste. Regarde d'abord les dizaines.`,
    }),
    explain(q, { n, pos }) {
      const want = q.target[pos];
      const big = q.desc ? 'grand' : 'petit';
      const W = digits(want);
      const N = digits(n);
      const why = W.d !== N.d
        ? `On regarde d'abord les dizaines : ${want} a ${plural(W.d, 'dizaine')}, ${n} en a ${N.d}. Donc ${want} est plus ${W.d < N.d ? 'petit' : 'grand'}.`
        : `${want} et ${n} ont tous les deux ${plural(W.d, 'dizaine')}. Alors on regarde les unités : ${W.u} et ${N.u}. Donc ${want} est plus ${W.u < N.u ? 'petit' : 'grand'}.`;
      return {
        show: `Le plus ${big} qui reste, c’est ${want} 👇`,
        html: `<div class="ex-order">${q.target.slice(pos).map((x) => `<span class="ex-chip ${x === want ? 'good' : x === n ? 'bad' : ''}">${digitsHTML(x)}</span>`).join(`<span class="ex-arrow">${q.desc ? '&gt;' : '&lt;'}</span>`)}</div>
          <p class="ex-note">${why}</p>`,
        say: `Le plus ${big} qui reste, c'est ${want}. ${why}`,
      };
    },
    render(body, q, api) {
      const row = h(`<div class="torches">${q.target.map(() => '<div class="torch"><span class="flame">🏮</span><span class="tval">?</span></div>').join('')}</div>`);
      const label = h(`<div class="order-hint">${q.desc ? 'plus grand ➜ plus petit' : 'plus petit ➜ plus grand'}</div>`);
      const pool = h(`<div class="stones">${q.nums.map((n, i) => `<button class="stone" style="--i:${i}"><span>${n}</span></button>`).join('')}</div>`);
      let pos = 0;
      pool.querySelectorAll('.stone').forEach((b) => b.addEventListener('click', () => {
        if (pos >= q.target.length) return;
        const n = Number(b.textContent);
        if (n === q.target[pos]) {
          const t = row.children[pos];
          t.classList.add('lit');
          t.querySelector('.tval').textContent = n;
          b.classList.add('gone');
          SFX.pop();
          pos++;
          if (pos === q.target.length) setTimeout(() => api.success(), 450);
        } else {
          b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-12px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(0)' }], { duration: 400 });
          api.fail(undefined, { n, pos });
        }
      }));
      body.append(row, label, pool);
    },
  },
};

const READING_TYPES = ['phrase', 'mot', 'ordreMots'];
const DAILY_TYPES = ['ecouteMot', 'phraseTrou'];

// ================= Mots du jour =================
function dailyWords() {
  const list = String(S.dailyWords || '').toLowerCase().split(/[\s,;]+/).map((w) => w.trim()).filter(Boolean);
  return [...new Set(list)];
}

// Les mots ratés reviennent plus souvent, ceux déjà bien sus un peu moins
function pickDailyWord(pool) {
  const words = pool || dailyWords();
  if (!words.length) return 'le';
  const weights = words.map((w) => {
    const st = S.wordStats[w] || { ok: 0, ko: 0 };
    return Math.max(0.3, 1 + st.ko * 1.5 - Math.min(st.ok, 4) * 0.2);
  });
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < words.length; i++) {
    r -= weights[i];
    if (r <= 0) return words[i];
  }
  return words[words.length - 1];
}

function recordWord(word, firstTry) {
  const st = S.wordStats[word] || { ok: 0, ko: 0 };
  if (firstTry) st.ok++; else st.ko++;
  S.wordStats[word] = st;
  save();
}

// Mots « pièges » qui se ressemblent (sans homophone si on écoute le mot)
function wordTraps(word, listen, count) {
  const homo = HOMOPHONES.find((g) => g.includes(word)) || [];
  const ok = (w) => w !== word && !(listen && homo.includes(w));
  let traps = shuffle(((WORD_BANK[word] || {}).near || []).filter(ok));
  if (traps.length < count) {
    const others = dailyWords().filter((w) => ok(w) && !traps.includes(w));
    const close = others.filter((w) => w[0] === word[0] || Math.abs(w.length - word.length) <= 1);
    traps = traps.concat(shuffle(close), shuffle(others.filter((w) => !close.includes(w))));
  }
  return traps.slice(0, count);
}

function wordMastery(w) {
  const st = S.wordStats[w];
  if (!st) return 'new';
  if (st.ok >= 3 && st.ok > st.ko * 2) return 'good';
  return st.ko > st.ok ? 'hard' : 'learning';
}
const MATHS_TYPES = ['dizaines', 'blocs', 'coffre', 'calcul', 'ordre'];
// CE1 : les centaines (manipulation, tableau C D U, nombres en lettres)
const HUNDRED_TYPES = ['centaines', 'lettres', 'coffre100', 'lettres'];

// Tire des types en évitant les répétitions trop rapprochées
function drawer(types) {
  let bag = [];
  return () => {
    if (!bag.length) bag = shuffle(types);
    return bag.pop();
  };
}

const PLURAL_TYPES = ['indices'];

function buildSequence(mode, count) {
  const letters = drawer(S.level === 'GS' ? ['petiteLettre', 'petitePaire'] : ['petiteLettre']);
  const numbers = drawer(['petitCompte', 'petiteCollection']);
  return Array.from({ length: count }, (_, i) =>
    mode === 'lecture' ? letters() : mode === 'maths' ? numbers() : i % 2 === 0 ? letters() : numbers());
}

// ================= Écran d'accueil =================
function renderHome() {
  setTheme(null);
  const seg = (key, opts) => `<div class="seg" data-key="${key}">${opts.map(([v, label]) =>
    `<button data-v="${v}" class="${S[key] === v ? 'sel' : ''}">${label}</button>`).join('')}</div>`;
  document.getElementById('decor').innerHTML = '';
  app.innerHTML = `<section class="home art-home">
    <header class="home-nav"><a class="home-brand" href="#">${nauticalIcon('compass')} <span>Les Petites Îles Magiques</span></a><button class="btn ghost home-map" type="button">Ma carte ${nauticalIcon('arrow')}</button></header>
    <div class="home-hero">
      <div class="hero-copy"><span class="eyebrow">MON PREMIER VOYAGE • MS / GS</span>
        <h1 class="title">À l’abordage,<br><span>petit capitaine !</span></h1>
        <p class="subtitle">Des lettres à découvrir.<br>Des trésors à compter.</p>
        <div class="home-actions"><button class="btn big go-btn">On embarque ! ${nauticalIcon('arrow')}</button><a class="prepare-link" href="#preparation">Coin des parents ${nauticalIcon('settings')}</a></div>
        <div class="hero-guide">${profSays(esc(profLine('hello')), 'happy')}</div>
      </div>
      <div class="hero-art" aria-hidden="true"><img class="hero-island" src="assets/marine/tropical.webp" alt="" width="1448" height="1086"><div class="hero-boat">${boatSVG(S.boat)}</div><span class="hero-stamp">Cap sur les<br>découvertes ! ${nauticalIcon('star')}</span></div>
    </div>
    <div class="little-adventures" aria-label="Choisis ton aventure">
      <div class="little-adventures-title"><span class="eyebrow">À TOI DE JOUER</span><h2>On découvre quoi ?</h2></div>
      <button class="adventure-pick letters-pick" data-mode="lecture"><span class="adventure-toy" aria-hidden="true"><i>A</i><i>B</i><i>C</i></span><span><b>L’île des lettres</b><small>Écoute et retrouve la lettre !</small></span><span class="adventure-arrow" aria-hidden="true">➜</span></button>
      <button class="adventure-pick numbers-pick" data-mode="maths"><span class="adventure-toy" aria-hidden="true">🐚<i>1 2 3</i></span><span><b>Le trésor à compter</b><small>Touche, compte et embarque !</small></span><span class="adventure-arrow" aria-hidden="true">➜</span></button>
    </div>
    <details class="parent-corner" id="preparation"><summary>${nauticalIcon('settings')} Le coin des parents <span>MS / GS, bateau et compagnons</span></summary>
    <div class="preparation-head"><span class="eyebrow">L’ATELIER DU CAPITAINE</span><h2>On prépare ton voyage ?</h2><p>Choisis ton équipage et personnalise ton aventure.</p></div>
    <div class="setup">
      <fieldset class="setup-section captain-settings"><legend>${nauticalIcon('compass')} Le capitaine, c’est toi</legend>
        <label class="field"><span>Ton prénom</span><input id="name" maxlength="14" autocomplete="off" value="${esc(S.name)}"></label>
        <div class="field"><span>Ça se prononce <small>(écris-le comme ça se dit)</small></span><div class="voice-pick"><input id="name-say" maxlength="20" autocomplete="off" value="${esc(S.nameSay)}" placeholder="${esc(S.name)}"><button class="seg-btn test-name" type="button">▶ Écouter</button></div></div>
        <div class="field"><span>Ta classe</span>${seg('level', [['MS', 'Moyenne section'], ['GS', 'Grande section']])}</div>
      </fieldset>
      <fieldset class="setup-section boat-settings"><legend>${nauticalIcon('anchor')} Ton navire</legend>
        <div class="boat-maker"><div class="boat-preview"><div class="mini-sea"></div>${boatSVG(S.boat)}</div><div class="boat-opts">
          <div class="opt-row" data-k="pattern"><em>Voile</em><span class="opt-list chips">${BOAT_OPTIONS.pattern.map(([v, l]) => `<button class="chip ${S.boat.pattern === v ? 'sel' : ''}" data-v="${v}">${l}</button>`).join('')}</span></div>
          ${[['hull', 'Coque'], ['sail', 'Tissu']].map(([k, l]) => `<div class="opt-row" data-k="${k}"><em>${l}</em><span class="opt-list swatches">${BOAT_OPTIONS[k].map((c) => `<button class="swatch ${S.boat[k] === c ? 'sel' : ''}" data-v="${c}" style="background:${c}" aria-label="${l} ${c}"></button>`).join('')}</span></div>`).join('')}
        </div></div>
      </fieldset>
      <fieldset class="setup-section learning-settings"><legend>${nauticalIcon('book')} Tes découvertes</legend>
        <p>MS : lettres capitales et collections de 1 à 5.<br>GS : capitales, minuscules et collections de 1 à 10.</p><p>Image repère, lettre à écouter et aide à tout moment. Aucun chronomètre : chaque essai aide à apprendre.</p>
        <div class="field"><span>Les épreuves</span>${seg('mode', [['mix', 'Tout explorer'], ['lecture', 'Les lettres'], ['maths', 'Je compte']])}</div>
      </fieldset>
      <fieldset class="setup-section crew-settings"><legend>${nauticalIcon('star')} Ton compagnon d’aventure</legend>
        <div class="prof-pick">${Object.entries(PROFS).map(([id, p]) => `<button class="prof-card ${S.prof === id ? 'sel' : ''}" data-id="${id}"><span class="prof-mini">${profSVG('idle', id)}</span><b>${p.name}</b><small>${p.desc}</small></button>`).join('')}</div>
        <details class="voice-settings"><summary>Choisir la voix du professeur</summary><div class="voice-pick"><select id="voice-name" aria-label="Voix du professeur"></select><button class="seg-btn test-voice" type="button">▶ Écouter</button></div></details>
      </fieldset>
      <fieldset class="setup-section sound-settings"><legend>${nauticalIcon('sound')} Le son à ta façon</legend>
        <div class="field"><span>Les bruitages</span>${seg('sound', [[true, 'Avec'], [false, 'Sans']])}</div>
        <div class="field"><span>La voix qui t’accompagne</span>${seg('voice', [[true, 'Avec'], [false, 'Sans']])}</div>
        <button class="seg-btn test-sound" type="button">${nauticalIcon('sound')} Tester le son</button><small class="sound-report hidden"></small>
      </fieldset>
    </div>
    <div class="home-bottom"><button class="btn big go-btn">Larguer les amarres ! ${nauticalIcon('arrow')}</button><p>Ton aventure est sauvegardée sur cet appareil.</p></div>
    </details>
    <footer class="game-footer">Les Petites Îles Magiques <span>•</span> Un peu de magie, beaucoup de découvertes.<details><summary>Crédits des illustrations pédagogiques</summary><p>Pictogrammes Twemoji, Twitter et autres contributeurs, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>.</p></details></footer>
  </section>`;

  app.querySelectorAll('.adventure-pick').forEach((button) => button.addEventListener('click', () => { S.mode = button.dataset.mode; save(); SFX.good(); renderMap(); }));
  app.querySelector('.prepare-link').addEventListener('click', () => { app.querySelector('.parent-corner').open = true; });
  app.querySelector('#name').addEventListener('input', (e) => { S.name = e.target.value.trim(); S.nameSay = ''; save();
    const say = app.querySelector('#name-say'); say.value = ''; say.placeholder = S.name;
  });
  app.querySelector('#name-say').addEventListener('input', (e) => { S.nameSay = e.target.value.trim(); save(); });
  app.querySelector('.test-name').addEventListener('click', () => speak(`Bravo ${S.name} !`));
  app.querySelectorAll('.opt-row').forEach((row) => row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    S.boat[row.dataset.k] = b.dataset.v; save(); SFX.pop();
    row.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
    const prev = app.querySelector('.boat-preview');
    prev.innerHTML = `<div class="mini-sea"></div>${boatSVG(S.boat)}`;
    app.querySelector('.hero-boat').innerHTML = boatSVG(S.boat);
    restart(prev, 'happy');
  })));
  app.querySelectorAll('.seg').forEach((g) => g.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    const key = g.dataset.key;
    const raw = b.dataset.v;
    S[key] = raw === 'true' ? true : raw === 'false' ? false : raw;
    save(); SFX.click();
    g.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
  })));
  app.querySelectorAll('.go-btn, .home-map').forEach((button) => button.addEventListener('click', () => { SFX.good(); renderMap(); }));

  const voiceSel = app.querySelector('#voice-name');
  const helloProf = () => speak(`Bonjour ${S.name || ''} ! Je suis ${curProf().intro}.`);
  const fillVoices = () => {
    const voices = frenchVoices();
    const cur = voiceFor(S.prof);
    voiceSel.innerHTML = voices.length
      ? voices.map((v) => `<option value="${esc(v.name)}" ${v === cur ? 'selected' : ''}>${esc(v.name.replace(/ \(français.*\)$/, ''))}${v.lang.toLowerCase() === 'fr-ca' ? ' 🇨🇦' : ''}</option>`).join('')
      : '<option>Aucune voix française trouvée</option>';
  };
  fillVoices();
  if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', fillVoices);
  voiceSel.addEventListener('change', () => {
    S.profVoices[S.prof] = voiceSel.value; save();
    helloProf();
  });
  app.querySelector('.test-voice').addEventListener('click', () => {
    if (!S.voice) { S.voice = true; save(); renderHome(); }
    helloProf();
  });
  // Test du son : joue un bruitage et fait parler le prof, puis dit ce qui a marché (utile sur iPhone)
  app.querySelector('.test-sound').addEventListener('click', () => {
    const report = app.querySelector('.sound-report');
    const lines = [];
    const show = () => { report.innerHTML = lines.map(esc).join('<br>'); report.classList.remove('hidden'); };
    const attempt = (label, fn) => { try { fn(); } catch (e) { lines.push(`❌ ${label} : ${e.message}`); } };
    let x = null;
    attempt('Bruitages', () => {
      x = SFX.ctx();
      const wasSound = S.sound;
      S.sound = true; SFX.good(); S.sound = wasSound;
      lines.push(x ? `🔔 Bruitages : ${x.state === 'running' ? 'prêts' : `bloqués (${x.state})`}` : '🔔 Bruitages : pas pris en charge');
    });
    lines.push('ℹ️ Rien entendu sur iPhone ? Désactive le mode silencieux.');
    if (!S.sound || !S.voice) lines.push(`ℹ️ Dans le jeu : bruitages ${S.sound ? 'oui' : 'NON'}, voix ${S.voice ? 'oui' : 'NON'}`);
    if (!('speechSynthesis' in window)) {
      lines.push('🗣️ Voix : pas prise en charge par ce navigateur');
      show();
      return;
    }
    let started = false;
    attempt('Voix', () => {
      const v = voiceFor(S.prof);
      lines.push(`🗣️ Voix : ${frenchVoices().length} voix françaises (${speechSynthesis.getVoices().length} en tout), choisie : ${v ? v.name : 'celle par défaut'}`);
      const u = speak(`Bonjour ${S.name || ''} ! Tu m'entends bien ?`, { force: true });
      if (!u) { lines.push('❌ La phrase n’a pas pu être créée'); return; }
      u.onstart = () => { started = true; lines.push('✅ La voix parle'); show(); };
      u.onerror = (e) => { lines.push(`❌ Erreur de la voix : ${e.error}`); show(); };
    });
    setTimeout(() => {
      if (!started) lines.push(`⚠️ La voix ne démarre pas (speaking=${speechSynthesis.speaking}, pending=${speechSynthesis.pending})`);
      if (x && x.state !== 'running') lines.push(`⚠️ Bruitages toujours bloqués (${x.state})`);
      show();
    }, 2500);
    show();
  });

  app.querySelectorAll('.prof-card').forEach((c) => c.addEventListener('click', () => {
    S.prof = c.dataset.id; save(); SFX.pop();
    app.querySelectorAll('.prof-card').forEach((x) => x.classList.toggle('sel', x === c));
    profMood(c, 'happy');
    app.querySelector('.hero-guide').innerHTML = profSays(esc(profLine('hello')), 'happy');
    fillVoices();
    helloProf();
  }));
}

// ================= Carte des mers =================
function totalStars() {
  return Object.values(S.worlds).reduce((t, w) => t + (w.best || 0), 0);
}
function isUnlocked(i) {
  return i === 0 || !!(S.worlds[WORLDS[i - 1].id] || {}).done;
}

function mapWorldState(i) {
  if (!isUnlocked(i)) return 'locked';
  return (S.worlds[WORLDS[i].id] || {}).done ? 'completed' : 'open';
}

function renderMap() {
  setTheme(null);
  document.getElementById('decor').innerHTML = '';
  const max = STEPS_PER_WORLD * 3;
  const nextIdx = WORLDS.findIndex((w, i) => mapWorldState(i) === 'open');
  const destination = WORLDS[nextIdx < 0 ? 0 : nextIdx];
  app.innerHTML = `<section class="map illustrated-map">
    <header class="map-head">
      <button class="icon-btn" id="btn-home" title="Réglages">⚙️</button>
      <div class="hello">Ahoy ${esc(S.name || 'moussaillon')} !</div>
      <div class="star-count">⭐ ${totalStars()} <span>étoiles</span></div>
    </header>
    <div class="chart-title"><h1>Les Petites Îles <span>Magiques</span></h1><span class="title-star" aria-hidden="true">★</span></div>
    <p class="chart-direction">Départ au niveau 1, puis on remonte les îles ↑</p>
    <div class="archipelago" aria-label="Carte des cinq mers">
    ${chartScenery()}
    <div class="chart-boat" aria-hidden="true">${boatSVG(S.boat)}</div>
    <div class="worlds">${WORLDS.map((w, i) => {
      const prog = S.worlds[w.id] || {};
      const state = mapWorldState(i);
      const open = state !== 'locked';
      const status = !open ? '🔒 Fermé' : state === 'completed' ? 'Ouvert · Rejouer' : 'Ouvert · Commencer';
      const requirement = !open ? `Termine ${CHART_LABELS[WORLDS[i - 1].id]}` : '';
      return `<button class="world-card ${open ? '' : 'locked'} ${i === nextIdx ? 'next' : ''}" data-i="${i}" data-world="${w.id}" data-state="${state}" aria-label="Niveau ${i + 1} : ${w.name} — ${open ? status : requirement}" aria-describedby="world-status-${w.id}" aria-disabled="${!open}" ${open ? '' : 'disabled'} style="--c1:${w.c1};--c2:${w.c2};--i:${i}">
        ${islandArt(w.id)}
        <span class="w-name"><small>Niveau ${i + 1}</small>${CHART_LABELS[w.id]}</span>
        <span class="island-status" id="world-status-${w.id}">${status}</span>
        ${!open ? `<span class="world-requirement">${requirement}</span>` : state === 'completed' ? `<span class="world-progress">★ ${prog.best || 0} / ${max}</span>` : ''}
      </button>`;
    }).join('')}</div>
    </div>
    <div class="chart-crew">${chartProfessor()}<p class="crew-bubble">Prêt,<br>capitaine ?</p></div>
    <div class="chart-departure"><button class="btn big chart-continue" id="btn-continue">${nextIdx < 0 ? 'Repartir à l’aventure' : 'Continuer l’aventure'} <span aria-hidden="true">➜</span></button><span class="chart-destination">Cap sur ${CHART_LABELS[destination.id]} !</span></div>
    <p class="chart-notice" role="status" aria-live="polite"></p>

  </section>`;
  app.querySelector('#btn-home').addEventListener('click', () => { SFX.click(); renderHome(); document.getElementById('preparation').open = true; document.getElementById('preparation').scrollIntoView({ block: 'start' }); });
  app.querySelector('#btn-continue').addEventListener('click', () => { SFX.good(); startWorld(destination); });
  let noticeTimer;
  app.querySelectorAll('.world-card').forEach((c) => c.addEventListener('click', () => {
    const i = Number(c.dataset.i);
    if (!isUnlocked(i)) {
      restart(c, 'shake'); SFX.bad();
      const notice = app.querySelector('.chart-notice');
      notice.textContent = `Pour découvrir ${CHART_LABELS[WORLDS[i].id]}, termine d’abord ${CHART_LABELS[WORLDS[i - 1].id]}.`;
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => { notice.textContent = ''; }, 5000);
      profMood(app, 'oops');
      speak('Cette mer est encore fermée. Termine la mer d’avant pour l’ouvrir !');
      return;
    }
    SFX.good();
    startWorld(WORLDS[i]);
  }));
  const map = app.querySelector('.map');
  requestAnimationFrame(() => {
    if (!map.isConnected || innerWidth > 700) return;
    const next = map.querySelector('.world-card.next') || map.querySelector('.world-card:not(:disabled)');
    if (next) next.scrollIntoView({ block: 'center', behavior: 'auto' });
  });
}

// ================= Le voyage dans une mer =================
let RUN = null;

const currentZone = () => document.querySelector('#zone-wrap .zone.current');
const stillHere = (run) => RUN === run && !!document.getElementById('stage');

function buildZone(z) {
  const world = RUN ? RUN.w.id : 'tropical';
  return h(`<div class="zone illustrated-zone world-${world}" style="--sky1:${z.sky[0]};--sky2:${z.sky[1]};--sea1:${z.sea[0]};--sea2:${z.sea[1]}">
    <div class="scene-ocean"></div><div class="scene-water-motion" aria-hidden="true"></div><div class="scene-light"></div>
    <img class="scenic-island scenic-left" src="assets/marine/${world}.webp" alt="" aria-hidden="true">
    <img class="scenic-island scenic-right" src="assets/marine/${world}.webp" alt="" aria-hidden="true">
    <div class="scene-sparkles" aria-hidden="true"></div>
  </div>`);
}

async function slideToZone(z) {
  const wrap = document.getElementById('zone-wrap');
  const old = currentZone();
  const next = buildZone(z);
  next.classList.add('incoming');
  wrap.append(next);
  void next.offsetWidth;
  wrap.classList.add('sailing');
  SFX.whoosh();
  old.classList.remove('current');
  old.classList.add('outgoing');
  next.classList.remove('incoming');
  next.classList.add('current');
  await sleep(1400);
  old.remove();
  wrap.classList.remove('sailing');
}

async function showStepBanner() {
  const last = RUN.index >= RUN.steps.length;
  const el = h(`<div class="room-banner">
    <small>${last ? '🎁 Dernière étape' : `Étape ${RUN.index + 1} sur ${RUN.steps.length}`}</small>
    <b>${last ? 'L’île au trésor' : RUN.steps[RUN.index].name}</b>
  </div>`);
  document.body.append(el);
  SFX.magic();
  await sleep(1700);
  el.remove();
}

function startWorld(w) {
  const run = {
    w,
    steps: buildSequence(S.mode, STEPS_PER_WORLD).map((type, i) => ({ type, name: w.steps[i] })),
    index: 0, stars: 0, streak: 0, busy: true, zone: ZONES[w.id][0],
  };
  RUN = run;
  setTheme(w);
  document.getElementById('decor').innerHTML = '';
  app.innerHTML = `<section class="voyage-screen marine-voyage theme-${w.id}">
    <div id="zone-wrap"></div>
    <header class="topbar">
      <button class="icon-btn" id="btn-map" title="Carte des mers" aria-label="Retour à la carte des mers">${nauticalIcon('compass')}</button>
      <div class="track" id="track"></div>
      <div id="streak"></div>
      <div class="star-count" id="run-stars">${nauticalIcon('star')} 0</div>
      <button class="icon-btn" id="btn-sound" title="Son"></button>
    </header>
    <div class="voyage-caption"><span>LE CARNET D’AVENTURE</span><b>${esc(w.name)}</b></div>
    <main class="stage away" id="stage"></main>
    <p class="sailing-status" id="sailing-status" role="status" aria-live="polite"></p>
    <div class="boat" id="boat"><span class="wake"></span>${boatSVG(S.boat)}</div>
  </section>`;
  const first = buildZone(run.zone);
  first.classList.add('current');
  document.getElementById('zone-wrap').append(first);

  const n = run.steps.length;
  document.getElementById('track').innerHTML =
    '<div class="track-line"><div class="track-fill"></div></div>' +
    run.steps.map((_, i) => `<div class="node" style="left:${(i / n) * 100}%">${i + 1}</div>`).join('') +
    `<div class="node chest-node" style="left:100%">🏝️</div><div class="track-avatar" style="left:0%">${boatSVG(S.boat)}</div>`;
  updateTrack(false);

  const soundBtn = document.getElementById('btn-sound');
  const paintSound = () => { soundBtn.innerHTML = nauticalIcon('sound'); soundBtn.setAttribute('aria-label', S.sound || S.voice ? 'Couper le son' : 'Activer le son'); soundBtn.classList.toggle('muted', !(S.sound || S.voice)); };
  paintSound();
  soundBtn.addEventListener('click', () => {
    const on = !(S.sound || S.voice);
    S.sound = on; S.voice = on; save(); paintSound();
    if (!on && 'speechSynthesis' in window) speechSynthesis.cancel();
    SFX.click();
  });
  document.getElementById('btn-map').addEventListener('click', confirmQuit);

  // le bateau arrive par le bas de l'écran
  const home = boatHome();
  placeBoat(home.x, -boatEl().offsetHeight);
  (async () => {
    await sleep(200);
    if (!stillHere(run)) return;
    await Promise.all([sailTo(home.x, home.b), showStepBanner()]);
    if (!stillHere(run)) return;
    run.busy = false;
    enterStep();
  })();
}

addEventListener('resize', () => {
  if (!RUN || RUN.busy || !boatEl() || boatEl().classList.contains('sailing')) return;
  const p = boatHome();
  placeBoat(p.x, p.b);
});

function updateTrack(move = true) {
  const n = RUN.steps.length;
  const track = document.getElementById('track');
  track.querySelectorAll('.node:not(.chest-node)').forEach((node, i) => {
    node.classList.toggle('done', i < RUN.index);
    node.classList.toggle('current', i === RUN.index);
    node.textContent = i < RUN.index ? '✓' : i + 1;
  });
  track.querySelector('.track-fill').style.width = `${(RUN.index / n) * 100}%`;
  const av = track.querySelector('.track-avatar');
  av.style.left = `${(RUN.index / n) * 100}%`;
  if (move) restart(av, 'sailing');
}

function updateRunStars() {
  const el = document.getElementById('run-stars');
  el.innerHTML = `${nauticalIcon('star')} ${RUN.stars}`;
  restart(el, 'bump');
}

function renderStreak() {
  const el = document.getElementById('streak');
  el.innerHTML = RUN.streak >= 2 ? `<div class="streak" title="${RUN.streak} étapes d’affilée sans erreur">🔥 ${RUN.streak}</div>` : '';
}

function confirmQuit() {
  SFX.click();
  const ov = h(`<div class="overlay" role="dialog" aria-modal="true" aria-label="Quitter le voyage"><div class="confirm-card"><div class="dialog-emblem">${nauticalIcon('compass')}</div>
    <h3>Retourner à la carte ?<br><small>Tu devras recommencer cette mer.</small></h3>
    <div class="row"><button class="btn go stay">Je continue ! 💪</button><button class="btn ghost leave">Oui, quitter</button></div>
  </div></div>`);
  ov.querySelector('.stay').addEventListener('click', () => ov.remove());
  ov.querySelector('.leave').addEventListener('click', () => {
    ov.remove();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    RUN = null;
    renderMap();
  });
  document.body.append(ov);
}

function enterStep() {
  const { w } = RUN;
  const step = RUN.steps[RUN.index];
  const T = ROOM_TYPES[step.type];
  const q = T.make(S.level);
  step.mistakes = 0;
  step.solved = false;

  const el = h(`<div class="room" data-subject="${T.subject}">
    <div class="exercise-meta"><span>${nauticalIcon(T.subject === 'lecture' ? 'book' : 'compass')} ${T.subject === 'lecture' ? 'L’escale des lettres' : 'L’escale des nombres'}</span><span>${RUN.index + 1} / ${RUN.steps.length}</span></div>
    <div class="guide">
      <span class="guide-face prof-face">${profSVG()}</span>
      <div class="bubble">
        <span class="bubble-text"></span>
        <button class="round-btn say" title="Réécouter" aria-label="Réécouter">${nauticalIcon('sound')}</button>
        <button class="round-btn hint" title="Montre-moi" aria-label="Montre-moi une aide">${nauticalIcon('star')}</button>
        <button class="why-btn hidden">🤔 Pourquoi ?</button>
      </div>
    </div>
    <div class="hint-box hidden"></div>
    <div class="explain hidden"></div>
    <div class="room-body"></div>
  </div>`);
  const stage = document.getElementById('stage');
  if (boatEl()) boatEl().classList.remove('answer-voyage');
  stage.replaceChildren(el);
  stage.classList.remove('away');
  scrollTo(0, 0);

  const bubble = el.querySelector('.bubble');
  const bubbleText = el.querySelector('.bubble-text');
  const hintBtn = el.querySelector('.hint');
  const hintBox = el.querySelector('.hint-box');
  const whyBtn = el.querySelector('.why-btn');
  const explainBox = el.querySelector('.explain');
  const say = (t) => { bubbleText.textContent = t; restart(bubble, 'bump'); };
  const instr = T.instruction(q);
  say(instr);
  RUN.greeted = true;
  const introTimer = setTimeout(() => { if (el.isConnected) speak(T.listen ? T.listen(q) : instr); }, 300);
  el.addEventListener('click', () => clearTimeout(introTimer), { once: true });

  el.querySelector('.say').addEventListener('click', () => speak(T.replay ? T.replay(q) : bubbleText.textContent, { force: true }));
  hintBtn.addEventListener('click', () => {
    const hi = T.hint(q);
    profMood(el, 'think', 4000);
    say(hi.show);
    speak(hi.say || hi.show);
    if (hi.html) { hintBox.innerHTML = hi.html; hintBox.classList.remove('hidden'); restart(hintBox, 'bump'); }
  });

  // « Pourquoi ? » : le prof explique la dernière erreur
  whyBtn.addEventListener('click', () => {
    const ex = T.explain(q, step.lastWrong);
    explainBox.innerHTML = `${ex.html}<button class="btn go got-it">J’ai compris ! 👍</button>`;
    explainBox.classList.remove('hidden');
    restart(explainBox, 'bump');
    whyBtn.classList.add('hidden');
    profMood(el, 'think', 0);
    say(ex.show);
    speak(ex.say);
    explainBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    explainBox.querySelector('.got-it').addEventListener('click', () => {
      api.clearWhy();
      SFX.click();
      profMood(el, 'happy');
      say('À toi de jouer ! 💪');
      speak('À toi de jouer !');
    });
  });

  const api = {
    say,
    clearWhy() {
      whyBtn.classList.add('hidden');
      explainBox.classList.add('hidden');
      explainBox.innerHTML = '';
    },
    fail(msg, wrong) {
      if (step.solved) return;
      step.mistakes++;
      RUN.streak = 0;
      renderStreak();
      SFX.pop();
      boatMood('oops');
      profMood(el, 'oops');
      const help = T.hint(q);
      say(msg || help.show);
      speak(msg || help.say || help.show);
      if (help.html) { hintBox.innerHTML = help.html; hintBox.classList.remove('hidden'); }
      hintBtn.classList.remove('hidden');
      if (T.explain && wrong !== undefined) {
        step.lastWrong = wrong;
        explainBox.classList.add('hidden');
        whyBtn.classList.remove('hidden');
        restart(whyBtn, 'bump');
      }
    },
    success() {
      if (step.solved) return;
      step.solved = true;
      api.clearWhy();
      const stars = 3; // On récompense la découverte, quel que soit le nombre d’essais.
      RUN.stars += stars;
      if (step.mistakes === 0) RUN.streak++;
      if (T.track) T.track(q, step.mistakes === 0);
      renderStreak();
      updateRunStars();
      SFX.good();
      boatMood('happy');
      profMood(el, 'happy', 0);
      Confetti.burst(innerWidth / 2, innerHeight * 0.45, 90);
      setTimeout(() => showBravo(stars), 700);
    },
  };
  T.render(el.querySelector('.room-body'), q, api);
}

function showBravo(stars) {
  const isLast = RUN.index === RUN.steps.length - 1;
  const msg = pick(BRAVO).replace(' {name}', S.name ? ` ${S.name}` : '');
  const sub = 'Tu as appris en jouant. Bravo !';
  const ov = h(`<div class="overlay" role="dialog" aria-modal="true" aria-label="Escale réussie"><div class="bravo-card"><span class="eyebrow">UNE NOUVELLE DÉCOUVERTE !</span>
    <div class="bravo-av">${boatSVG(S.boat, 'happy')}</div>
    <h2 class="bravo-title">${esc(msg)}</h2>
    <div class="bravo-stars">${[0, 1, 2].map((i) => `<span class="bstar ${i < stars ? '' : 'off'}" style="--d:${0.25 + i * 0.28}s">${nauticalIcon('star')}</span>`).join('')}</div>
    <p class="bravo-sub">${sub} ${esc(profLine('bravo'))}</p>
    <span class="bravo-prof">${profSVG('happy')}</span>
    ${RUN.streak >= 3 ? `<p class="bravo-streak">🔥 ${RUN.streak} étapes d’affilée sans erreur !</p>` : ''}
    <button class="btn big go pulse next">${isLast ? 'Vers l’île au trésor ! 🏝️' : 'On met les voiles ! ⛵'}</button>
  </div></div>`);
  document.body.append(ov);
  for (let i = 0; i < stars; i++) setTimeout(() => SFX.star(i), 300 + i * 280);
  speak(msg);
  ov.querySelector('.next').addEventListener('click', () => {
    ov.remove();
    goToNextStep();
  });
}

async function goToNextStep() {
  const run = RUN;
  if (run.busy) return;
  run.busy = true;
  SFX.click();
  document.getElementById('stage').classList.add('away');
  await sleep(300);
  if (!stillHere(run)) return;
  await sailHome();
  if (!stillHere(run)) return;
  run.index++;
  updateTrack();
  const last = run.index >= run.steps.length;
  run.zone = last ? TREASURE_ZONE : ZONES[run.w.id][run.index];
  boatEl().classList.add('cruising');
  await Promise.all([slideToZone(run.zone), sleep(500).then(showStepBanner)]);
  if (!stillHere(run)) return;
  boatEl().classList.remove('cruising');
  run.busy = false;
  if (last) renderTreasure();
  else enterStep();
}

// ================= L'île au trésor =================
function renderTreasure() {
  const { w } = RUN;
  const max = RUN.steps.length * 3;
  const land = LANDS.sand;
  const el = h(`<div class="treasure">
    <span class="eyebrow treasure-kicker">LE TRÉSOR DU VOYAGE</span><h2>Une belle aventure,<br>un trésor bien mérité !</h2>
    <p class="tap-msg">Touche le coffre pour l’ouvrir 👇</p>
    <div class="treasure-isle" style="--g1:${land.g1};--g2:${land.g2};--top:${land.top}">
      <img class="treasure-shore" src="assets/marine/${w.id}.webp" alt="" aria-hidden="true">
      <button class="chest idle" aria-label="Ouvrir le coffre">
        <img class="chest-art chest-closed" src="assets/marine/chest-closed.webp" alt="" width="1448" height="1086"><img class="chest-art chest-open" src="assets/marine/chest-open.webp" alt="" width="1448" height="1086"><span class="chest-rays"></span>
        <span class="chest-reward">${w.reward}</span>
        <span class="chest-lid"></span>
        <span class="chest-body"><span class="chest-lock">🔒</span></span>
      </button>
      <span class="ti-land"></span>
    </div>
    <div class="treasure-result hidden"></div>
  </div>`);
  el.querySelector('.tap-msg').insertAdjacentHTML('afterend', profSays('Le trésor est là ! Vas-y, ouvre-le !', 'think', 'treasure-prof'));
  const stage = document.getElementById('stage');
  if (boatEl()) boatEl().classList.remove('answer-voyage');
  stage.replaceChildren(el);
  stage.classList.remove('away');
  scrollTo(0, 0);
  speak('Tu es arrivée sur l’île au trésor ! Touche le coffre pour l’ouvrir !');
  RUN.busy = true;
  sleep(400).then(() => sailToIsland(el.querySelector('.treasure-isle'), 0.85));

  const chest = el.querySelector('.chest');
  chest.addEventListener('click', () => {
    if (chest.classList.contains('open')) return;
    chest.classList.remove('idle');
    chest.classList.add('open');
    el.querySelector('.tap-msg').textContent = `Tu as gagné ${w.rewardName} !`;
    el.querySelector('.treasure-prof .bubble-text').textContent = profLine('treasure');
    profMood(el, 'happy', 0);
    SFX.win();
    boatMood('happy');
    setTimeout(() => boatMood('happy'), 1300);
    Confetti.burst(innerWidth / 2, innerHeight * 0.5, 160);
    setTimeout(() => Confetti.rain(180), 400);

    const wIdx = WORLDS.indexOf(w);
    const wasDone = !!(S.worlds[w.id] || {}).done;
    const prev = (S.worlds[w.id] || {}).best || 0;
    S.worlds[w.id] = { done: true, best: Math.max(prev, RUN.stars) };
    save();
    const next = WORLDS[wIdx + 1];
    const unlockedNow = next && !wasDone;

    speak(`Bravo ${S.name || ''} ! Tu as gagné ${w.rewardName} et ${RUN.stars} étoiles !`);
    const res = el.querySelector('.treasure-result');
    res.innerHTML = `
      <div class="card treasure-record"><span class="eyebrow">DANS TON CARNET DE VOYAGE</span>
        <div class="total">${nauticalIcon('star')} ${RUN.stars} <small>/ ${max}</small></div>
        ${RUN.stars > prev && wasDone ? '<div>🏅 Nouveau record !</div>' : ''}
        ${unlockedNow ? `<div>🔓 Nouvelle mer ouverte : ${next.emoji} ${next.name} !</div>` : ''}
        ${!next && !wasDone ? '<div>🏆 Tu as exploré toutes les mers ! Capitaine !</div>' : ''}
      </div>
      <div class="row">
        <button class="btn ghost again">↺ Refaire ce voyage</button>
        <button class="btn go big pulse to-map">Carte des mers 🗺️</button>
      </div>`;
    setTimeout(() => res.classList.remove('hidden'), 1300);
    res.querySelector('.again').addEventListener('click', () => { SFX.click(); startWorld(w); });
    res.querySelector('.to-map').addEventListener('click', () => { SFX.good(); RUN = null; renderMap(); });
  });
}

// ================= Démarrage =================
registerPreschoolRooms();
installArtwork();
renderHome();
