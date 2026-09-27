const {chromium,webkit}=require('/Users/yanaimizrahi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const out='output/playwright/mobile-first';fs.mkdirSync(out,{recursive:true});
(async()=>{const results=[];for(const engine of (process.env.ENGINE==='webkit'?[webkit]:[chromium,webkit])){
 const browser=await engine.launch(engine===chromium?{channel:'chrome'}:{executablePath:'/Users/yanaimizrahi/Library/Caches/ms-playwright/webkit-2361/pw_run.sh'});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true});
 const errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
 await page.goto('http://127.0.0.1:5500');await page.waitForSelector('.sequence-ready');
 const step=async n=>{await page.evaluate(n=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,n*(document.querySelector('.hero').offsetHeight-document.querySelector('.hero-pin').clientHeight))},n);await page.waitForTimeout(500)};
 for(const [w,h]of(engine===chromium?[[320,568],[375,667],[390,844],[430,932],[768,1024],[844,390],[1440,900]]:[[320,568],[390,844]])){
  await page.setViewportSize({width:w,height:h});await step(0);await page.screenshot({path:`${out}/${engine.name()}-${w}-hero.png`});
  const opening=await page.locator('.hero-copy[data-scene="1"]').boundingBox();assert(opening.x>=0&&opening.x+opening.width<=w+1);
  for(const n of [.2,.45,.70,.82,.96]){await step(n);if(w===390)await page.screenshot({path:`${out}/${engine.name()}-${w}-${n}.png`});}
  assert.equal(await page.locator('.journey-formula').getAttribute('aria-hidden'),'false');
  const geo=await page.evaluate(()=>{const a=document.querySelector('.formula-item[data-index="2"]').getBoundingClientRect(),b=document.querySelector('.formula-caption').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth-innerWidth,productBottom:a.bottom,captionTop:b.top,captionBottom:b.bottom}});
  assert(geo.overflow<=1,JSON.stringify(geo));if(w<h&&w<=900){assert(geo.captionTop>=geo.productBottom-3,`${w} overlap ${JSON.stringify(geo)}`);assert(geo.captionBottom<h-65);}
  await page.locator('[data-f-next]').click();await page.waitForTimeout(300);assert.equal(await page.locator('.formula-caption h3').innerText(),'Shine');
  results.push({engine:engine.name(),width:w,height:h,...geo});console.log('PASS',engine.name(),w,h);
 }
 await page.setViewportSize({width:390,height:844});
 for(const id of ['ritual','stories','about','community','bundles','faq','feel-good']){await page.locator('#'+id).scrollIntoViewIfNeeded();await page.waitForTimeout(600);await page.screenshot({path:`${out}/${engine.name()}-${id}.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);}
 await page.locator('[data-faq-q]').first().click();assert.equal(await page.locator('[data-faq-q]').first().getAttribute('aria-expanded'),'true');
 await step(0);await page.locator('.goom-menu').click();assert.equal(await page.locator('.goom-menu').getAttribute('aria-expanded'),'true');await page.locator('.goom-nav a[href="#formulas"]').click();await page.waitForTimeout(900);assert.equal(await page.locator('.journey-formula').getAttribute('aria-hidden'),'false');
 await step(.82);await page.waitForFunction(()=>goomDiagnostics().renderedFrame===239);await step(.1);await page.waitForFunction(()=>Math.abs(goomDiagnostics().renderedFrame-64)<=1);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForFunction(()=>goomDiagnostics().reducedMotion);await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);await page.screenshot({path:`${out}/${engine.name()}-reduced.png`});await page.locator('[data-f-next]').click();assert.equal(await page.locator('.formula-caption h3').innerText(),'Shine');
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);await browser.close();
 }fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log('ALL PASS');})().catch(e=>{console.error(e);process.exit(1)});
