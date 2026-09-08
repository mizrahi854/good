const {chromium,webkit}=require('/Users/yanaimizrahi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const assert=require('assert/strict');
(async()=>{for(const engine of [chromium,webkit]){
const browser=await engine.launch(engine===chromium?{channel:'chrome'}:{executablePath:'/Users/yanaimizrahi/Library/Caches/ms-playwright/webkit-2336/pw_run.sh'});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});let errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5500/');await page.waitForSelector('.sequence-ready');
await page.locator('[data-chapter="2"]').click();await page.waitForTimeout(1800);
const caption=()=>page.locator('.formula-caption h3').innerText();assert.equal(await caption(),'Flow');
await page.mouse.move(190,410);
for(const name of ['Shine','Deep Sleep','B12+D3+B9','Grow']){await page.mouse.wheel(0,140);await page.waitForTimeout(1400);assert.equal(await caption(),name);}
const before=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,180);await page.waitForTimeout(1500);assert((await page.evaluate(()=>scrollY))>before);assert((await page.locator('#ritual').boundingBox()).y<25);
await page.locator('[data-chapter="2"]').click({force:true});await page.waitForTimeout(1600);
await page.evaluate(()=>{const el=document.querySelector('.formula-stage');for(const [type,y]of [['touchstart',600],['touchmove',420],['touchend',420]]){const event=new Event(type,{bubbles:true,cancelable:true});const touch={identifier:1,target:el,clientX:180,clientY:y};Object.defineProperties(event,{touches:{value:type==='touchend'?[]:[touch]},changedTouches:{value:[touch]}});el.dispatchEvent(event)}});
await page.waitForTimeout(1500);assert.equal(await caption(),'Shine');
await page.locator('[data-f-next]').click();await page.waitForTimeout(1500);assert.equal(await caption(),'Deep Sleep');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForFunction(()=>goomDiagnostics().reducedMotion);await page.locator('[data-f-next]').click();await page.waitForTimeout(250);assert.equal(await caption(),'Shine');assert.deepEqual(errors,[]);console.log(engine.name(),'PASS wheel stops, exit, vertical touch, arrows, reduced motion, no errors');await browser.close();
}})().catch(e=>{console.error(e);process.exit(1)});
