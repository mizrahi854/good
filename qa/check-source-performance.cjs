const {chromium}=require('/Users/yanaimizrahi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto('http://127.0.0.1:5500/');await page.waitForSelector('.sequence-ready');
const result=await page.evaluate(async()=>{
 document.documentElement.style.scrollBehavior='auto';
 const span=document.querySelector('.hero').offsetHeight-document.querySelector('.hero-pin').clientHeight;
 let ticks=[],lags=[],start,prev;const draw=new Set();
 await new Promise(resolve=>{function tick(now){start??=now;const t=(now-start)/7000; if(prev)ticks.push(now-prev);prev=now;const p=t<.5?t*1.74:(1-t)*1.74;scrollTo(0,Math.max(0,p)*span);const d=goomDiagnostics();lags.push(Math.abs(d.frame-d.renderedFrame));draw.add(d.renderedFrame);if(t<1)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)});
 ticks.sort((a,b)=>a-b);lags.sort((a,b)=>a-b);
 return {intervalMedianMs:ticks[Math.floor(ticks.length*.5)],intervalP95Ms:ticks[Math.floor(ticks.length*.95)],frameLagP95:lags[Math.floor(lags.length*.95)],maxFrameLag:Math.max(...lags),distinctSourceFrames:draw.size,...goomDiagnostics()};
});
fs.writeFileSync('output/playwright/source-performance.json',JSON.stringify(result,null,2));console.log(result);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
