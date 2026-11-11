const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8765');
    const clues=await page.evaluate(()=>LETTER_CLUES);
    assert.equal(Object.keys(clues).length,26);
    for(const [letter,[word,picture]] of Object.entries(clues)) {
      assert.equal(word.normalize('NFD')[0].toUpperCase(),letter);
      assert.ok(fs.existsSync(`assets/pictures/${picture}.svg`));
    }
    assert.equal(clues.O[0],'orange');
    const catalog=JSON.parse(fs.readFileSync('assets/phonemes/manifest.json','utf8'));
    const keys=await page.evaluate(()=>[...new Set(Object.values(LETTER_PHONEMES).filter(Boolean))]);
    assert.equal(keys.length,22);
    for(const key of keys) {
      const bytes=fs.readFileSync(`assets/phonemes/${key}.wav`);
      assert.equal(bytes.subarray(0,4).toString(),'RIFF');
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),catalog[key].sha256);
    }
    // Un toucher réel débloque Web Audio, y compris sans voix système.
    await page.evaluate(()=>{S.sound=false;S.voice=true;});
    await page.locator('.go-btn').first().click();
    await page.evaluate(()=>{
      window.realSpeak=speak;window.utterances=[];
      window.speak=(text,options)=>{Phonemes.stop();window.utterances.push({text,options});};
      const ctx=SFX.ctx(),create=ctx.createBufferSource.bind(ctx);
      window.bufferStarts=[];window.lastBuffer=null;
      ctx.createBufferSource=()=>{
        const source=create(),start=source.start.bind(source);
        source.start=(...args)=>{window.lastBuffer=source.buffer;window.bufferStarts.push({duration:source.buffer.duration,energy:source.buffer.getChannelData(0).reduce((sum,x)=>sum+x*x,0)});return start(...args);};
        return source;
      };
      window.originalLetterMake=ROOM_TYPES.petiteLettre.make;
      window.originalPairMake=ROOM_TYPES.petitePaire.make;
      S.level='GS';startWorld(WORLDS[0]);
    });
    await page.waitForSelector('.room');
    for(const lowercase of [false,true]) {
      await page.evaluate(lowercase=>{
        Phonemes.stop();S.voice=true;window.utterances=[];window.bufferStarts=[];
        const type=lowercase?'petitePaire':'petiteLettre';
        ROOM_TYPES[type].make=()=>({answer:'T',options:['X','T','H'],lowercase});
        RUN.steps[0].type=type;enterStep();
      },lowercase);
      assert.equal(await page.locator('.little-model .little-letter').count(),0);
      assert.equal(await page.locator('.letter-clue-picture').getAttribute('alt'),'tortue');
      await page.waitForFunction(()=>bufferStarts.length>0);
      assert.equal(await page.evaluate(()=>utterances.length),0);
      const sound=await page.evaluate(()=>bufferStarts[0]);
      assert.ok(sound.energy>0&&sound.duration>.1&&sound.duration<2);
      await page.evaluate(()=>{window.firstBuffer=window.lastBuffer;S.voice=false;});
      await page.locator('.hear-letter').click();
      assert.equal(await page.evaluate(()=>utterances.at(-1).text),'tortue');
      const speechCount=await page.evaluate(()=>utterances.length);
      let count=await page.evaluate(()=>bufferStarts.length);
      await page.locator('.say').click();
      await page.waitForFunction(count=>bufferStarts.length>count,count);
      assert.equal(await page.evaluate(()=>utterances.length),speechCount);
      assert.equal(await page.evaluate(()=>window.lastBuffer===window.firstBuffer),true);
      count=await page.evaluate(()=>bufferStarts.length);
      await page.locator('.hear-sound').click();
      await page.waitForFunction(count=>bufferStarts.length>count,count);
      assert.equal(await page.evaluate(()=>utterances.length),speechCount);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.locator('.hint').click();
      assert.ok(await page.locator('.hint-box .little-letter').isVisible());
      assert.match(await page.locator('.hint-box').innerText(),lowercase?/T → t/:/T/);
      count=await page.evaluate(()=>bufferStarts.length);
      await page.locator('.say').click();
      await page.waitForFunction(count=>bufferStarts.length>count,count);
      assert.equal(await page.evaluate(()=>Phonemes.currentLetter),'T');
      await page.locator('.hear-letter').click();
      assert.equal(await page.evaluate(()=>Phonemes.currentLetter),null);
    }
    // Pas de choix impossibles à départager : C/K/Q et V/W partagent leur son.
    assert.ok(await page.evaluate(()=>{
      for(const make of [window.originalLetterMake,window.originalPairMake])for(const level of ['MS','GS'])for(let i=0;i<600;i++) {
        const q=make(level);
        if(!q.options.includes(q.answer)||q.options.length!==(level==='GS'?3:2))return false;
        if(new Set(q.options.map(l=>LETTER_PHONEMES[l])).size!==q.options.length)return false;
      }
      return true;
    }));
    // Toutes les ressources livrées sont réellement décodables par le navigateur.
    const decoded=await page.evaluate(async keys=>{
      const ctx=SFX.ctx();return Promise.all(keys.map(async key=>{
        const response=await fetch(`assets/phonemes/${key}.wav`);if(!response.ok)return false;
        const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
        return buffer.duration>.1&&buffer.duration<2&&buffer.getChannelData(0).some(x=>Math.abs(x)>.01);
      }));
    },keys);
    assert.ok(decoded.every(Boolean));
    // Une erreur de chargement donne un message, jamais le nom alphabétique en remplacement.
    await page.route('**/assets/phonemes/s.wav',route=>route.abort());
    await page.evaluate(()=>{ROOM_TYPES.petiteLettre.make=()=>({answer:'S',options:['S','M','T'],lowercase:false});RUN.steps[0].type='petiteLettre';enterStep();});
    await page.locator('.hear-sound').click();
    await page.waitForFunction(()=>Phonemes.status==='error');
    assert.match(await page.locator('.phoneme-feedback').innerText(),/n’a pas pu être lu/);
    await page.unroute('**/assets/phonemes/s.wav');
    await page.locator('.hear-sound').click();
    await page.waitForFunction(()=>Phonemes.currentLetter==='S'&&Phonemes.status==='playing');
    assert.equal(await page.locator('.phoneme-feedback').innerText(),'');
    // H n’est pas transformé en faux son /h/ ou en nom « ache ».
    await page.evaluate(()=>{ROOM_TYPES.petiteLettre.make=()=>({answer:'H',options:['H','M','T'],lowercase:false});RUN.steps[0].type='petiteLettre';enterStep();});
    const count=await page.evaluate(()=>bufferStarts.length);
    await page.locator('.hear-sound').click();
    assert.equal(await page.evaluate(()=>bufferStarts.length),count);
    assert.equal(await page.evaluate(()=>utterances.at(-1).text),'Cette lettre ne se prononce pas.');
    assert.ok(await page.evaluate(()=>utterances.every(u=>!['té','bé','emme','esse','ache'].includes(u.text))));
    assert.deepEqual(errors,[]);
    console.log('OK: 22 audible decoded phoneme clips, no letter-name TTS, short replay before/after hints, spoken word kept separate, failed-load retry, silent H, orange clue and unambiguous sound choices.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
