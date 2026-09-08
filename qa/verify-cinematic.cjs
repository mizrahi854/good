const {chromium,webkit}=require('/Users/yanaimizrahi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const url='http://127.0.0.1:5500/GOOM%202026.dc.html';
const out=[];
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const bad=[];page.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()])});
 await page.goto(url);await page.waitForSelector('.journey-flow');
 await page.locator('[data-chapter="1"]').click();await page.waitForTimeout(1100);
 assert.equal(await page.locator('.hero-copy[data-scene="2"]').getAttribute('aria-hidden'),'false');
 await page.locator('.hero-copy[data-scene="2"] a').click();await page.waitForTimeout(1200);
 assert.equal(await page.locator('.formula-caption h3').innerText(),'Flow');
 await page.locator('[data-f-next]').click();await page.waitForTimeout(600);assert.equal(await page.locator('.formula-caption h3').innerText(),'Shine');
 await page.locator('.formula-node[aria-selected="true"]').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(600);assert.equal(await page.locator('.formula-caption h3').innerText(),'Deep Sleep');
 await page.locator('[data-chapter="0"]').click();await page.waitForTimeout(1200);
 await page.mouse.wheel(0,320);await page.waitForTimeout(250);
 assert.ok(+await page.locator('.hero').getAttribute('data-progress')>0);
 await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,0)});await page.waitForTimeout(200);
 const metrics=await page.evaluate(async()=>{
  const span=document.querySelector('.hero').offsetHeight-document.querySelector('.hero-pin').clientHeight;
  const d=[];let prev=performance.now();
  for(let i=0;i<180;i++){await new Promise(requestAnimationFrame);const now=performance.now();d.push(now-prev);prev=now;scrollTo(0,span*i/179)}
  d.sort((a,b)=>a-b);return {median:d[90],p95:d[171],max:d[179]};
 });out.push({check:'desktop controls, reverse scroll and 180-frame scrub',metrics});
 // Verify the frame immediately before the landing and the real carousel bottle align.
 await page.evaluate(()=>scrollTo(0,(document.querySelector('.hero').offsetHeight-document.querySelector('.hero-pin').clientHeight)*.9099));await page.waitForTimeout(250);
 const before=await page.locator('.journey-flow').boundingBox();
 await page.evaluate(()=>scrollTo(0,(document.querySelector('.hero').offsetHeight-document.querySelector('.hero-pin').clientHeight)*.9101));await page.waitForTimeout(250);
 const after=await page.locator('.formula-item[data-index="2"]').boundingBox();
 const delta=Math.max(...['x','y','width','height'].map(k=>Math.abs(before[k]-after[k])));assert.ok(delta<2,`handoff delta ${delta}`);out.push({check:'same-size bottle landing',maxPixelDelta:delta});
 for(const [width,height] of [[390,844],[360,740],[320,640],[768,1024],[844,390]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(350);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1);
  await page.screenshot({path:`qa/verified-${width}-hero.png`});
  await page.locator('[data-chapter="2"]').click();await page.waitForTimeout(1100);
  await page.screenshot({path:`qa/verified-${width}-formulas.png`});
  const cta=await page.locator('.formula-caption .f-cta').boundingBox();assert.ok(cta.y>=0&&cta.y+cta.height<=height,`CTA clipped ${width}: ${JSON.stringify(cta)}`);
  out.push({check:`${width}×${height}`,overflow,ctaVisible:true});
 }
 await page.setViewportSize({width:390,height:844});await page.locator('.goom-menu').click();assert.equal(await page.locator('.goom-menu').getAttribute('aria-expanded'),'true');await page.screenshot({path:'qa/verified-mobile-menu.png'});
 await page.locator('.goom-nav a[href="#how"]').click();await page.waitForTimeout(1100);assert.equal(await page.locator('.goom-menu').getAttribute('aria-expanded'),'false');
 for(const sel of ['.ritual','.how','#stories','#about','#faq','footer']){
  await page.locator(sel).evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-85,behavior:'instant'}));await page.waitForTimeout(500);await page.screenshot({path:'qa/verified-mobile-'+sel.replace(/[^a-z]/g,'')+'.png'});
 }
 await page.locator('[data-ritual="2"]').scrollIntoViewIfNeeded();await page.locator('[data-ritual="2"]').click();assert.equal(await page.locator('[data-ritual="2"]').getAttribute('aria-pressed'),'true');
 const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await reduced.goto(url);await reduced.waitForSelector('.hero-copy.is-on');await reduced.waitForTimeout(300);await reduced.screenshot({path:'qa/verified-reduced-hero.png'});
 await reduced.locator('.hero-copy[data-scene="1"] a[href="#formulas"]').click();await reduced.waitForTimeout(300);assert.equal(await reduced.locator('.journey-formula').getAttribute('aria-hidden'),'false');await reduced.screenshot({path:'qa/verified-reduced-formulas.png'});
 out.push({check:'mobile navigation, ritual controls and reduced motion',passed:true});
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);out.push({errors,bad});
 console.log(JSON.stringify(out,null,2));require('fs').writeFileSync('qa/cinematic-results.json',JSON.stringify(out,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
