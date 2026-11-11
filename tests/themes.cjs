const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const failed=[];page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
    await page.goto('http://127.0.0.1:8765');
    // Une sauvegarde de la version précédente doit rester lisible.
    await page.evaluate(()=>localStorage.setItem(STORE_KEY,JSON.stringify({name:'Alex',level:'GS',sound:false,voice:false,boat:{hull:'#3a86ff',sail:'#ffffff',pattern:'pois'},worlds:{tropical:{done:true,best:18}}})));
    await page.reload();
    assert.equal(await page.evaluate(()=>S.theme),'islands');
    assert.equal(await page.evaluate(()=>S.dino.body),'#76b65c');
    await page.locator('.parent-corner > summary').click();
    await page.locator('[data-game-theme-choice="dinosaurs"]').click();
    assert.equal(await page.locator('body').getAttribute('data-game-theme'),'dinosaurs');
    assert.match(await page.title(),/Dinos/);
    assert.equal(await page.locator('.boat-settings').isVisible(),false);
    assert.equal(await page.locator('.dino-settings').isVisible(),true);
    await page.locator('[data-dino-color="#b08ad0"]').click();
    assert.equal(await page.evaluate(()=>S.dino.body),'#b08ad0');
    await page.screenshot({path:'preview-theme-settings.png',fullPage:true});
    await page.reload();
    assert.equal(await page.evaluate(()=>S.theme),'dinosaurs');
    assert.equal(await page.evaluate(()=>S.dino.body),'#b08ad0');
    assert.equal(await page.evaluate(()=>S.name),'Alex');
    assert.equal(await page.evaluate(()=>S.boat.hull),'#3a86ff');
    assert.equal(await page.evaluate(()=>totalStars()),18);
    await page.locator('.go-btn').first().click();
    assert.equal(await page.locator('.world-card').count(),5);
    assert.equal(await page.locator('.world-card img[src*="dinosaurs/volcano"]').count(),5);
    assert.equal(await page.locator('.chart-boat .dino-svg').count(),1);
    await page.screenshot({path:'preview-dino-map.png',fullPage:true});
    await page.locator('.world-card[data-world="pirates"]').click();
    await page.waitForSelector('.room');
    // Six escales réelles, les quatre activités, puis le coffre et la région suivante.
    const types=new Set();
    for(let i=0;i<6;i++) {
      const type=await page.evaluate(()=>RUN.steps[RUN.index].type);types.add(type);
      assert.equal(await page.locator('#boat .dino-svg').count(),1);
      assert.ok(await page.evaluate(()=>getComputedStyle(document.querySelector('.scene-water-motion')).display==='none'));
      assert.ok(await page.evaluate(()=>getComputedStyle(document.querySelector('.scene-ocean')).backgroundImage.includes('dinosaurs/jungle.webp')));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      if(type==='petitCompte') assert.match(await page.locator('.bubble-text').innerText(),/œufs/);
      if(type==='petiteCollection') assert.match(await page.locator('.bubble-text').innerText(),/nid/);
      if(type==='petiteLettre'||type==='petitePaire') assert.match(await page.locator('.bubble-text').innerText(),/nourrir le dino/);
      if(type!=='petiteCollection') {
        assert.equal(await page.locator('.choice-food img').count(), await page.locator('.little-choice').count());
        assert.ok(await page.locator('.choice-food img').first().evaluate(img=>img.complete&&img.naturalWidth>0));
        assert.equal(await page.locator('.little-choice').first().evaluate(e=>getComputedStyle(e).backgroundImage),'none');
      }
      if(i===0) {
        await page.waitForTimeout(600);
        await page.screenshot({path:'preview-dino-letter.png',fullPage:true});
        await page.setViewportSize({width:1440,height:1000});
        await page.screenshot({path:'preview-dino-desktop.png',fullPage:true});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        await page.setViewportSize({width:390,height:844});
      }
      if(type==='petitCompte') {
        await page.locator('.little-shell').first().click();
        await page.locator('.little-shell').first().click();
        assert.equal(await page.locator('.little-shell.counted').count(),1);
        await page.screenshot({path:'preview-dino-count.png',fullPage:true});
      }
      await page.evaluate(()=>{
        const type=RUN.steps[RUN.index].type;
        if(type==='petiteCollection') {
          const n=Number(document.querySelector('.little-target').textContent);
          [...document.querySelectorAll('.little-slot')].slice(0,n).forEach(b=>b.click());
          document.querySelector('.little-check').click();
        } else {
          let answer;
          if(type==='petitCompte') answer=String(document.querySelectorAll('.little-shell').length);
          else {const word=document.querySelector('.letter-clue-picture').alt;answer=Object.entries(LETTER_CLUES).find(([,clue])=>clue[0]===word)[0];if(type==='petitePaire')answer=answer.toLowerCase();}
          [...document.querySelectorAll('.little-choice')].find(b=>b.textContent===answer).click();
        }
      });
      if(type!=='petiteCollection') {
        await page.waitForFunction(()=>document.querySelector('#boat').classList.contains('sailing'));
        assert.ok(await page.locator('#boat .dino-svg').evaluate(e=>getComputedStyle(e).animationName.includes('dinoWalk')));
      }
      await page.locator('.overlay .next').click();
      await page.waitForFunction(i=>RUN.index===i+1&&(i===5||!RUN.busy),i);
    }
    assert.equal(types.size,4);
    assert.ok((await page.locator('.treasure-shore').getAttribute('src')).includes('dinosaurs/volcano'));
    await page.locator('.chest').click({force:true});
    await page.waitForSelector('.treasure-record');
    assert.equal(await page.evaluate(()=>S.worlds.pirates.best),18);
    assert.equal(await page.evaluate(()=>isUnlocked(2)),true);
    // Retour au thème marin sans perdre les réglages ou les étoiles.
    await page.reload();
    await page.locator('.parent-corner > summary').click();
    await page.locator('[data-game-theme-choice="islands"]').click();
    assert.equal(await page.evaluate(()=>S.theme),'islands');
    assert.equal(await page.evaluate(()=>WORLDS[0].name),'Les Îles Tropicales');
    assert.equal(await page.evaluate(()=>WORLDS[1].name),'La Mer des Pirates');
    assert.equal(await page.evaluate(()=>totalStars()),36);
    assert.equal(await page.locator('.dino-settings').count(),0);
    assert.equal(await page.locator('.boat-settings').isVisible(),true);
    assert.equal(await page.evaluate(()=>S.boat.pattern),'pois');
    assert.equal(await page.evaluate(()=>S.dino.body),'#b08ad0');
    await page.reload();
    assert.equal(await page.evaluate(()=>S.theme),'islands');
    await page.evaluate(()=>{startWorld(WORLDS[0]);});
    await page.waitForSelector('.room');
    assert.equal(await page.locator('#boat .dino-svg').count(),0);
    assert.equal(await page.locator('#boat .boat-svg').count(),1);
    assert.ok(await page.evaluate(()=>getComputedStyle(document.querySelector('.scene-ocean')).backgroundImage.includes('marine/ocean.webp')));
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    console.log('OK: old saves; persistent theme and dino colors; 5 volcano regions; real dino walking; letters/eggs/nests; 6-step treasure journey; mobile/desktop; island restoration without lost progress.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
