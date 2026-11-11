const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
(async()=>{
 const catalog=JSON.parse(fs.readFileSync('assets/words/manifest.json','utf8'));
 assert.equal(Object.keys(catalog).length,26);
 for(const entry of Object.values(catalog)) {
  const word=fs.readFileSync(`assets/words/${entry.file}`);
  const start=fs.readFileSync(`assets/words/${entry.start_file}`);
  assert.equal(crypto.createHash('sha256').update(word).digest('hex'),entry.sha256);
  assert.equal(crypto.createHash('sha256').update(start).digest('hex'),entry.start_sha256);
  assert.ok(entry.start_seconds>=.15&&entry.start_seconds<=.341&&entry.start_seconds<entry.duration_seconds);
  // Le début doit être le préfixe exact du mot, jamais un assemblage « p-p-p ».
  const length=start.length-44-Math.round(entry.fade_out_seconds*22050)*2;
  assert.ok(length>1000);
  assert.ok(start.subarray(44,44+length).equals(word.subarray(44,44+length)));
  assert.ok(['CC0','CC BY-SA 4.0'].includes(entry.license));
 }
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765');
  const clues=await page.evaluate(()=>LETTER_CLUES);
  for(const [letter,[word,picture]] of Object.entries(clues)) {
   assert.equal(word,catalog[letter].word);
   assert.ok(fs.existsSync(`assets/pictures/${picture}.svg`));
  }
  await page.evaluate(()=>{S.sound=false;S.voice=false;});
  await page.locator('.go-btn').first().click();
  await page.evaluate(()=>{
   window.originalMake=ROOM_TYPES.petiteLettre.make;
   window.originalPairMake=ROOM_TYPES.petitePaire.make;
   window.realSpeak=speak;window.utterances=[];
   window.speak=(text,options)=>{WordAudio.stop();window.utterances.push({text,options});};
   const ctx=SFX.ctx(),create=ctx.createBufferSource.bind(ctx);
   window.bufferStarts=[];window.lastBuffer=null;
   ctx.createBufferSource=()=>{
    const source=create(),start=source.start.bind(source);
    source.start=(...args)=>{window.lastBuffer=source.buffer;window.bufferStarts.push(source.buffer.duration);return start(...args);};
    return source;
   };
   S.level='GS';startWorld(WORLDS[0]);
  });
  await page.waitForSelector('.room');
  for(const lowercase of [false,true]) {
   await page.evaluate(lowercase=>{
    WordAudio.stop();S.voice=true;window.utterances=[];window.bufferStarts=[];
    const type=lowercase?'petitePaire':'petiteLettre';
    ROOM_TYPES[type].make=()=>({answer:'T',options:['X','T','H'],lowercase});
    RUN.steps[0].type=type;enterStep();
   },lowercase);
   await page.waitForFunction(()=>bufferStarts.length>0);
   assert.ok(Math.abs(await page.evaluate(()=>bufferStarts[0])-catalog.T.start_seconds)<.005);
   assert.equal(await page.evaluate(()=>utterances.length),0);
   assert.equal(await page.locator('.little-model .little-letter').count(),0);
   assert.equal((await page.locator('.hear-sound').innerText()).trim(),'Écouter le début');
   await page.evaluate(()=>{S.voice=false;window.firstBuffer=window.lastBuffer;});
   let count=await page.evaluate(()=>bufferStarts.length);
   await page.locator('.hear-letter').click();
   await page.waitForFunction(count=>bufferStarts.length>count,count);
   assert.ok(Math.abs(await page.evaluate(()=>bufferStarts.at(-1))-catalog.T.duration_seconds)<.005);
   assert.equal(await page.evaluate(()=>utterances.length),0);
   count=await page.evaluate(()=>bufferStarts.length);
   await page.locator('.say').click();
   await page.waitForFunction(count=>bufferStarts.length>count,count);
   assert.equal(await page.evaluate(()=>window.lastBuffer===window.firstBuffer),true);
   assert.equal(await page.evaluate(()=>utterances.length),0);
   await page.locator('.hint').click();
   assert.match(await page.locator('.hint-box').innerText(),lowercase?/T → t/:/T/);
   const spoken=await page.evaluate(()=>utterances.length);
   count=await page.evaluate(()=>bufferStarts.length);
   await page.locator('.hear-sound').click();
   await page.waitForFunction(count=>bufferStarts.length>count,count);
   assert.equal(await page.evaluate(()=>utterances.length),spoken);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  assert.ok(await page.evaluate(()=>{
   for(const make of [window.originalMake,window.originalPairMake])for(const level of ['MS','GS'])for(let i=0;i<600;i++) {
    const q=make(level);
    if(!q.options.includes(q.answer)||q.options.length!==(level==='GS'?3:2))return false;
    if(new Set(q.options.map(l=>LETTER_INITIAL_SOUNDS[l])).size!==q.options.length)return false;
   }return true;
  }));
  const files=Object.values(catalog).flatMap(e=>[e.file,e.start_file]);
  const playable=await page.evaluate(async files=>{
   const ctx=SFX.ctx();return Promise.all(files.map(async file=>{
    const r=await fetch(`assets/words/${file}`);if(!r.ok)return false;
    const b=await ctx.decodeAudioData(await r.arrayBuffer());return b.duration>.1&&b.duration<4&&b.getChannelData(0).some(x=>Math.abs(x)>.01);
   }));
  },files);
  assert.ok(playable.every(Boolean));
  await page.route('**/assets/words/S-start.wav',route=>route.abort());
  await page.evaluate(()=>{ROOM_TYPES.petiteLettre.make=()=>({answer:'S',options:['S','M','T'],lowercase:false});RUN.steps[0].type='petiteLettre';enterStep();});
  await page.locator('.hear-sound').click();
  await page.waitForFunction(()=>WordAudio.status==='error');
  assert.match(await page.locator('.word-audio-feedback').innerText(),/n’a pas pu être lu/);
  await page.unroute('**/assets/words/S-start.wav');
  await page.locator('.hear-sound').click();
  await page.waitForFunction(()=>WordAudio.currentLetter==='S'&&WordAudio.status==='playing');
  assert.equal(await page.locator('.word-audio-feedback').innerText(),'');
  await page.evaluate(()=>{WordAudio.stop();});
  assert.equal(await page.evaluate(()=>WordAudio.currentLetter),null);
  assert.deepEqual(errors,[]);
  console.log('OK: 26 natural recorded words; 26 true beginnings from the same samples with no repeats; all 52 files decode; automatic/manual beginning versus whole-word playback; short replay after hint; source failure retry; no letter-name TTS.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
