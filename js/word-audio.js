'use strict';

// Groupes d’attaque pour éviter de proposer des débuts indifférenciables.
const LETTER_INITIAL_SOUNDS = {
  A:'a', B:'b', C:'k', D:'d', E:'e_ouvert', F:'f', G:'g', H:'i',
  I:'i', J:'j', K:'k', L:'l', M:'m', N:'n', O:'o_ouvert', P:'p', Q:'k',
  R:'r', S:'s', T:'t', U:'y', V:'v', W:'v', X:'gz', Y:'semi_j', Z:'z',
};
const WordAudio = (() => {
  const buffers = new Map();
  let source = null;
  let generation = 0;
  let status = 'idle';
  let currentLetter = null;
  function stop() {
    generation++;
    if (source) {
      source.onended = null;
      try { source.stop(); } catch (_) { /* déjà terminé */ }
      source.disconnect(); source = null;
    }
    status = 'idle'; currentLetter = null;
  }
  async function play(letter, { force = false, whole = false, onError } = {}) {
    if (!force && !S.voice) return false;
    stop();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const key = `${letter}${whole ? '' : '-start'}`;
    const request = generation;
    status = 'loading'; currentLetter = letter;
    try {
      if (!Object.hasOwn(LETTER_INITIAL_SOUNDS, letter)) throw new Error('Mot inconnu');
      const ctx = SFX.ctx();
      if (!ctx) throw new Error('Lecture audio indisponible');
      await ctx.resume();
      if (!buffers.has(key)) {
        const pending = fetch(`assets/words/${key}.wav`).then(response => {
          if (!response.ok) throw new Error('Fichier son indisponible');
          return response.arrayBuffer();
        }).then(bytes => ctx.decodeAudioData(bytes));
        buffers.set(key, pending);
        pending.catch(() => buffers.delete(key));
      }
      const buffer = await buffers.get(key);
      if (request !== generation) return false;
      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = false;
      source.connect(ctx.destination);
      source.onended = () => {
        if (request !== generation) return;
        source.disconnect(); source = null;
        status = 'idle'; currentLetter = null;
      };
      status = 'playing';
      source.start();
      return true;
    } catch (error) {
      if (request === generation) {
        status = 'error'; currentLetter = null;
        if (onError) onError('Le son n’a pas pu être lu. Réessaie.');
      }
      return false;
    }
  }
  addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  return { play, stop, get status() { return status; }, get currentLetter() { return currentLetter; } };
})();
