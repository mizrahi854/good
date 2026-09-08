const {webkit,chromium}=require('/Users/yanaimizrahi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const b=await webkit.launch({headless:true,executablePath:'/Users/yanaimizrahi/Library/Caches/ms-playwright/webkit-2336/pw_run.sh'});
 const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5500/GOOM%202026.dc.html');await p.waitForSelector('.hero-wordmark');await p.waitForTimeout(500);await p.screenshot({path:'qa/webkit-mobile-hero.png'});
 await p.locator('[data-chapter="1"]').tap();await p.waitForTimeout(1300);assert.equal(await p.locator('.hero-copy[data-scene="2"]').getAttribute('aria-hidden'),'false');await p.screenshot({path:'qa/webkit-mobile-splash.png'});
 await p.locator('[data-chapter="2"]').tap();await p.waitForTimeout(1300);assert.equal(await p.locator('.formula-caption h3').innerText(),'Flow');await p.locator('[data-f-next]').tap();await p.waitForTimeout(700);assert.equal(await p.locator('.formula-caption h3').innerText(),'Shine');await p.screenshot({path:'qa/webkit-mobile-formulas.png'});
 assert.deepEqual(errors,[]);await b.close();
 const c=await chromium.launch({headless:true,channel:'chrome'});const ctx=await c.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const q=await ctx.newPage();await q.goto('http://127.0.0.1:5500/GOOM%202026.dc.html');await q.waitForSelector('.journey-flow');await q.locator('[data-chapter="2"]').tap();await q.waitForTimeout(1100);
 const cd=await ctx.newCDPSession(q);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:300,y:365}]});for(let x=280;x>=90;x-=20){await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:365}]});await q.waitForTimeout(16)}await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await q.waitForTimeout(650);assert.equal(await q.locator('.formula-caption h3').innerText(),'Shine');
 console.log('PASS: WebKit at mobile 2x DPR, touch navigation, carousel controls, native horizontal touch swipe. No JS errors.');await c.close();
})().catch(e=>{console.error(e);process.exit(1)});
