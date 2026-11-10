'use strict';

// La lettre est entendue et associée à une image ; sa forme est révélée uniquement par l’aide.
const PRESCHOOL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LETTER_NAMES = ['a', 'bé', 'cé', 'dé', 'e', 'effe', 'gé', 'ache', 'i', 'ji', 'ka', 'elle', 'emme', 'enne', 'o', 'pé', 'ku', 'erre', 'esse', 'té', 'u', 'vé', 'double vé', 'iks', 'i grec', 'zède'];
const letterName = (letter) => LETTER_NAMES[PRESCHOOL_ALPHABET.indexOf(letter)];
const smallNumber = (n) => ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'][n];

const LETTER_CLUES = {
  A: ['abeille', '1f41d'], B: ['bateau', '26f5'], C: ['carotte', '1f955'],
  D: ['dauphin', '1f42c'], E: ['escargot', '1f40c'], F: ['fleur', '1f338'],
  G: ['grenouille', '1f438'], H: ['hibou', '1f989'], I: ['île', '1f3dd'],
  J: ['jus', '1f9c3'], K: ['koala', '1f428'], L: ['lion', '1f981'],
  M: ['mouton', '1f411'], N: ['nuage', '1f327'], O: ['ours', '1f43b'],
  P: ['pomme', '1f34e'], Q: ['quille', '1f3b3'], R: ['renard', '1f98a'],
  S: ['soleil', '2600'], T: ['tortue', '1f422'], U: ['usine', '1f3ed'],
  V: ['vache', '1f42e'], W: ['wagon', '1f683'], X: ['xylophone', 'xylophone'],
  Y: ['yoyo', '1fa80'], Z: ['zèbre', '1f993'],
};
const letterPrompt = (q) => `Écoute : la lettre ${letterName(q.answer)}, comme au début de ${LETTER_CLUES[q.answer][0]}. Retrouve ${q.lowercase ? 'la lettre minuscule' : 'la lettre'} sur une île.`;

// Le choix est une destination : on attend l’arrivée avant de valider la réponse.
function wirePreschoolVoyage(choices, answer, api, onSuccess, onWrong) {
  const run = RUN;
  let busy = false;
  let solved = false;
  const buttons = [...choices.querySelectorAll('button')];
  buttons.forEach((button) => button.addEventListener('click', async () => {
    if (busy || solved || !stillHere(run)) return;
    busy = true;
    buttons.forEach((b) => { b.disabled = true; });
    choices.setAttribute('aria-busy', 'true');
    const correct = button.textContent === String(answer);
    const boat = boatEl();
    boat.classList.add('answer-voyage');
    button.classList.add('sailing-to');
    const status = document.getElementById('sailing-status');
    if (status) status.textContent = 'Le bateau rejoint l’île choisie.';
    try {
      await sailToIsland(button, correct ? 1 : 0.65);
      if (!stillHere(run)) return;
      if (correct) {
        solved = true;
        button.classList.add('little-correct');
        onSuccess();
        api.success();
      } else {
        onWrong();
        await sleep(350);
        if (!stillHere(run)) return;
        await sailHome();
      }
    } finally {
      busy = false;
      choices.removeAttribute('aria-busy');
      button.classList.remove('sailing-to');
      if (stillHere(run)) {
        buttons.forEach((b) => { b.disabled = solved; });
        if (!solved) boat.classList.remove('answer-voyage');
        if (status) status.textContent = correct ? 'Le bateau est arrivé !' : 'Le bateau est revenu. Essaie une autre île.';
      }
    }
  }));
}

