const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page=await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8765');
    await page.evaluate(()=>{S.voice=false;S.sound=false;S.level='GS';startWorld(WORLDS[0]);});
    await page.waitForSelector('.room');
    for(const width of [390,1440]) {
      await page.setViewportSize({width,height:900});
      for(const type of ['petitCompte','petiteLettre']) {
        await page.evaluate(type=>{
          RUN.index=0;RUN.steps[0].type=type;
          ROOM_TYPES[type].make=()=>type==='petitCompte'?{n:10,max:10}:{answer:'T',options:['X','T','H'],lowercase:false};
          enterStep();
        },type);
        await page.waitForTimeout(650);
        for(const face of await page.locator('.letter-face').all()) {
          const centered=await face.evaluate(e=>{
            const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect(),tile=getComputedStyle(e.parentElement,'::before');
            const tileHeight=parseFloat(tile.height)+parseFloat(tile.borderTopWidth)+parseFloat(tile.borderBottomWidth);
            return Math.abs(r.x+r.width/2-p.x-p.width/2)<1 && Math.abs(r.y+r.height/2-p.y-parseFloat(tile.top)-tileHeight/2)<1;
          });assert.ok(centered);
        }
        const answer=type==='petitCompte'?'10':'T';
        const choices=page.locator('.little-choice');
        const values=await choices.allTextContents();
        const wrong=values.findIndex(v=>v!==answer);
        const before=await page.locator('#boat').boundingBox();
        await choices.nth(wrong).click();
        await page.waitForFunction(()=>document.querySelector('#boat').classList.contains('sailing'));
        assert.equal(await page.evaluate(()=>RUN.steps[0].solved),false);
        await page.waitForTimeout(200);
        const during=await page.locator('#boat').boundingBox();
        assert.ok(Math.abs(during.y-before.y)>3||Math.abs(during.x-before.x)>3);
        assert.equal(await choices.nth(wrong).isDisabled(),true);
        await page.waitForFunction(()=>!document.querySelector('.little-choices').hasAttribute('aria-busy'));
        assert.equal(await page.evaluate(()=>RUN.steps[0].mistakes),1);
        await page.evaluate(()=>{document.querySelector('.hint-box').classList.add('hidden');});
        const correct=values.indexOf(answer);
        await choices.nth(correct).click();
        // A second click while sailing cannot award another success.
        await choices.nth(correct).evaluate(e=>e.click());
        await page.waitForFunction(()=>RUN.steps[0].solved);
        assert.equal(await page.evaluate(()=>RUN.stars),((width===390?0:2)+(type==='petitCompte'?1:2))*3);
        const landing=await page.locator('#boat').boundingBox();
        const target=await choices.nth(correct).boundingBox();
        assert.ok(Math.abs(landing.x+landing.width/2-target.x-target.width/2)<5);
        assert.ok(await page.locator('#boat').evaluate(e=>Number(getComputedStyle(e).zIndex)>Number(getComputedStyle(document.querySelector('.stage')).zIndex)));
        if(width===390&&type==='petitCompte') await page.screenshot({path:'preview-count-navigation.png',fullPage:true});
        await page.waitForSelector('.overlay .next');
        await page.evaluate(()=>document.querySelector('.overlay').remove());
        await page.evaluate(()=>sailHome());
      }
    }
    assert.deepEqual(errors,[]);
    console.log('OK: centered single/double digit choices; letter and number voyages on mobile/desktop; wrong-choice return; duplicate-click protection; boat arrives before validation.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
