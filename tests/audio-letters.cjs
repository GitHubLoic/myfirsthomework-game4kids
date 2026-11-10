const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8765');
    const clues=await page.evaluate(()=>LETTER_CLUES);
    assert.equal(Object.keys(clues).length,26);
    for(const [letter,[word,picture]] of Object.entries(clues)) {
      assert.equal(word.normalize('NFD')[0].toUpperCase(),letter);
      assert.ok(fs.existsSync(`assets/pictures/${picture}.svg`));
    }
    await page.evaluate(()=>{S.sound=false;S.voice=false;S.level='GS';startWorld(WORLDS[0]);});
    await page.waitForSelector('.room');
    for(const lowercase of [false,true]) {
      await page.evaluate(lowercase=>{
        const type=lowercase?'petitePaire':'petiteLettre';
        ROOM_TYPES[type].make=()=>({answer:'T',options:['X','T','H'],lowercase});
        RUN.steps[0].type=type;enterStep();
        window.realSpeak=speak;window.utterances=[];
        window.speak=(text,options)=>{window.utterances.push({text,options});};
      },lowercase);
      assert.equal(await page.locator('.little-model .little-letter').count(),0);
      assert.equal(await page.locator('.letter-clue-picture').getAttribute('alt'),'tortue');
      assert.equal(await page.locator('.letter-clue-picture').evaluate(e=>e.complete&&e.naturalWidth>0),true);
      assert.equal(await page.locator('.bubble-text').innerText(),'Écoute et retrouve la lettre sur une île.');
      await page.waitForTimeout(350);
      assert.match(await page.evaluate(()=>utterances.at(-1).text),/té, comme au début de tortue/);
      await page.locator('.hear-letter').click();
      let spoken=await page.evaluate(()=>utterances.at(-1));
      assert.equal(spoken.text,'tortue');
      assert.equal(spoken.options.force,true);
      await page.locator('.say').click();
      assert.equal(await page.evaluate(()=>utterances.at(-1).text),'té');
      await page.evaluate(()=>{window.speak=window.realSpeak;});
      await page.waitForTimeout(650);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      assert.ok(await page.locator('.letter-face').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=50));
      const centering=await page.locator('.letter-face').first().evaluate(e=>{
        const parent=e.parentElement.getBoundingClientRect(),r=e.getBoundingClientRect(),tile=getComputedStyle(e.parentElement,'::before');
        const height=parseFloat(tile.height)+parseFloat(tile.borderTopWidth)+parseFloat(tile.borderBottomWidth);
        return {x:Math.abs(r.x+r.width/2-(parent.x+parent.width/2)),y:Math.abs(r.y+r.height/2-(parent.y+parseFloat(tile.top)+height/2))};
      });
      assert.ok(centering.x<1&&centering.y<1);
      if(!lowercase) await page.screenshot({path:'preview-audio-tortue.png',fullPage:true});
      await page.locator('.hint').click();
      assert.ok(await page.locator('.hint-box .little-letter').isVisible());
      assert.match(await page.locator('.hint-box').innerText(),lowercase?/T → t/:/T/);
      await page.evaluate(()=>{window.speak=(text)=>{window.utterances.push({text});};});
      await page.locator('.say').click();
      assert.equal(await page.evaluate(()=>utterances.at(-1).text),'té');
      await page.evaluate(()=>{window.speak=window.realSpeak;});
    }
    assert.deepEqual(errors,[]);
    console.log('OK: 26 word clues and local icons; audio replay; no visible answer before help; centered letter tiles; T/t with tortue.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
