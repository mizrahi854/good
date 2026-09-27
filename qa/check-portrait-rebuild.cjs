const {chromium,webkit}=require('/Users/yanaimizrahi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const assert=require('assert/strict'),fs=require('fs');
const out='output/portrait-rebuild';
(async()=>{const results=[];for(const engine of[chromium,webkit]){
 const browser=await engine.launch(engine===chromium?{channel:'chrome'}:{executablePath:'/Users/yanaimizrahi/Library/Caches/ms-playwright/webkit-2361/pw_run.sh'});const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});const errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
 await page.goto('http://127.0.0.1:5500');await page.waitForSelector('.sequence-ready');
 const heroStep=async p=>{await page.evaluate(p=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,p*(document.querySelector('.hero').offsetHeight-document.querySelector('.hero-pin').clientHeight))},p);await page.waitForTimeout(450)};
 for(const[w,h]of[[320,568],[375,667],[390,844],[430,932]]){
  await page.setViewportSize({width:w,height:h});await heroStep(0);await page.screenshot({path:`${out}/${engine.name()}-${w}-hero.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),w);assert.equal(await page.locator('.mobile-opening').count(),0);assert.equal(await page.evaluate(()=>goomDiagnostics().variant),'portrait');
  for(const p of[.23,.34,.5,.72,.86,.97]){await heroStep(p);if(w===390)await page.screenshot({path:`${out}/${engine.name()}-film-${p}.png`});}
  await page.waitForFunction(()=>goomDiagnostics().renderedFrame===239);assert.equal(await page.locator('[data-scene="3"]').getAttribute('aria-hidden'),'false');
  await heroStep(0);await page.locator('.hero-actions a').click();await page.waitForFunction(()=>Math.abs(document.querySelector('#formulas').getBoundingClientRect().top)<110);const previous=await page.locator('.formula-caption h3').innerText();await page.locator('[data-f-next]').click();await page.waitForTimeout(250);assert.notEqual(await page.locator('.formula-caption h3').innerText(),previous);
  await page.locator('#bundles').evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY));await page.waitForTimeout(300);assert.equal(await page.locator('#bundles').getAttribute('data-active-bundle'),'0');
  await page.screenshot({path:`${out}/${engine.name()}-${w}-bundle-0.png`});
  for(const i of[1,2]){await page.mouse.move(w/2,h/2);await page.mouse.wheel(0,110);await page.waitForTimeout(450);assert.equal(await page.locator('#bundles').getAttribute('data-active-bundle'),String(i));await page.screenshot({path:`${out}/${engine.name()}-${w}-bundle-${i}.png`});}
  const y=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,900);await page.waitForTimeout(450);assert((await page.evaluate(()=>scrollY))>y);assert((await page.locator('.bundles-pin').boundingBox()).y<0,'release after last card');
  await page.locator('#bundles').evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY+innerHeight*.8));await page.waitForTimeout(250);await page.mouse.wheel(0,-100);await page.waitForTimeout(450);assert.equal(await page.locator('#bundles').getAttribute('data-active-bundle'),'0');
  results.push({engine:engine.name(),width:w,height:h,status:'pass'});console.log('PASS',engine.name(),w);
 }
 await page.setViewportSize({width:390,height:844});
 for(const id of['ritual','stories','about','press','community','bundles','faq','feel-good']){await page.locator('#'+id).scrollIntoViewIfNeeded();await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);await page.screenshot({path:`${out}/${engine.name()}-${id}.png`});}
 await page.locator('#stories').scrollIntoViewIfNeeded();await page.mouse.move(0,0);await page.waitForTimeout(100);const before=await page.locator('.stories-ring').getAttribute('style');await page.waitForTimeout(500);assert.notEqual(await page.locator('.stories-ring').getAttribute('style'),before);assert.equal(await page.locator('.stories-card:visible').count(),12);await page.locator('[data-spin-toggle]').click();assert.equal(await page.locator('[data-spin-toggle]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('.community-track').first().evaluate(el=>getComputedStyle(el).animationDuration),'18s');
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(300);assert.equal(await page.locator('#bundles .bundle-card[inert]').count(),0);await page.screenshot({path:`${out}/${engine.name()}-reduced.png`});assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await browser.close();
}fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log('ALL PASS')})().catch(e=>{console.error(e);process.exit(1)});
