const {chromium}=require('/Users/yanaimizrahi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:'/Users/yanaimizrahi/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5500/GOOM%202026.dc.html');
await page.waitForSelector('.journey-flow');await page.waitForTimeout(1200);
await page.screenshot({path:'qa/cinematic-desktop-hero.png'});
console.log('initial',await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,hero:document.querySelector('.hero').getBoundingClientRect().toJSON(),flow:document.querySelector('.journey-flow').getBoundingClientRect().toJSON(),style:getComputedStyle(document.querySelector('.hero')).height})));
for(const [name,p] of [['transition',.29],['splash',.5],['landing',.82],['formulas',1]]){
 await page.evaluate(p=>{document.documentElement.style.scrollBehavior='auto'; const el=document.querySelector('.hero');scrollTo(0,(el.offsetHeight-document.querySelector('.hero-pin').clientHeight)*p)},p);
 await page.waitForTimeout(700);await page.screenshot({path:`qa/cinematic-desktop-${name}.png`});
}
await page.locator('[data-f-next]').click();await page.waitForTimeout(700);console.log('formula switch',await page.locator('.formula-caption h3').innerText());
await page.locator('[data-ritual="1"]').scrollIntoViewIfNeeded();await page.locator('[data-ritual="1"]').click();await page.waitForTimeout(700);await page.screenshot({path:'qa/cinematic-desktop-ritual.png'});
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(700);await page.screenshot({path:'qa/cinematic-mobile-hero.png'});
for(const [name,p] of [['splash',.5],['formulas',1]]){await page.evaluate(p=>scrollTo(0,(document.querySelector('.hero').offsetHeight-document.querySelector('.hero-pin').clientHeight)*p),p);await page.waitForTimeout(700);await page.screenshot({path:`qa/cinematic-mobile-${name}.png`});}
console.log('mobile overflow',await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})));console.log('errors',errors);
await browser.close();
})();
