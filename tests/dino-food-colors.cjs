const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8765');
    await page.locator('.parent-corner > summary').click();
    await page.locator('[data-game-theme-choice="dinosaurs"]').click();
    const colors=await page.locator('[data-dino-color]').evaluateAll(buttons=>buttons.map(b=>b.dataset.dinoColor));
    const pictures=[];
    for(const color of colors) {
      await page.locator(`[data-dino-color="${color}"]`).click();
      await page.waitForFunction(()=>document.querySelector('.dino-preview .dino-illustration').complete);
      assert.equal(await page.evaluate(()=>S.dino.body),color);
      const image=page.locator('.dino-preview .dino-illustration');
      pictures.push((await image.screenshot()).toString('base64'));
    }
    // Les pixels doivent changer, pas seulement le cadre de sélection ou la sauvegarde.
    assert.equal(new Set(pictures).size,5);
    await page.screenshot({path:'preview-dino-color-settings.png',fullPage:true});
    await page.reload();
    assert.equal(await page.evaluate(()=>S.dino.body),colors.at(-1));
    await page.locator('.parent-corner > summary').click();
    assert.equal((await page.locator('.dino-preview .dino-illustration').screenshot()).toString('base64'),pictures.at(-1));
    for(const width of [390,1440]) {
      await page.setViewportSize({width,height:900});
      await page.evaluate(()=>{S.sound=false;S.voice=false;S.dino.body='#76b65c';S.level='GS';startWorld(WORLDS[0]);});
      await page.waitForSelector('.room');
      for(const type of ['petiteLettre','petitCompte']) {
        await page.evaluate(type=>{RUN.index=0;RUN.steps[0].type=type;ROOM_TYPES[type].make=()=>type==='petiteLettre'?{answer:'T',options:['X','T','H'],lowercase:false}:{n:3,max:5};enterStep();},type);
        await page.locator('.room').evaluate(async e=>{await Promise.allSettled(e.getAnimations().map(a=>a.finished));});
        assert.ok(await page.locator('#boat').evaluate(e=>Number(getComputedStyle(e).zIndex)>Number(getComputedStyle(document.querySelector('.choice-food')).zIndex)));
        const food=page.locator('.choice-food img');
        assert.equal(await food.count(),3);
        for(const img of await food.all()) assert.ok(await img.evaluate(e=>e.complete&&e.naturalWidth>0));
        assert.equal(await page.locator('.little-choice').first().evaluate(e=>getComputedStyle(e).backgroundImage),'none');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        // Reproduire une superposition : repas derrière le personnage, panneau devant.
        const layers=await page.evaluate(()=>{
          const actor=boatEl(),face=document.querySelector('.letter-face'),food=document.querySelector('.choice-food');
          const f=face.getBoundingClientRect(),r=food.getBoundingClientRect();
          placeBoat(f.left,innerHeight-(f.top+100));actor.style.pointerEvents='auto';
          const labelHit=document.elementFromPoint(f.left+f.width/2,f.top+f.height/2);
          const foodY=Math.max(r.top+3,f.top+87);
          const foodHit=document.elementFromPoint(f.left+f.width/2,foodY);
          actor.style.pointerEvents='';
          return {label:labelHit===face,actor:!!foodHit.closest('#boat')};
        });
        assert.deepEqual(layers,{label:true,actor:true});
        await page.evaluate(()=>sailHome());
        if(width===390&&type==='petiteLettre') await page.screenshot({path:'preview-dino-food.png',fullPage:true});
        const target=type==='petiteLettre'?'T':'3';
        const labels=await page.locator('.little-choice').allTextContents();
        await page.locator('.little-choice').nth(labels.indexOf(target)).click();
        await page.waitForFunction(()=>document.querySelector('#boat').classList.contains('eating'));
        assert.equal(await page.locator('.food-eaten').count(),1);
        assert.equal(await page.evaluate(()=>RUN.steps[0].solved),false);
        assert.ok(await page.evaluate(()=>{
          const d=document.querySelector('#boat').getBoundingClientRect(),f=document.querySelector('.food-eaten .letter-face').getBoundingClientRect();return d.top>f.bottom;
        }));
        await page.waitForFunction(()=>RUN.steps[0].solved);
        const hidden=await page.locator('.food-eaten .choice-food img').evaluate(e=>Number(getComputedStyle(e).opacity));
        assert.ok(hidden<.05);
        assert.equal(await page.locator('#boat').evaluate(e=>e.classList.contains('eating')),false);
        await page.waitForSelector('.overlay .next');
        await page.evaluate(()=>{document.querySelector('.overlay').remove();});
        await page.evaluate(()=>sailHome());
        assert.ok(await page.locator('#boat').evaluate(e=>Number(getComputedStyle(e).zIndex)>Number(getComputedStyle(document.querySelector('.choice-food')).zIndex)));
      }
      await page.evaluate(()=>{RUN=null;renderHome();});
    }
    assert.deepEqual(errors,[]);
    console.log('OK: 5 visibly different dino colors persist; food replaces answer volcanoes; dino stays in front while idle and moving; food is eaten after arrival; letters remain readable on mobile/desktop.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
