const {chromium,webkit}=require('/Users/yanaimizrahi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
// Write screenshots outside Live Server's watched root to avoid test-triggered reloads.
const out=fs.mkdtempSync('/tmp/goom-source-qa-');
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],failures=[],external=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push([r.status(),r.url()])});
await page.route('**/*',route=>{if(!route.request().url().startsWith('http://127.0.0.1:5500/')){external.push(route.request().url());return route.abort()}return route.continue()});
await page.goto('http://127.0.0.1:5500/');
await page.waitForSelector('.sequence-ready',{timeout:20000});
await page.evaluate(()=>document.fonts.ready);
const step=async p=>{
 await page.evaluate(p=>{document.documentElement.style.scrollBehavior='auto';const h=document.querySelector('.hero');scrollTo(0,h.offsetTop+(h.offsetHeight-document.querySelector('.hero-pin').clientHeight)*p)},p);
 await page.waitForFunction(p=>Math.abs(goomDiagnostics().progress-p)<.001,p);
 await page.waitForFunction(()=>goomDiagnostics().frame===goomDiagnostics().renderedFrame);
};
for(const [name,p]of [['hero',0],['transition',.42],['splash',.64],['exit',.86],['formulas',1]]){
 await step(p);await page.waitForTimeout(250);await page.screenshot({path:`${out}/source-desktop-${name}.png`});
 console.log(name,await page.evaluate(()=>goomDiagnostics()));
}
await page.locator('[data-f-next]').click();await page.waitForTimeout(300);assert.equal(await page.locator('.formula-caption h3').innerText(),'Shine');
for(const p of [.2,.7,.05,.85,.4,0])await step(p);
assert((await page.evaluate(()=>goomDiagnostics())).cachedFrames<=24);
for(const [width,height]of [[390,844],[320,740],[768,1024],[844,390]]){
 await page.setViewportSize({width,height});await step(0);await page.waitForTimeout(250);await page.screenshot({path:`${out}/source-${width}-hero.png`});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
 await step(.64);await page.waitForTimeout(250);await page.screenshot({path:`${out}/source-${width}-splash.png`});
 await step(1);await page.waitForTimeout(250);await page.screenshot({path:`${out}/source-${width}-formulas.png`});
 assert.equal(await page.locator('.journey-formula').getAttribute('aria-hidden'),'false');
}
await page.setViewportSize({width:390,height:844});await step(0);
await page.locator('.goom-menu').click();assert.equal(await page.locator('.goom-menu').getAttribute('aria-expanded'),'true');
await page.keyboard.press('Escape');assert.equal(await page.locator('.goom-menu').getAttribute('aria-expanded'),'false');
await page.locator('[data-faq-q]').first().scrollIntoViewIfNeeded();await page.locator('[data-faq-q]').first().click();assert.equal(await page.locator('[data-faq-q]').first().getAttribute('aria-expanded'),'true');
await page.locator('[data-ritual="1"]').click();assert.equal(await page.locator('[data-ritual="1"]').getAttribute('aria-pressed'),'true');
await page.goto('http://127.0.0.1:5500/GOOM%202026.dc.html');await page.waitForSelector('.sequence-ready');assert(page.url().endsWith('/index.html'));
await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForFunction(()=>window.goomDiagnostics?.().reducedMotion);await page.screenshot({path:`${out}/source-reduced.png`});
assert.equal(await page.locator('.journey-formula').getAttribute('aria-hidden'),'false');
console.log(JSON.stringify({errors,failures,external}));assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);assert.deepEqual(external,[]);
await browser.close();
const safari=await webkit.launch({executablePath:'/Users/yanaimizrahi/Library/Caches/ms-playwright/webkit-2336/pw_run.sh',headless:true});
const mobile=await safari.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const safariErrors=[];mobile.on('pageerror',e=>safariErrors.push(e.message));
await mobile.goto('http://127.0.0.1:5500/');await mobile.waitForSelector('.sequence-ready');await mobile.screenshot({path:`${out}/source-webkit.png`});
await mobile.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,(document.querySelector('.hero').offsetHeight-document.querySelector('.hero-pin').clientHeight)*.64)});
await mobile.waitForTimeout(900);console.log('WebKit',await mobile.evaluate(()=>goomDiagnostics()),safariErrors);assert.deepEqual(safariErrors,[]);await mobile.screenshot({path:`${out}/source-webkit-splash.png`});await safari.close();
fs.mkdirSync('output/playwright',{recursive:true});
fs.cpSync(out,'output/playwright',{recursive:true});
console.log('PASS: source sequence, reverse scroll, responsive layout, controls, reduced motion, root and legacy entry, no external dependencies.');
})().catch(e=>{console.error(e);process.exit(1)});
