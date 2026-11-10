const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8765');
  await page.waitForSelector('.go-btn');
  assert.equal(await page.evaluate(() => S.level), 'MS');
  await page.locator('.parent-corner > summary').click();
  await page.locator('#name').fill('Camille');
  await page.reload();
  assert.equal(await page.locator('#name').inputValue(), 'Camille');
  const generated = await page.evaluate(() => {
    const samples = [];
    for (const level of ['MS', 'GS']) {
      S.level = level;
      for (let i = 0; i < 100; i++) {
        for (const mode of ['lecture', 'maths', 'mix']) {
          const seq = buildSequence(mode, 6);
          samples.push({level, mode, seq, qs: seq.map(t => ({ type: t, q: ROOM_TYPES[t].make(level) }))});
        }
      }
    }
    S.level = 'MS'; S.sound = false; S.voice = false;
    return samples;
  });
  for (const sample of generated) for (const {type, q} of sample.qs) {
    if (sample.mode === 'maths') assert.ok(type === 'petitCompte' || type === 'petiteCollection');
    if (sample.mode === 'lecture') assert.ok(type === 'petiteLettre' || type === 'petitePaire');
    if (sample.level === 'MS') assert.notEqual(type, 'petitePaire');
    if (q.n) assert.ok(q.n >= 1 && q.n <= (sample.level === 'GS' ? 10 : 5));
    if (q.answer) { assert.ok(q.options.includes(q.answer)); assert.equal(new Set(q.options).size, q.options.length); }
  }
  // Exercise the real room, help, mistakes and duplicate success protection.
  for (const level of ['MS', 'GS']) {
    await page.evaluate(level => { S.level = level; startWorld(WORLDS[0]); }, level);
    await page.waitForSelector('.room');
    for (const type of ['petiteLettre', 'petitePaire', 'petitCompte', 'petiteCollection']) {
      await page.evaluate(type => { RUN.steps[0].type = type; RUN.index = 0; enterStep(); }, type);
      await page.locator('.hint').click();
      assert.ok(await page.locator('.hint-box').isVisible());
      if (type.startsWith('petite') && type !== 'petiteCollection') {
        assert.equal(await page.locator('.little-model .little-letter').count(), 0);
        const model = (await page.locator('.hint-box .little-letter').innerText()).trim().slice(-1);
        const wrong = page.locator('.little-choice').filter({hasText: /./});
        const labels = await wrong.allTextContents();
        await wrong.nth(labels.findIndex(l => l !== model)).click();
        assert.ok(await page.locator('.little-help').isVisible());
        await page.locator('.little-help').click();
      } else if (type === 'petitCompte') {
        const shells = page.locator('.little-shell');
        const n = await shells.count();
        await shells.first().click(); await shells.first().click();
        assert.equal(await page.locator('.little-shell.counted').count(), 1);
        for (let i = 1; i < n; i++) await shells.nth(i).click();
        const choices = page.locator('.little-choice');
        const values = await choices.allTextContents();
        await choices.nth(values.findIndex(l => Number(l) !== n)).click();
        await choices.nth(values.findIndex(l => Number(l) === n)).click();
      } else {
        const n = Number(await page.locator('.little-target').innerText());
        await page.locator('.little-check').click();
        assert.match(await page.locator('.bubble-text').innerText(), /Ajoute/);
        for (let i = 0; i < n; i++) await page.locator('.little-slot').nth(i).click();
        await page.locator('.little-check').click();
      }
      assert.equal(await page.evaluate(() => RUN.steps[0].solved), true);
      await page.waitForSelector('.overlay .next');
      assert.equal(await page.locator('.overlay').count(), 1);
      await page.evaluate(() => document.querySelector('.overlay').remove());
    }
    await page.evaluate(() => { RUN = null; renderHome(); });
  }
  // Un voyage entier : les six escales, le coffre, la sauvegarde et la mer suivante.
  await page.evaluate(() => { S.level='MS'; S.mode='mix'; startWorld(WORLDS[0]); });
  await page.waitForSelector('.room');
  for (let i=0; i<6; i++) {
    await page.evaluate(() => {
      const type = RUN.steps[RUN.index].type;
      if (type === 'petiteLettre') {
        const word = document.querySelector('.letter-clue-picture').alt;
        const letter = Object.entries(LETTER_CLUES).find(([, clue]) => clue[0] === word)[0];
        [...document.querySelectorAll('.little-choice')].find(b => b.textContent === letter).click();
      } else if (type === 'petitCompte') {
        const n = document.querySelectorAll('.little-shell').length;
        [...document.querySelectorAll('.little-choice')].find(b => Number(b.textContent) === n).click();
      } else {
        const n = Number(document.querySelector('.little-target').textContent);
        [...document.querySelectorAll('.little-slot')].slice(0,n).forEach(b => b.click());
        document.querySelector('.little-check').click();
      }
    });
    await page.locator('.overlay .next').click();
    await page.waitForFunction(i => RUN.index === i+1 && (i === 5 || !RUN.busy), i);
  }
  await page.locator('.chest').click({force:true});
  await page.waitForSelector('.treasure-record');
  assert.equal(await page.evaluate(() => S.worlds.tropical.done), true);
  assert.equal(await page.evaluate(() => S.worlds.tropical.best), 18);
  assert.equal(await page.evaluate(() => isUnlocked(1)), true);
  await page.reload();
  assert.equal(await page.evaluate(() => S.worlds.tropical.best), 18);
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'preview-home.png',fullPage:true});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.evaluate(() => { S.level='GS'; startWorld(WORLDS[0]); });
  await page.waitForSelector('.room');
  await page.evaluate(() => { RUN.steps[0].type='petiteCollection'; enterStep(); });
  await page.waitForTimeout(650);
  await page.screenshot({path:'preview-count.png',fullPage:true});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('OK: MS/GS generation, subject isolation, guided letters, touch counting, collections, rewards, storage and mobile layout.');
})().catch(e => { console.error(e); process.exit(1); });