function registerPreschoolRooms() {
  const letters = (lowercase) => ({
    subject: 'lecture',
    make(level) {
      const answer = pick(PRESCHOOL_ALPHABET);
      const options = shuffle([answer, ...shuffle(PRESCHOOL_ALPHABET.filter((l) => l !== answer)).slice(0, level === 'GS' ? 2 : 1)]);
      return { answer, options, lowercase };
    },
    instruction: () => 'Écoute et retrouve la lettre sur une île.',
    listen: letterPrompt,
    replay: (q) => letterName(q.answer),
    hint: (q) => ({
      show: `Voici une aide : ${q.answer}${q.lowercase ? ` et ${q.answer.toLowerCase()}` : ''}. Retrouve cette lettre sur une île.`,
      say: `C'est la lettre ${letterName(q.answer)}. Regarde le modèle, puis retrouve la même forme.`,
      html: `<div class="little-letter">${q.lowercase ? `${q.answer} → ${q.answer.toLowerCase()}` : q.answer}</div>`,
    }),
    render(body, q, api) {
      const [word, picture] = LETTER_CLUES[q.answer];
      body.append(h(`<div class="little-model sound-clue"><span>Écoute bien…</span><button class="hear-letter clue-listen" type="button" aria-label="Écouter le mot repère"><img class="letter-clue-picture" src="assets/pictures/${picture}.svg" alt="${word}" width="100" height="100"><span class="clue-listen-label">${nauticalIcon('sound')} Écouter le mot</span></button><small>Comme au début de…</small></div>`));
      body.querySelector('.hear-letter').onclick = () => speak(word, { force: true });
      const choices = h('<div class="little-choices" role="group" aria-label="Choisis la lettre entendue"></div>');
      q.options.forEach((letter) => {
        const display = q.lowercase ? letter.toLowerCase() : letter;
        choices.append(h(`<button class="little-choice little-letter" type="button" aria-label="Lettre ${letter}"><span class="letter-face">${display}</span></button>`));
      });
      wirePreschoolVoyage(choices, q.lowercase ? q.answer.toLowerCase() : q.answer, api,
        () => speak(`Oui ! La lettre ${letterName(q.answer)} !`),
        () => {
          api.fail(`Écoutons encore : ${letterName(q.answer)}, comme au début de ${word}. Regarde la lettre dans l’aide.`);
          choices.querySelectorAll('button').forEach((b) => b.classList.toggle('little-help', b.textContent === (q.lowercase ? q.answer.toLowerCase() : q.answer)));
        });
      body.append(choices);
    },
  });
  ROOM_TYPES.petiteLettre = letters(false);
  ROOM_TYPES.petitePaire = letters(true);

  const numberQuestion = (level) => ({ n: rand(1, level === 'GS' ? 10 : 5), max: level === 'GS' ? 10 : 5 });
  const countHint = (q) => ({
    show: `Touche chaque coquillage une seule fois. Le dernier nombre dit combien il y en a : ${q.n}.`,
    say: `Comptons ensemble. ${Array.from({ length: q.n }, (_, i) => smallNumber(i + 1)).join(', ')}. Il y a ${smallNumber(q.n)} coquillages.`,
    html: `<div class="little-count-model">${Array.from({ length: q.n }, (_, i) => `<span>🐚<b>${i + 1}</b></span>`).join('')}</div><p>Il y en a <b>${q.n}</b> en tout.</p>`,
  });
  ROOM_TYPES.petitCompte = {
    subject: 'maths', make: numberQuestion,
    instruction: () => 'Combien de coquillages ? Touche les coquillages pour compter.',
    replay: () => 'Combien de coquillages ?',
    hint: countHint,
    render(body, q, api) {
      const shellBox = h('<div class="little-shells" role="group" aria-label="Coquillages à compter"></div>');
      const counted = new Set();
      const status = h('<p class="little-status" role="status" aria-live="polite">Touche un coquillage pour commencer.</p>');
      for (let i = 0; i < q.n; i++) {
        const button = h(`<button type="button" class="little-shell" aria-label="Coquillage ${i + 1}, à compter" aria-pressed="false">🐚<b></b></button>`);
        button.onclick = () => {
          if (RUN.steps[RUN.index].solved || counted.has(i)) return;
          counted.add(i);
          button.classList.add('counted');
          button.setAttribute('aria-pressed', 'true');
          button.setAttribute('aria-label', `Coquillage compté : ${counted.size}`);
          button.querySelector('b').textContent = counted.size;
          const all = counted.size === q.n;
          status.textContent = all ? `${q.n} coquillages en tout ! Choisis ${q.n}.` : `${counted.size} coquillage${counted.size > 1 ? 's' : ''} compté${counted.size > 1 ? 's' : ''}. Continue !`;
          speak(all ? `${smallNumber(q.n)}. Il y a ${smallNumber(q.n)} coquillages en tout.` : smallNumber(counted.size));
        };
        shellBox.append(button);
      }
      body.append(shellBox, status);
      const options = shuffle([q.n, ...shuffle(Array.from({ length: q.max }, (_, i) => i + 1).filter((n) => n !== q.n)).slice(0, S.level === 'GS' ? 2 : 1)]);
      const choices = h('<div class="little-choices" role="group" aria-label="Combien en tout ?"></div>');
      options.forEach((n) => choices.append(h(`<button class="little-choice" type="button" aria-label="${n} coquillages"><span class="letter-face">${n}</span></button>`)));
      wirePreschoolVoyage(choices, q.n, api,
        () => speak(`Oui, ${smallNumber(q.n)} coquillages en tout !`),
        () => {
          api.fail();
          choices.querySelectorAll('button').forEach((b) => b.classList.toggle('little-help', Number(b.textContent) === q.n));
        });
      body.append(choices);
    },
  };
  ROOM_TYPES.petiteCollection = {
    subject: 'maths', make: numberQuestion,
    replay: (q) => smallNumber(q.n),
    instruction: (q) => `Prépare ${smallNumber(q.n)} coquillages dans le bateau. Touche les places pour les remplir.`,
    hint: (q) => ({
      show: `Il faut ${q.n} coquillages. Remplis une case pour chaque coquillage du modèle.`,
      say: `Il faut ${smallNumber(q.n)} coquillages. Remplis ${smallNumber(q.n)} cases, puis touche le bouton du bateau.`,
      html: countHint(q).html,
    }),
    render(body, q, api) {
      body.append(h(`<div class="little-model"><span>Ton trésor à embarquer</span><strong class="little-target">${q.n}</strong><div class="little-count-model" aria-label="Modèle : ${q.n} coquillages">${Array.from({ length: q.n }, () => '<span>🐚</span>').join('')}</div></div>`));
      const slots = h('<div class="little-slots" role="group" aria-label="Remplis ton bateau"></div>');
      const selected = new Set();
      let solved = false;
      const status = h('<p class="little-status" role="status" aria-live="polite">Ton bateau contient 0 coquillage.</p>');
      for (let i = 0; i < q.max; i++) {
        const button = h(`<button class="little-slot" type="button" aria-label="Case ${i + 1}, ajouter un coquillage" aria-pressed="false"><span aria-hidden="true">＋</span></button>`);
        button.onclick = () => {
          if (solved) return;
          if (selected.has(i)) selected.delete(i); else selected.add(i);
          const on = selected.has(i);
          button.innerHTML = `<span aria-hidden="true">${on ? '🐚' : '＋'}</span>`;
          button.classList.toggle('filled', on);
          button.setAttribute('aria-pressed', String(on));
          button.setAttribute('aria-label', `Case ${i + 1}, ${on ? 'retirer le' : 'ajouter un'} coquillage`);
          status.textContent = `Ton bateau contient ${selected.size} coquillage${selected.size > 1 ? 's' : ''}. Objectif : ${q.n}.`;
          speak(`${smallNumber(selected.size)} coquillage${selected.size > 1 ? 's' : ''}`);
        };
        slots.append(button);
      }
      const check = h(`<button class="btn go little-check" type="button">${nauticalIcon('anchor')} En route !</button>`);
      check.onclick = () => {
        if (solved) return;
        if (selected.size === q.n) {
          solved = true;
          slots.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          check.disabled = true;
          speak(`Bravo, tu as préparé ${smallNumber(q.n)} coquillages !`);
          api.success();
        } else {
          const diff = Math.abs(q.n - selected.size);
          api.fail(selected.size < q.n ? `Ajoute encore ${diff} coquillage${diff > 1 ? 's' : ''}.` : `Retire ${diff} coquillage${diff > 1 ? 's' : ''}. Touche une case pleine.`);
        }
      };
      body.append(slots, status, check);
    },
  };
}
