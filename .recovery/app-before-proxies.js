'use strict';
class GoomSite {
  mount() {
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.header = document.querySelector('[data-header]');
    this.hero = document.querySelector('[data-hero]');
    this.destroyed = false;

    this.onScroll = () => {
      if (this.raf) return;
      this.raf = requestAnimationFrame(() => { this.raf = 0; this.updateScroll(); });
    };
    window.addEventListener('scroll', this.onScroll, { passive:true });
    window.addEventListener('resize', this.onScroll);

    this.initReveals();
    this.initAmbientMotion();
    this.initHero();
    this.initFormula();
    this.measureJourney();
    this.initStories();
    this.initFaq();
    this.initRitual();
    this.initNavigation();
    this.initBundleJourney();
    this.updateScroll();
  }

  destroy() {
    this.destroyed = true;
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.storyRaf);
    clearTimeout(this.captionTimer);
    this.revealObserver?.disconnect();
    this.motionObserver?.disconnect();
    this.videoObserver?.disconnect();
    this.posterObserver?.disconnect();
    this.storyObserver?.disconnect();
    if (this.layoutFormula) window.removeEventListener('resize', this.layoutFormula);
    this.journeyResize?.disconnect();
    this.navAbort?.abort();
    this.mediaAbort?.abort();
    this.bundleAbort?.abort();
    clearTimeout(this.bundleWheelTimer);
    cancelAnimationFrame(this.sequenceRaf);
    cancelAnimationFrame(this.decodeRaf);
    this.frameCache?.forEach(frame=>frame.bitmap.close());
    this.stopFilm?.();
  }

  clamp(value,min=0,max=1) { return Math.min(max,Math.max(min,value)); }

  updateScroll() {
    this.updateHero();
    if(this.frameVariant==='mobile-film-v4'&&this.journeyFormula){
      // the chapter pill stays with the film and the formulas, then gets out of the way
      document.documentElement.classList.toggle('chapters-away',this.journeyFormula.getBoundingClientRect().bottom<innerHeight*.72);
    }
    this.updateFormula?.();
    this.updateBundles?.();
    this.header?.classList.toggle('is-scrolled', window.scrollY > 30);
  }

  /* Original recorded motion. Every displayed frame is a native source frame;
     the supplied clean JPEGs guide UI removal and uniform image enhancement. */
  initHero() {
    if (!this.hero) return;
    this.copyBlocks=[...this.hero.querySelectorAll('.hero-copy')];
    this.journeyFormula=document.querySelector('[data-formula]');
    this.tagline=this.hero.querySelector('.hero-tagline');
    this.cue=this.hero.querySelector('.hero-cue');
    this.chapters=[...this.hero.querySelectorAll('[data-chapter]')];
    this.sequenceLayer=this.hero.querySelector('.source-sequence');
    this.canvas=this.hero.querySelector('[data-source-canvas]');
    this.ctx=this.canvas.getContext('2d',{alpha:false});
    this.frameCache=new Map();this.framePending=new Set();this.frameFailures=new Set();
    this.frameAttempts=new Map();
    this.frameQueue=[];this.frameWorkers=0;this.frameCount=240;this.renderProgress=0;
    this.mediaAbort=new AbortController();
    this.mobileFilmQuery=window.matchMedia('(max-width:900px) and (orientation:portrait)');
    this.measureJourney=()=>{
      const pin=this.hero.querySelector('.hero-pin');
      const w=pin.clientWidth,h=this.reduced?Math.max(600,innerHeight):pin.clientHeight;
      if(this.journeyLayout?.w===w&&this.journeyLayout?.h===h)return;
      const mobile=true;
      const film=this.mobileFilmQuery.matches&&!this.reduced;
      const dpr=film?Math.min(devicePixelRatio||1,2,760/Math.max(1,w)):Math.min(devicePixelRatio||1,2);
      this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);
      this.ctx.imageSmoothingEnabled=true;this.ctx.imageSmoothingQuality='high';
      // Phones get the dedicated portrait film (hero -> through the bubble -> splash -> formulas).
      // Toggle first: the class sets the section height the scroll span is measured from.
      this.hero.classList.toggle('is-mobile-film',film);
      this.frameVariant=film?'mobile-film-v4':'portrait';this.frameCount=film?134:240;
      document.documentElement.classList.toggle('has-mobile-film',film);
      // the chapter pill must float above the formulas section too, so it leaves the pinned stage on phones
      const rail=this.chapters[0]?.parentElement;
      if(rail){ if(film&&rail.parentElement!==document.body)document.body.appendChild(rail);
        else if(!film&&rail.parentElement===document.body)this.hero.querySelector('.hero-pin').insertBefore(rail,this.cue); }
      this.journeyLayout={w,h,mobile,dpr,span:Math.max(1,this.hero.offsetHeight-h)};
      this.lastDrawnFrame=null;
      if(film)this.startFilm();else this.stopFilm();
      this.updateHero();this.applySourceProgress(this.renderProgress);
    };
    this.journeyResize=new ResizeObserver(this.measureJourney);
    this.journeyResize.observe(this.hero.querySelector('.hero-pin'));
    this.measureJourney();
    if (!this.reduced&&!this.film) fetch('assets/sequence/manifest.json',{signal:this.mediaAbort.signal})
      .then(r=>{if(!r.ok)throw new Error('Sequence manifest');return r.json()})
      .then(data=>{this.sequenceManifest=data;this.lastDrawnFrame=null;this.applySourceProgress(this.renderProgress);})
      .catch(()=>{});
  }

  updateHero() {
    if(!this.journeyLayout)return;
    this.targetProgress=this.reduced?0:this.clamp(-this.hero.getBoundingClientRect().top/this.journeyLayout.span);
    if(this.reduced){this.applySourceProgress(0);return;}
    if(this.sequenceRaf)return;
    let previous=0;
    const tick=now=>{
      this.sequenceRaf=0;if(this.destroyed)return;
      const dt=previous?Math.min(64,now-previous):16.7;previous=now;
      this.renderProgress+=(this.targetProgress-this.renderProgress)*(1-Math.exp(-dt/(this.film?26:32)));
      if(Math.abs(this.targetProgress-this.renderProgress)<(this.film?.00008:.0004))this.renderProgress=this.targetProgress;
      this.applySourceProgress(this.renderProgress);
      if(this.renderProgress!==this.targetProgress)this.sequenceRaf=requestAnimationFrame(tick);
    };
    this.sequenceRaf=requestAnimationFrame(tick);
  }

  // Shorten the establishing holds, preserve every filmed movement in order.
  // No synthetic bottle transform replaces the native liquid / ring sequence.
  sourceFrameAt(p) {
    if(this.frameVariant==='mobile-film-v4'){
      // Three rests: hero -> bottle raised -> orange splash -> formulas. Holds give each scroll stop a still frame.
      const film=[[0,0],[.03,0],[.16,20],[.21,20],[.52,82],[.64,98],[.97,132],[1,133]];
      for(let i=1;i<film.length;i++){
        const [end,last]=film[i],[start,first]=film[i-1];
        if(p<=end)return Math.round(first+(last-first)*this.clamp((p-start)/(end-start)));
      }
      return 133;
    }
    const beats=[[0,0],[.23,64],[.43,106],[.69,164],[.95,239],[1,239]];
    for(let i=1;i<beats.length;i++) {
      const [end,last]=beats[i], [start,first]=beats[i-1];
      if(p<=end)return Math.round(first+(last-first)*this.clamp((p-start)/(end-start)));
    }
    return 239;
  }

  // Phone film: fractional frame position, so neighbouring frames can be blended while scrolling.
  sourcePosAt(p) {
    const film=[[0,0],[.03,0],[.16,20],[.21,20],[.52,82],[.64,98],[.97,132],[1,133]];
    for(let i=1;i<film.length;i++){
      const [end,last]=film[i],[start,first]=film[i-1];
      if(p<=end)return first+(last-first)*this.clamp((p-start)/Math.max(1e-6,end-start));
    }
    return 133;
  }

  applySourceProgress(p) {
    if(!this.journeyLayout)return;
    const phone=this.frameVariant==='mobile-film-v4';
    const pos=phone?this.sourcePosAt(p):null;
    const frame=phone?Math.round(pos):this.sourceFrameAt(p);
    this.wantedFrame=frame;this.filmPos=pos;
    if(p>.01&&this.sequenceManifest&&!this.sequenceWarmStarted&&!this.reduced&&!this.film){
      this.sequenceWarmStarted=true;
      if(!navigator.connection?.saveData)this.warmSequence();
    }
    if(!this.reduced){this.queueSequenceFrames(frame);this.drawSequenceFrame(frame);}

    // Everything below touches the DOM; it runs only when a visible state actually changes,
    // never on every scroll frame (style recalculation is what makes phones stutter).
    const scene=this.reduced?1:phone?(frame<=24?1:frame>=76&&frame<=104?2:0):frame<=69?1:frame>=99&&frame<=168?2:frame>=180?3:0;
    const step=phone?(p<.36?0:p<.985?1:2):(p<.40?0:p<.73?1:2);
    const tag=Math.round((1-this.clamp(p/.1))*20), cue=Math.round((1-this.clamp(p/.06))*20);
    const key=[scene,step,tag,cue,p<.08,p<.985,this.reduced].join('|');
    if(key!==this.heroStateKey){
      this.heroStateKey=key;
      this.sequenceLayer.style.opacity=this.reduced?'0':'1';
      if(!this.formulaOpened){this.formulaOpened=true;this.journeyFormula.classList.add('is-arrived');this.journeyFormula.inert=false;this.journeyFormula.setAttribute('aria-hidden','false');}
      this.copyBlocks.forEach(el=>{
        const active=Number(el.dataset.scene)===scene;
        if(el.classList.contains('is-on')!==active){el.classList.toggle('is-on',active);el.inert=!active;el.setAttribute('aria-hidden',String(!active));}
      });
      this.tagline.style.opacity=String(tag/20);
      this.cue.style.opacity=String(cue/20);
      this.hero.classList.toggle('is-opening',p<.08);
      this.chapters.forEach((button,i)=>{if(i===step)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
      if(phone){
        // The film's last frame is the formulas section itself; the live section fades in exactly on top of it.
        // Its images are decoded while the film plays, so arriving never costs a paint/decode stall.
        if(step>=1&&!this.formulaPrimed){
          this.formulaPrimed=true;
          this.journeyFormula.querySelectorAll('img').forEach(img=>{img.loading='eager';img.decode?.().catch(()=>{});});
        }
        const pending=p<.985;
        this.journeyFormula.classList.toggle('is-film-pending',pending);

        this.hero.classList.toggle('is-film-landed',p>=.985);
        document.documentElement.classList.toggle('film-opening',p<.08);
      }
    }
    if(frame!==this.lastFrameAttr){
      this.lastFrameAttr=frame;
      this.hero.dataset.sourceFrame=String(frame);
      this.hero.dataset.progress=p.toFixed(3);
    }
  }

  /* ---------- Phone film engine ----------
     A Web Worker fetches every frame (first scroll first, then coarse-to-fine) and decodes them
     off the main thread, cropped and resized to the canvas, then hands over ImageBitmaps with
     zero copy. The main thread only blits: scrolling never waits on image decoding. */
  static filmWorkerSource() { return `
    let base,n,order,crop,cw,ch,lanes=6,cursor=0,blobs=[],want=[],inflight=new Set(),active=0,gen=0,resizeOK=true,canBitmap=typeof createImageBitmap==='function';
    const pad=i=>String(i).padStart(3,'0');
    onmessage=e=>{const m=e.data;
      if(m.type==='init'){base=m.base;n=m.n;order=m.order;crop=m.crop;cw=m.cw;ch=m.ch;gen=m.gen;lanes=m.lanes;blobs=new Array(n);
        for(let k=0;k<lanes;k++)lane();}
      else if(m.type==='size'){crop=m.crop;cw=m.cw;ch=m.ch;gen=m.gen;inflight.clear();}
      else if(m.type==='want'){want=m.list;pump();}
    };
    async function lane(){
      while(cursor<order.length){const i=order[cursor++];if(blobs[i])continue;
        for(let a=0;a<3;a++){try{const r=await fetch(base+'f'+pad(i)+'.webp',{priority:cursor<42?'high':'low'});if(!r.ok)throw 0;blobs[i]=await r.blob();break;}catch(_){await new Promise(r=>setTimeout(r,180*(a+1)));}}
        if(blobs[i]&&!canBitmap)postMessage({type:'blob',i,blob:blobs[i]});
        pump();
      }
    }
    function pump(){
      if(!canBitmap)return;
      while(active<3){
        const k=want.findIndex(i=>blobs[i]&&!inflight.has(i));
        if(k<0)return;
        const i=want.splice(k,1)[0];inflight.add(i);active++;
        decode(i,gen).finally(()=>{active--;inflight.delete(i);pump();});
      }
    }
    async function decode(i,g){
      const b=blobs[i];let bm=null,full=false;
      try{if(resizeOK)bm=await createImageBitmap(b,crop[0],crop[1],crop[2],crop[3],{resizeWidth:cw,resizeHeight:ch,resizeQuality:'high'});}catch(_){resizeOK=false;}
      if(!bm){try{bm=await createImageBitmap(b,crop[0],crop[1],crop[2],crop[3]);}catch(_){try{bm=await createImageBitmap(b);full=true;}catch(__){}}}
      if(bm)postMessage({type:'bitmap',i,gen:g,full,bitmap:bm},[bm]);
    }`; }

  startFilm() {
    const cw=this.canvas.width, ch=this.canvas.height, n=this.frameCount;
    const base=new URL(`assets/sequence/${this.frameVariant}/`,location.href).href;
    const prev=this.film;
    if(prev&&prev.base===base&&prev.cw===cw&&prev.ch===ch)return;
    const SW=720,SH=1560,scale=Math.max(cw/SW,ch/SH),sw=cw/scale,sh=ch/scale;
    const f=this.film={base,cw,ch,n,crop:[(SW-sw)/2,(SH-sh)/2,sw,sh],gen:(prev?.gen||0)+1,
      bitmaps:new Map(),blobs:prev?.base===base?prev.blobs:new Array(n),keep:30,ahead:24,behind:6,dir:1,last:0,drawKey:'',worker:null,ver:0};
    prev?.bitmaps.forEach(e=>e.bitmap.close?.());
    if(prev?.worker&&prev.base===base){
      f.worker=prev.worker;f.worker.postMessage({type:'size',crop:f.crop,cw,ch,gen:f.gen});
    }else{
      prev?.worker?.terminate();
      const order=[],seen=new Set(),add=i=>{if(i>=0&&i<n&&!seen.has(i)){seen.add(i);order.push(i);}};
      for(let i=0;i<=24;i++)add(i);
      for(const step of [8,4,2,1])for(let i=0;i<n;i+=step)add(i);
      try{
        const url=URL.createObjectURL(new Blob([GoomSite.filmWorkerSource()],{type:'text/javascript'}));
        f.worker=new Worker(url);URL.revokeObjectURL(url);
        f.worker.postMessage({type:'init',base,n,order,crop:f.crop,cw,ch,gen:f.gen,lanes:navigator.connection?.saveData?2:6});
      }catch(_){f.worker=null;}
    }
    if(f.worker)f.worker.onmessage=e=>this.onFilmMessage(e.data);
    this.filmQueue(this.wantedFrame??0);
  }

  onFilmMessage(m) {
    const f=this.film;
    if(!f){m.bitmap?.close();return;}
    if(m.type==='bitmap'){
      if(m.gen!==f.gen||f.bitmaps.has(m.i)||this.destroyed){m.bitmap.close();return;}
      f.bitmaps.set(m.i,{bitmap:m.bitmap,full:m.full,i:m.i});f.ver++;
      this.filmEvict();
      if(Math.abs(m.i-(this.filmPos??this.wantedFrame))<2||!this.hero.classList.contains('sequence-ready'))this.filmDraw(this.filmPos);
    }else if(m.type==='blob'){
      // very old engines: the worker cannot decode, so the page does it (still async)
      f.blobs[m.i]=m.blob;this.filmQueue(this.wantedFrame??0);
    }
  }

  stopFilm() {
    if(!this.film)return;
    this.film.bitmaps.forEach(e=>e.bitmap.close?.());
    this.film.worker?.terminate();
    this.film=null;
  }

  filmEvict() {
    const f=this.film,c=this.wantedFrame??0;
    if(!f||f.bitmaps.size<=f.keep)return;
    const lo=f.dir>0?c-f.behind:c-f.ahead, hi=f.dir>0?c+f.ahead:c+f.behind;
    [...f.bitmaps.keys()].filter(i=>i<lo||i>hi).sort((a,b)=>Math.abs(b-c)-Math.abs(a-c))
      .slice(0,f.bitmaps.size-f.keep).forEach(i=>{f.bitmaps.get(i).bitmap.close?.();f.bitmaps.delete(i);f.ver++;});
  }

  filmQueue(center) {
    const f=this.film; if(!f)return;
    const dir=center>f.last?1:center<f.last?-1:f.dir; f.dir=dir; f.last=center;
    const list=[];
    const push=i=>{if(i>=0&&i<f.n&&!f.bitmaps.has(i))list.push(i);};
    push(center);push(center+dir);
    for(let d=1;d<=f.ahead;d++){push(center+dir*(d+1));if(d<=f.behind)push(center-dir*d);}
    if(f.worker){
      const sig=f.ver+':'+list.join(',');
      if(sig!==f.lastWant){f.lastWant=sig;f.worker.postMessage({type:'want',list});}
    }else{
      // fallback: decode on the page, one at a time
      if(f.decodingMain)return;
      const i=list.find(k=>f.blobs[k]);
      if(i===undefined)return;
      f.decodingMain=true;
      createImageBitmap(f.blobs[i]).then(bm=>{f.decodingMain=false;if(this.film!==f){bm.close();return;}
        f.bitmaps.set(i,{bitmap:bm,full:true,i});this.filmEvict();this.filmDraw(this.filmPos);this.filmQueue(this.wantedFrame);},()=>{f.decodingMain=false;});
    }
  }

  filmBlit(e,alpha) {
    const f=this.film,ctx=this.ctx;
    ctx.globalAlpha=alpha;
    if(e.full){const [sx,sy,sw,sh]=f.crop;ctx.drawImage(e.bitmap,sx,sy,sw,sh,0,0,f.cw,f.ch);}
    else ctx.drawImage(e.bitmap,0,0,f.cw,f.ch);
  }

  filmDraw(pos) {
    const f=this.film; if(!f)return;
    pos=pos??this.wantedFrame??0;
    const a=Math.floor(pos), t=pos-a;
    let A=f.bitmaps.get(a), B=t>.04?f.bitmaps.get(Math.min(f.n-1,a+1)):null;
    if(!A&&B&&t>=.5){A=B;B=null;}
    if(!A){let best=1e9;f.bitmaps.forEach(e=>{const d=Math.abs(e.i-pos);if(d<best){best=d;A=e;}});B=null;}
    if(!A)return;
    const mix=B?Math.round(t*16)/16:0;
    const key=A.i+'|'+(B?B.i+':'+mix:'');
    if(key===f.drawKey)return;
    f.drawKey=key;
    this.ctx.setTransform(1,0,0,1,0,0);
    this.filmBlit(A,1);
    if(B&&mix>0)this.filmBlit(B,mix);
    this.ctx.globalAlpha=1;
    const shown=B&&mix>=.5?B.i:A.i;
    if(shown!==this.renderedAttr){this.renderedAttr=shown;this.hero.dataset.renderedFrame=String(shown);}
    if(!this.filmReady){this.filmReady=true;this.hero.classList.add('sequence-ready');}
  }

  queueSequenceFrames(center) {
    if(this.reduced||this.destroyed)return;
    if(this.film)return this.filmQueue(center);
    const variant=this.frameVariant;
    const frames=[center];
    const direction=center>=(this.previousWanted??0)?1:-1;
    for(let d=1;d<=5;d++){frames.push(center+d*direction,center-d*direction);}
    this.previousWanted=center;
    this.frameQueue=frames.filter(n=>n>=0&&n<this.frameCount).map(n=>({n,key:variant+':'+n,variant}))
      .filter(x=>!this.frameCache.has(x.key)&&!this.framePending.has(x.key)&&!this.frameFailures.has(x.key));
    this.pumpSequenceFrames();
  }

  pumpSequenceFrames() {
    while(this.frameWorkers<3&&this.frameQueue.length){
      const job=this.frameQueue.shift();
      if(this.frameCache.has(job.key)||this.framePending.has(job.key))continue;
      this.frameWorkers++;this.framePending.add(job.key);
      const url=`assets/sequence/${job.variant}/f${String(job.n).padStart(3,'0')}.webp`;
      fetch(url,{cache:'force-cache',signal:this.mediaAbort.signal})
        .then(r=>{if(!r.ok)throw new Error('Frame '+job.n);return r.blob();})
        .then(blob=>createImageBitmap(blob))
        .then(bitmap=>{
          if(this.destroyed){bitmap.close();return;}
          this.frameCache.set(job.key,{bitmap,n:job.n,variant:job.variant});
          const keep=12;
          while(this.frameCache.size>keep){
            const victim=[...this.frameCache.entries()].sort((a,b)=>{
              const score=v=>Math.abs(v.n-this.wantedFrame)+(v.variant!==this.frameVariant?1000:0);
              return score(b[1])-score(a[1]);
            })[0];
            victim[1].bitmap.close();this.frameCache.delete(victim[0]);
          }
          if(!this.decodeRaf)this.decodeRaf=requestAnimationFrame(()=>{this.decodeRaf=0;this.drawSequenceFrame(this.wantedFrame);});
        })
        .catch(e=>{
          if(e.name==='AbortError'||this.destroyed)return;
          const attempts=(this.frameAttempts.get(job.key)||0)+1;
          this.frameAttempts.set(job.key,attempts);
          if(attempts>=3)this.frameFailures.add(job.key);
          else setTimeout(()=>{if(!this.destroyed)this.queueSequenceFrames(this.wantedFrame);},250*attempts);
        })
        .finally(()=>{this.frameWorkers--;this.framePending.delete(job.key);if(!this.destroyed)this.pumpSequenceFrames();});
    }
  }

  drawSequenceFrame(want) {
    if(!this.ctx||this.reduced)return;
    if(this.film)return this.filmDraw(this.filmPos??want);
    const variant=this.frameVariant;
    let frame=this.frameCache.get(variant+':'+want);
    if(!frame)frame=[...this.frameCache.values()].filter(f=>f.variant===variant).sort((a,b)=>Math.abs(a.n-want)-Math.abs(b.n-want))[0];
    if(!frame)return;
    const key=variant+':'+frame.n;
    if(key===this.lastDrawnFrame)return;
    const {w,h,mobile,dpr}=this.journeyLayout;
    const ctx=this.ctx;ctx.setTransform(dpr,0,0,dpr,0,0);
    // Portrait frames are composed offline. One scale preserves the exact
    // source proportions at every phone ratio; the camera never stretches art.
    ctx.fillStyle='#dfd0ec';ctx.fillRect(0,0,w,h);
    const scale=Math.max(w/frame.bitmap.width,h/frame.bitmap.height);
    const dw=frame.bitmap.width*scale,dh=frame.bitmap.height*scale;
    ctx.drawImage(frame.bitmap,(w-dw)/2,(h-dh)/2,dw,dh);
    this.lastDrawnFrame=key;this.hero.dataset.renderedFrame=String(frame.n);
    this.hero.classList.add('sequence-ready');
  }

  async warmSequence() {
    // Warm compressed HTTP cache with bounded concurrency, never decode the film
    // into hundreds of full-resolution bitmaps (mobile memory stays bounded).
    const variant=this.frameVariant;
    let cursor=0;
    const worker=async()=>{
      while(cursor<this.frameCount&&!this.destroyed){
        const n=cursor++;
        try{
          const r=await fetch(`assets/sequence/${variant}/f${String(n).padStart(3,'0')}.webp`,{cache:'force-cache',priority:'low',signal:this.mediaAbort.signal});
          if(r.ok)await r.arrayBuffer();
        }catch(e){if(e.name==='AbortError')return;}
      }
    };
    await Promise.all([worker(),worker()]);
  }

  initNavigation() {
    this.navAbort = new AbortController();
    const signal = this.navAbort.signal;
    const menu = document.querySelector('.goom-menu');
    const nav = document.querySelector('.goom-nav');
    const closeMenu = () => { this.header.classList.remove('menu-open'); menu?.setAttribute('aria-expanded','false'); };
    if (menu && nav) {
      nav.id = 'main-navigation';
      menu.setAttribute('aria-controls',nav.id);
      menu.setAttribute('aria-expanded','false');
      menu.addEventListener('click',() => {
        const open = this.header.classList.toggle('menu-open');
        menu.setAttribute('aria-expanded',String(open));
      },{signal});
      document.addEventListener('keydown',event => { if(event.key==='Escape'){closeMenu();menu.focus();} },{signal});
    }
    document.addEventListener('click',event => {
      const chapter = event.target.closest('[data-chapter]');
      const anchor = event.target.closest('a[href^="#"]');
      if (!chapter && !anchor) return;
      closeMenu();
      const id = anchor?.getAttribute('href');
      if (chapter) {
        event.preventDefault();
        const beat=(this.frameVariant==='mobile-film-v4'?[0,.58,1]:[0,.50,.86])[Number(chapter.dataset.chapter)];
        const top=this.hero.getBoundingClientRect().top+scrollY+beat*this.journeyLayout.span;
        window.scrollTo({top,behavior:this.reduced?'instant':'smooth'});
      } else if(id==='#formulas') {
        event.preventDefault();
        scrollTo({top:this.journeyFormula.getBoundingClientRect().top+scrollY,behavior:this.reduced?'instant':'smooth'});
      }

    },{signal});
    this.formulaSection?.addEventListener('keydown',event => {
      if (!event.target.closest('.formula-arrow')) return;
      const step = event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;
      if (!step) return;
      event.preventDefault();
      const next = (this.formulaActive+step+this.formulaTotal)%this.formulaTotal;
      this.goToFormula(next,true);

    },{signal});
    const followHash=()=>{
      if(location.hash==='#how'){
        history.replaceState(null,'','#ritual');
        requestAnimationFrame(()=>document.querySelector('#ritual').scrollIntoView({behavior:'instant'}));
      }else if(location.hash==='#formulas'){
        requestAnimationFrame(()=>this.journeyFormula.scrollIntoView({behavior:'instant',block:'start'}));
      }
    };
    window.addEventListener('hashchange',followHash,{signal});
    followHash();

  }

  initRitual() {
    const section = document.querySelector('.ritual');
    if (!section) return;
    const images = [...section.querySelectorAll('[data-ritual-product]')];
    const buttons = [...section.querySelectorAll('[data-ritual]')];
    const notes = ['פותחים את היום בצבע. B12 + D3 + B9.','רגע לעצמך, בקצב שלך. Flow.','מורידים הילוך בסוף היום. Deep Sleep.'];
    const select = active => {
      images.forEach((img,i) => {
        const offset=(i-active+3)%3;
        const x=[0,-115,115][offset], z=[100,-100,-130][offset], rot=[-8,-19,16][offset];
        img.style.transform=`translate(-50%,-50%) translate3d(${x}%,${offset?6:0}%,${z}px) rotate(${rot}deg)`;
        img.style.opacity=offset?'.65':'1';
        img.style.zIndex=offset?'1':'3';
      });
      buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===active)));
      section.querySelector('[data-ritual-note]').textContent=notes[active];
    };
    buttons.forEach((button,i)=>button.addEventListener('click',()=>select(i)));
    select(0);
  }

  initFaq() {
    const list = document.querySelector('[data-faq]');
    if (!list) return;
    list.addEventListener('click', event => {
      const button = event.target.closest('[data-faq-q]');
      if (!button) return;
      const item = button.parentElement;
      const open = item.classList.toggle('is-open');
      button.setAttribute('aria-expanded', String(open));
      [...list.children].forEach(other => {
        if (other === item) return;
        other.classList.remove('is-open');
        other.querySelector('[data-faq-q]')?.setAttribute('aria-expanded', 'false');
      });
    });
  }

  initReveals() {
    document.querySelectorAll('.ritual-stage,.gh-brand-copy,.gh-brand-photo,.faq-item,.footer-col,.bundles-heading,.community-head').forEach(el=>el.setAttribute('data-reveal',''));
    const elements=[...document.querySelectorAll('[data-reveal]')];
    if(this.reduced||!('IntersectionObserver' in window)){elements.forEach(el=>el.classList.add('is-visible'));return;}
    this.revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting)entry.target.classList.add('is-visible');
      else if(entry.boundingClientRect.top>innerHeight)entry.target.classList.remove('is-visible');
    }),{threshold:.08,rootMargin:'0px 0px -4% 0px'});
    elements.forEach(el=>{const siblings=[...el.parentElement.children].filter(n=>n.hasAttribute('data-reveal'));el.style.transitionDelay=`${Math.min(siblings.indexOf(el),3)*80}ms`;this.revealObserver.observe(el);});
  }

  initAmbientMotion() {
    // Background videos download only when they are about to be seen.
    // Video covers are fetched only when their section is near, so the opening film gets the bandwidth.
    const covered=[...document.querySelectorAll('video[data-poster]')];
    if(covered.length){
      const setPoster=v=>{if(v.dataset.poster){v.poster=v.dataset.poster;delete v.dataset.poster;}};
      if('IntersectionObserver' in window){
        const sections=[...new Set(covered.map(v=>v.closest('section')||v))];
        this.posterObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
          if(!entry.isIntersecting)return;
          entry.target.querySelectorAll?.('video[data-poster]').forEach(setPoster);
          if(entry.target.matches?.('video[data-poster]'))setPoster(entry.target);
          this.posterObserver.unobserve(entry.target);
        }),{rootMargin:'900px 0px'});
        sections.forEach(el=>this.posterObserver.observe(el));
      }else covered.forEach(setPoster);
    }
    const lazyVideos=[...document.querySelectorAll('video[data-autoplay]')];
    if(lazyVideos.length&&'IntersectionObserver' in window){
      this.videoObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
        const v=entry.target;
        if(entry.isIntersecting){if(v.preload!=='auto')v.preload='auto';if(!this.reduced)v.play?.().catch(()=>{});}
        else v.pause?.();
      }),{rootMargin:'300px 0px'});
      lazyVideos.forEach(v=>this.videoObserver.observe(v));
    }
    if(this.reduced)return;
    this.motionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('motion-visible',entry.isIntersecting)),{threshold:.05});
    document.querySelectorAll('.ritual,.bundles,.final-cta,.gh-brand,#press,#community').forEach(el=>this.motionObserver.observe(el));
  }

  /* ---------- Formula stage ---------- */
  initFormula() {
    const section = document.querySelector('[data-formula]');
    if (!section) return;
    const rail = section.querySelector('[data-formula-rail]');
    const stage = section.querySelector('.formula-stage');
    const caption = section.querySelector('[data-formula-caption]');
    const nodes = section.querySelector('.formula-nodes');
    const fill = section.querySelector('[data-track-fill]');
    const blob = section.querySelector('.formula-plate');
    if (!rail || !caption || !nodes || !fill) return;

    this.formulas = [
      { id:'b12', ink:'#8a5a00', img:'assets/p-b12.webp', accent:'#e0a012', label:'B12+D3+B9', name:'B12+D3+B9',
        kicker:'5-IN-1 · PASSION FRUIT',
        line:'האנרגיה של היום־יום, בלי הצניחה של אחרי הצהריים.',
        bullets:['B12, D3, B9, אבץ וברזל','60 גומיות בטעם פסיפלורה','גומי אחד ביום, בלי כוס מים'] },
      { id:'grow', ink:'#175a86', img:'assets/p-grow.webp', accent:'#2f9fe0', label:'Grow', name:'Grow',
        kicker:'MEN · BERRY',
        line:'ביוטין, אבץ ו־B12 לשיער, לעור ולציפורניים.',
        bullets:['ביוטין + אבץ + B12','60 גומיות בטעם פירות יער','מותאם לשגרה של גברים'] },
      { id:'flow', ink:'#a33512', img:'assets/flow-clean.webp', accent:'#f45f2b', label:'Flow', name:'Flow',
        kicker:'2-IN-1 · TUTTI FRUTTI',
        line:'פרוביוטיקה וסיבים פרהביוטיים לעיכול מאוזן ולתחושת קלילות.',
        bullets:['פרוביוטיקה + סיבים פרהביוטיים','60 גומיות בטעם טוטי פרוטי','הפורמולה הנמכרת ביותר שלנו'] },
      { id:'shine', ink:'#8d1a14', img:'assets/p-shine.webp', accent:'#e0342c', label:'Shine', name:'Shine',
        kicker:'3-IN-1 · MIXED BERRIES',
        line:'קולגן וחומצה היאלורונית לזוהר שרואים מבפנים החוצה.',
        bullets:['קולגן + חומצה היאלורונית','40 גומיות בטעם פירות יער','משלים יפה את Flow'] },
      { id:'sleep', ink:'#392c96', img:'assets/p-sleep.webp', accent:'#5b4bd6', label:'Deep Sleep', name:'Deep Sleep',
        kicker:'5-IN-1 · LAVENDER',
        line:'מלטונין, מגנזיום ו־L־תיאנין ללילה שקט ולבוקר צלול.',
        bullets:['מלטונין + L־תיאנין + מגנזיום','60 גומיות בטעם לבנדר','לקחת כחצי שעה לפני השינה'] }
    ];

    const total = this.formulas.length;
    this.formulaActive = -1;
    this.formulaItems = this.formulas.map((f, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'formula-item';
      item.dataset.index = String(index);
      item.setAttribute('aria-label', `הצגת פורמולת ${f.name}`);
      // Phones get the same bottle with its shadow baked in: a live drop-shadow filter is re-rasterised
      // by WebKit on every state change and caused the stall when the film hands over to this section.
      const baked = this.bakedShadows ??= window.matchMedia('(max-width:900px)').matches;
      item.innerHTML = baked
        ? `<img class="is-baked" src="${f.img.replace('.webp','-sh.webp')}" alt="${f.name}" loading="lazy" decoding="async">`
        : `<img src="${f.img}" alt="${f.name}" loading="lazy" decoding="async">`;
      item.tabIndex=-1;item.style.pointerEvents='none';
      rail.appendChild(item);
      return item;
    });

    this.formulaNodes = this.formulas.map((f, index) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'formula-node';
      node.setAttribute('role', 'tab');
      node.id = 'formula-tab-' + index;
      node.setAttribute('aria-controls','formula-panel');
      node.setAttribute('aria-label', f.name);
      node.innerHTML = `<i></i><span>${f.label}</span>`;
      node.addEventListener('click', () => this.goToFormula(index, true));
      nodes.appendChild(node);
      return node;
    });
    this.formulaFill = fill;
    this.formulaCaption = caption;
    caption.id = 'formula-panel';
    caption.setAttribute('role','tabpanel');
    this.formulaSection = section;
    this.formulaStage = stage;
    this.formulaBlob = blob;
    this.formulaTotal = total;

    /* Bottles ride a 3D ring: the active one faces front, the rest wrap around
       the sides and back, so the group stays balanced whichever one is picked. */
    this.layoutFormula = () => {
      if (this.formulaActive < 0) return;
      const width = stage ? stage.clientWidth : window.innerWidth;
      const rx = Math.min(width * 0.42, 432);
      const rz = 620;
      const arc = (Math.PI * 2) / total;
      this.formulaItems.forEach((item, index) => {
        let offset = index - this.formulaActive;
        offset -= Math.round(offset / total) * total;
        const angle = offset * arc;
        const distance = Math.abs(offset);
        item.style.setProperty('--x', `${rx * Math.sin(angle)}px`);
        item.style.setProperty('--y', `${distance * 13}px`);
        item.style.setProperty('--z', `${rz * Math.cos(angle) - rz}px`);
        item.style.setProperty('--ry', `${-offset * 15}deg`);
        item.style.zIndex = String(30 - Math.round(distance * 10));
        item.style.opacity = distance > 1.5 ? '.74' : '1';
        item.classList.toggle('is-dim', distance > 0.5);
      });
    };

    /* Scroll owns the index; the arrows and dots scroll to a beat so the two
       controls can never disagree about where you are. */
    this.goToFormula = (index, seek) => {
      const next = Math.max(0, Math.min(total - 1, index));
      if (next === this.formulaActive) return;
      const first = this.formulaActive < 0;
      this.formulaActive = next;
      const data = this.formulas[next];
      section.style.setProperty('--f-accent', data.accent);
      section.style.setProperty('--f-accent-ink', data.ink);
      this.formulaNodes.forEach((node, i) => { node.setAttribute('aria-selected', String(i === next)); node.tabIndex = i === next ? 0 : -1; });
      this.formulaCaption.setAttribute('aria-labelledby','formula-tab-'+next);
      this.formulaFill.style.transform = `scaleX(${next / (total - 1)})`;
      if (this.formulaBlob) this.formulaBlob.style.setProperty('--blob-scale', String(1 + next * 0.014));
      this.layoutFormula();

      const paint = () => {
        this.formulaCaption.innerHTML = `<div class="formula-caption-inner">
          <span class="f-kicker" dir="ltr">${data.kicker}</span>
          <h3>${data.name}</h3>
          <p>${data.line}</p>
          <ul>${data.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
          <a class="f-cta" href="https://goom.co.il">להזמנת ${data.name}</a>
        </div>`;
        this.formulaCaption.classList.remove('is-swapping');
      };
      if (first || this.reduced) { paint(); return; }
      this.formulaCaption.classList.add('is-swapping');
      clearTimeout(this.captionTimer);
      this.captionTimer = setTimeout(paint, 200);
    };

    section.querySelector('[data-f-prev]')?.addEventListener('click', () => this.goToFormula((this.formulaActive + total - 1) % total, true));
    section.querySelector('[data-f-next]')?.addEventListener('click', () => this.goToFormula((this.formulaActive + 1) % total, true));

    this.updateFormula = () => {};
    window.addEventListener('resize', this.layoutFormula);
    this.goToFormula(2);
  }

  /* A portrait scroll chapter: each touch / wheel gesture advances one card.
     The first/last boundaries always release back to normal document scroll. */
  initBundleJourney() {
    const section=document.querySelector('#bundles');
    if(!section)return;
    const cards=[...section.querySelectorAll('.bundle-card')];
    const dots=[...section.querySelectorAll('[data-bundle-step]')];
    const media=matchMedia('(max-width:900px) and (orientation:portrait)');
    this.bundleAbort=new AbortController();
    const signal=this.bundleAbort.signal;
    const enabled=()=>media.matches&&!this.reduced;
    let active=-1,touchStart=0,touchConsumed=false,wheelConsumed=false;
    const geometry=()=>{
      const top=section.getBoundingClientRect().top+scrollY;
      const height=section.querySelector('.bundles-pin').clientHeight;
      return {top,height,span:section.offsetHeight-height};
    };
    const paint=index=>{
      if(index===active)return;
      active=index;section.dataset.activeBundle=String(index);
      cards.forEach((card,i)=>{
        card.classList.add('is-visible');
        card.classList.toggle('is-current',i===index);
        card.classList.toggle('is-before',i<index);
        card.inert=enabled()&&i!==index;
        card.setAttribute('aria-hidden',String(enabled()&&i!==index));
      });
      dots.forEach((dot,i)=>i===index?dot.setAttribute('aria-current','step'):dot.removeAttribute('aria-current'));
    };
    this.updateBundles=()=>{
      if(!enabled()){
        cards.forEach(card=>{card.inert=false;card.removeAttribute('aria-hidden');});
        active=-1;return;
      }
      const {top,height}=geometry();
      paint(this.clamp(Math.round((scrollY-top)/(height*.8)),0,cards.length-1));
    };
    const seek=index=>{
      const {top,height}=geometry();
      paint(index);
      // An instant document position change keeps the sticky stage stationary;
      // the cards themselves carry the visible, interruptible transition.
      scrollTo({top:top+index*height*.8,behavior:'instant'});
    };
    const step=direction=>{
      if(!enabled())return false;
      const {top,span}=geometry(),local=scrollY-top;
      if(local< -1||local>span+1)return false;
      if(direction<0&&active===0)return false;
      if(direction>0&&active===cards.length-1)return false;
      seek(this.clamp(active+direction,0,cards.length-1));return true;
    };
    section.addEventListener('touchstart',event=>{
      if(event.touches.length!==1)return;
      touchStart=event.touches[0].clientY;touchConsumed=false;
    },{passive:true,signal});
    section.addEventListener('touchmove',event=>{
      if(!enabled()||event.touches.length!==1)return;
      const delta=touchStart-event.touches[0].clientY;
      if(touchConsumed){event.preventDefault();return;}
      const {top,span}=geometry(),local=scrollY-top;
      const canStep=delta>0?active<cards.length-1:active>0;
      if(local>=-1&&local<=span+1&&canStep)event.preventDefault();
      if(Math.abs(delta)<32)return;
      if(step(Math.sign(delta))){touchConsumed=true;event.preventDefault();}
    },{passive:false,signal});
    section.addEventListener('wheel',event=>{
      if(!enabled()||Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;
      clearTimeout(this.bundleWheelTimer);
      this.bundleWheelTimer=setTimeout(()=>{wheelConsumed=false;},180);
      if(wheelConsumed){event.preventDefault();return;}
      if(step(Math.sign(event.deltaY))){wheelConsumed=true;event.preventDefault();}
    },{passive:false,signal});
    section.addEventListener('keydown',event=>{
      if(event.target.closest('a,button,input'))return;
      const direction=['ArrowDown','PageDown',' '].includes(event.key)?1:['ArrowUp','PageUp'].includes(event.key)?-1:0;
      if(direction&&step(direction))event.preventDefault();
    },{signal});
    dots.forEach((dot,i)=>dot.addEventListener('click',()=>seek(i),{signal}));
    media.addEventListener('change',()=>{active=-1;this.updateBundles();},{signal});
    this.updateBundles();
  }

  /* ---------- Testimonial ring ---------- */
  initStories() {
    const stories = document.querySelector('#stories');
    const scene = stories?.querySelector('[data-stories-scene]');
    const ring = stories?.querySelector('[data-ring3d]');
    const slots = ring ? [...ring.querySelectorAll('[data-slot]')] : [];
    if (!stories || !scene || !ring || !slots.length) return;

    const count = slots.length;
    const stepAngle = 360 / count;
    const speed = 360 / 40000;
    let angle = 0;
    let paused = this.reduced;
    let hovering = false;
    let dragging = false;
    let dragStart = 0;
    let dragAngle = 0;
    let last = 0;

    const apply = (free) => { ring.classList.toggle('is-free', free !== false); ring.style.transform = `rotateY(${angle}deg)`; };
    const tick = (now) => {
      if (!this.storiesVisible) { this.storyRaf = 0; last = 0; return; }
      this.storyRaf = requestAnimationFrame(tick);
      const delta = last ? Math.min(64, now - last) : 0;
      last = now;
      if (paused || hovering || dragging) return;
      angle -= delta * speed;
      apply(true);
    };

    const toggle = stories.querySelector('[data-spin-toggle]');
    const setPaused = (value) => {
      paused = value;
      if (!toggle) return;
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.textContent = paused ? 'המשך הסיבוב' : 'עצירת הסיבוב';
    };

    /* Taking manual control stops the drift — otherwise the card you just
       stepped to slides away while you are reading it. */
    const snap = (step) => {
      setPaused(true);
      angle = (Math.round(angle / stepAngle) + step) * stepAngle;
      apply(false);
    };

    stories.querySelector('[data-arrow="prev"]')?.addEventListener('click', () => snap(1));
    stories.querySelector('[data-arrow="next"]')?.addEventListener('click', () => snap(-1));
    toggle?.addEventListener('click', () => setPaused(!paused));
    if (this.reduced) setPaused(true);

    scene.addEventListener('pointerenter', event => { hovering = event.pointerType==='mouse'; });
    scene.addEventListener('pointerleave', () => { hovering = false; });
    let moved = false;
    scene.addEventListener('pointerdown', event => {
      dragging = true;
      moved = false;
      dragStart = event.clientX;
      dragAngle = angle;
    });
    scene.addEventListener('pointermove', event => {
      if (!dragging) return;
      if (Math.abs(event.clientX - dragStart) > 4) {
        moved = true;
        scene.setPointerCapture?.(event.pointerId);
      }
      angle = dragAngle + (event.clientX - dragStart) * 0.28;
      apply(true);
    });
    const endDrag = event => {
      if (!dragging) return;
      dragging = false;
      if(scene.hasPointerCapture?.(event.pointerId))scene.releasePointerCapture(event.pointerId);
      if (moved) setPaused(true);
      angle = Math.round(angle / stepAngle) * stepAngle;
      apply(false);
    };
    scene.addEventListener('pointerup', endDrag);
    scene.addEventListener('pointercancel', endDrag);

    slots.forEach(slot => slot.addEventListener('click', () => {
      if (moved) return;
      const video = slot.querySelector('video');
      if (!video) return;
      slots.forEach(other => { if (other !== slot) other.querySelector('video')?.pause(); });
      if (video.paused) { setPaused(true);video.preload = 'auto';video.muted=false;video.play().catch(() => {}); }
      else video.pause();
    }));

    this.storiesVisible = false;
    this.storyObserver = new IntersectionObserver(([entry]) => {
      this.storiesVisible = entry.isIntersecting;
      if (entry.isIntersecting) { stories.classList.add('is-in-view'); if (!this.storyRaf) this.storyRaf = requestAnimationFrame(tick); }
    }, { threshold: 0.08 });
    this.storyObserver.observe(stories);

    apply(true);
  }


}

const site = new GoomSite();
site.mount();
window.addEventListener('pagehide', event => { if (!event.persisted) site.destroy(); });
window.addEventListener('pageshow', event => { if (event.persisted) site.updateScroll(); });
window.goomDiagnostics = () => ({
  frame: site.wantedFrame, renderedFrame: Number(site.hero.dataset.renderedFrame),
  cachedFrames: site.frameCache.size, pendingFrames: site.framePending.size,
  variant: site.frameVariant, failedFrames: site.frameFailures.size,
  progress: site.renderProgress, reducedMotion: site.reduced
});
