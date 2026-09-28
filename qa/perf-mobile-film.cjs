// Phone film smoothness benchmark (WebKit + Chrome, 390x844 @3x, touch).
// Scrolls the film like a finger (~2.4 s down, then back up) and records every rAF interval,
// plus where in the film each long frame (>25 ms) happened.
const {webkit,chromium}=require('/Users/yanaimizrahi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url=process.argv[2]||'http://localhost:8765/index.html';
(async()=>{
  const out={};
  const engines=[['webkit',webkit,{executablePath:'/Users/yanaimizrahi/Library/Caches/ms-playwright/webkit-2361/pw_run.sh'}],['chromium',chromium,{channel:'chrome'}]].filter(([n])=>!process.env.ONLY||process.env.ONLY===n);
  for(const [name,engine,opts] of engines){
    const browser=await engine.launch(opts);
    const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true});
    const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.goto(url+'?perf='+Date.now()); await page.waitForSelector('.sequence-ready');
    await page.waitForTimeout(3500);
    const r=await page.evaluate(async()=>{
      const hero=document.querySelector('[data-hero]'); const span=hero.offsetHeight-innerHeight;
      const times=[],where=[]; let lagSum=0,lagN=0,lagMax=0,draws=0,lastDrawn=hero.dataset.renderedFrame;
      const run=(from,to,ms)=>new Promise(res=>{const t0=performance.now();let prev=t0;
        const step=now=>{const dt=now-prev;prev=now;times.push(dt);if(dt>25)where.push([Math.round(dt),hero.dataset.progress]);
          const k=Math.min(1,(now-t0)/ms);const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
          window.scrollTo(0,from+(to-from)*e);
          const lag=Math.abs(+hero.dataset.sourceFrame-(+hero.dataset.renderedFrame));lagSum+=lag;lagN++;lagMax=Math.max(lagMax,lag);
          if(hero.dataset.renderedFrame!==lastDrawn){draws++;lastDrawn=hero.dataset.renderedFrame;}
          if(k<1)requestAnimationFrame(step);else res();};requestAnimationFrame(step);});
      await run(0,span,2400); await run(span,0,2400);
      times.shift(); const s=[...times].sort((a,b)=>a-b);
      const pct=q=>s[Math.floor(q*(s.length-1))].toFixed(1);
      return {frames:s.length,p50:pct(.5),p95:pct(.95),max:s[s.length-1].toFixed(1),jank:s.filter(t=>t>25).length,lagAvg:(lagSum/lagN).toFixed(2),lagMax,draws,where};
    });
    out[name]={...r,errs};
    await browser.close();
  }
  console.log(JSON.stringify(out));
})();
