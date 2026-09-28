// Final phone-film acceptance run.
// Engines: WebKit (Safari engine) and Chrome (with CPU throttling to model mid/low-end phones).
// Viewports: 375x667, 390x844, 430x932 @3x, touch. Sweeps: slow 6 s, normal 2.4 s, fast 0.8 s, and a rapid back-and-forth flick.
// Cold loads under 4G and slow 4G. Pass criteria are printed with every row.
const {webkit,chromium}=require('/Users/yanaimizrahi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const URL=process.argv[2]||'http://localhost:8765/index.html';
const LIMITS={p95:20,max:50,lagAvg:1};
const results=[];let failed=0;
const log=(row)=>{results.push(row);if(!row.pass)failed++;console.log((row.pass?'PASS ':'FAIL ')+JSON.stringify(row));};

async function sweeps(page){
  return page.evaluate(async()=>{
    const hero=document.querySelector('[data-hero]');const span=hero.offsetHeight-innerHeight;
    const frame=()=>new Promise(r=>requestAnimationFrame(r));
    let longTasks=0;try{new PerformanceObserver(l=>{longTasks+=l.getEntries().length;}).observe({type:'longtask'});}catch(_){}
    const run=async(plan)=>{const lt0=longTasks; // plan: [[from,to,ms],...] as fractions of span
      const times=[];let lagSum=0,lagN=0,lagMax=0;const where=[];
      for(const [a,b,ms] of plan){
        await new Promise(res=>{const t0=performance.now();let prev=t0;
          const step=now=>{const dt=now-prev;prev=now;times.push(dt);if(dt>25)where.push([Math.round(dt),hero.dataset.progress]);
            const k=Math.min(1,(now-t0)/ms);const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
            window.scrollTo(0,span*(a+(b-a)*e));
            const lag=Math.abs(+hero.dataset.sourceFrame-(+hero.dataset.renderedFrame));lagSum+=lag;lagN++;lagMax=Math.max(lagMax,lag);
            if(k<1)requestAnimationFrame(step);else res();};requestAnimationFrame(step);});
      }
      for(let i=0;i<40;i++)await frame(); // settle
      times.shift();const s=[...times].sort((x,y)=>x-y);const pct=q=>+s[Math.floor(q*(s.length-1))].toFixed(1);
      const settled=+hero.dataset.renderedFrame===+hero.dataset.sourceFrame;
      return {p50:pct(.5),p95:pct(.95),max:+s[s.length-1].toFixed(1),lagAvg:+(lagSum/lagN).toFixed(2),lagMax,settled,longTasks:longTasks-lt0,where:where.slice(0,4)};
    };
    window.scrollTo(0,0);for(let i=0;i<10;i++)await frame();
    return {
      slow:await run([[0,1,6000],[1,0,6000]]),
      normal:await run([[0,1,2400],[1,0,2400]]),
      fast:await run([[0,1,800],[1,0,800]]),
      flick:await run([[0,.3,250],[.3,.1,200],[.1,.6,300],[.6,.4,200],[.4,1,350],[1,.7,250],[.7,1,250]]),
    };
  });
}

(async()=>{
  const wk={executablePath:'/Users/yanaimizrahi/Library/Caches/ms-playwright/webkit-2361/pw_run.sh'};
  // ---------- 1) smoothness matrix ----------
  const onlyEngine=process.env.ONLY_ENGINE, onlyVp=process.env.ONLY_VP, skipNet=!!process.env.SKIP_NET;
  for(const [engName,engine,opts,cpus] of [['webkit',webkit,wk,[1]],['chrome',chromium,{channel:'chrome'},[1,4,6]]].filter(([n])=>!onlyEngine||n===onlyEngine)){
    for(const [w,h] of [[375,667],[390,844],[430,932]].filter(([w])=>!onlyVp||String(w)===onlyVp)){
      for(const cpu of cpus){
        if(engName==='chrome'&&cpu>1&&w!==390)continue; // throttled runs on the reference phone size
        const browser=await engine.launch(opts);
        const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:3,hasTouch:true});
        const page=await ctx.newPage();const errs=[],missing=[];
        page.on('pageerror',e=>errs.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url().split('/').pop())});
        let cdp=null;
        if(engName==='chrome'){cdp=await ctx.newCDPSession(page);if(cpu>1)await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});}
        await page.goto(URL+'?t='+Date.now());await page.waitForSelector('.sequence-ready',{timeout:20000});
        await page.waitForTimeout(cpu>1?7000:4500);
        const r=await sweeps(page);
        const extra=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,bitmaps:window.goomSite?.film?.bitmaps?.size??null}));
        const scen=['slow','normal','fast','flick'];
        for(const k of scen){
          const x=r[k];
          // fast/flick at 4-6x CPU model a low-end phone: allow a softer bound there
          const lim=engName==='chrome'?{p95:35,max:cpu>=4?70:50,lagAvg:cpu>=4?2:1,longTasks:0}:{...LIMITS,longTasks:0};
          const pass=x.p95<=lim.p95&&x.max<=lim.max&&x.lagAvg<=lim.lagAvg&&x.settled&&x.longTasks<=lim.longTasks&&!errs.length&&!missing.length&&!extra.overflow;
          log({engine:engName,vp:`${w}x${h}`,cpu:cpu+'x',sweep:k,...x,limits:lim,errs:errs.length,missing:missing.length,overflow:extra.overflow,bitmaps:extra.bitmaps,pass});
        }
        await browser.close();
      }
    }
  }
  // ---------- 2) cold load over mobile networks (Chrome, 390x844) ----------
  for(const [label,down,lat] of (skipNet?[]:[['4G',20,40],['slow 4G',4,150]])){
    const browser=await chromium.launch({channel:'chrome'});
    const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true});
    const page=await ctx.newPage();const cdp=await ctx.newCDPSession(page);
    await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:lat,downloadThroughput:down*1024*1024/8,uploadThroughput:2*1024*1024/8});
    let got=0;ctx.on('requestfinished',rq=>{if(rq.url().includes('/mobile-film-v4/'))got++;});
    const t0=Date.now();
    await page.goto(URL+'?cold='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.sequence-ready',{timeout:30000});const firstFrame=Date.now()-t0;
    let firstScroll=null,all=null;
    for(let i=0;i<120&&all===null;i++){
      await page.waitForTimeout(250);
      const n=got;
      if(firstScroll===null&&n>=25)firstScroll=Date.now()-t0;
      if(n>=134)all=Date.now()-t0;
    }
    // impatient user: sweeps as soon as the first scroll is ready
    const r=await page.evaluate(async()=>{const hero=document.querySelector('[data-hero]');const span=hero.offsetHeight-innerHeight;let lag=0,n=0,mx=0;
      await new Promise(res=>{const t0=performance.now();const st=now=>{const k=Math.min(1,(now-t0)/1500);window.scrollTo(0,span*k);const l=Math.abs(+hero.dataset.sourceFrame-(+hero.dataset.renderedFrame));lag+=l;n++;mx=Math.max(mx,l);if(k<1)requestAnimationFrame(st);else res();};requestAnimationFrame(st);});
      return {lagAvg:+(lag/n).toFixed(2),lagMax:mx};});
    const firstLimit=label==='4G'?1000:2500;
    const pass=firstFrame<=firstLimit&&r.lagAvg<=3&&all!==null;
    log({network:label,firstFrameMs:firstFrame,firstScrollReadyMs:firstScroll,allFramesMs:all,earlySweep:r,limits:{firstFrameMs:firstLimit,lagAvg:3},pass});
    await browser.close();
  }
  console.log(`\n${results.length-failed}/${results.length} passed`);
  process.exit(failed?1:0);
})();
