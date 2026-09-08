/* Deterministic enhancement: same pixels/poses throughout the requested sequence. */
const sharp=require('/Users/yanaimizrahi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs=require('fs'),path=require('path');
sharp.concurrency(2);
const enhance=(input,width)=>sharp(input).resize(width,null,{kernel:'lanczos3'}).modulate({saturation:1.22,brightness:1.01}).linear(1.065,-8).sharpen({sigma:.9,m1:.65,m2:1.8,x1:2,y2:8,y3:8});
(async()=>{
const dir='assets/ezgif-8bf509dc7bc9d281-jpg';
for(const name of fs.readdirSync(dir).filter(x=>/^ezgif-frame-\d+\.jpg$/.test(x)).sort()) await enhance(path.join(dir,name),1920).jpeg({quality:94,chromaSubsampling:'4:4:4'}).toFile(path.join(dir,'enhanced',name));
const colors=[];
for(let n=0;n<=172;n++){
 const input=`/tmp/goom-source-sequence/${String(n).padStart(3,'0')}.png`,name=`f${String(n).padStart(3,'0')}.webp`;
 await Promise.all([enhance(input,1920).webp({quality:91,effort:4}).toFile(`assets/sequence/desktop/${name}`),enhance(input,1280).webp({quality:90,effort:4}).toFile(`assets/sequence/mobile/${name}`)]);
 const {data}=await sharp(input).extract({left:12,top:90,width:30,height:30}).resize(1,1).modulate({saturation:1.22,brightness:1.01}).linear(1.065,-8).removeAlpha().raw().toBuffer({resolveWithObject:true});colors.push([...data]);
 if(n%24===0)console.log('Enhanced',n);
}
fs.writeFileSync('assets/sequence/manifest.json',JSON.stringify({version:2,fps:24,count:173,width:1920,height:1080,endTime:172/24,colors,cut:'Before the final isolated ring and filmed lineup.'}));
})();
