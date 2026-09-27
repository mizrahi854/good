"""Compose the complete original film into 720x1560 portrait frames.
The source artwork is scaled uniformly: no stretched bottles and no still-to-film swap.
Camera keyframes are shared by every frame and interpolate through the filmed transitions.
"""
from pathlib import Path
import cv2, numpy as np, json
W,H=720,1560
out=Path('assets/sequence/portrait');out.mkdir(parents=True,exist_ok=True)
# source frame, full-shot width / portrait width, source camera x, art center y / portrait height
keys=np.array([[0,1.58,.615,.685],[64,1.58,.615,.685],[86,1.75,.615,.65],[106,1.93,.63,.65],[164,1.93,.63,.65],[188,1.30,.50,.64],[239,1.30,.50,.64]])
y,x=np.mgrid[0:H,0:W].astype(np.float32)
manifest=[]
for n in range(240):
 src=cv2.imread(f'assets/sequence/desktop/f{n:03}.webp');sh,sw=src.shape[:2]
 zoom,cx,cy=[np.interp(n,keys[:,0],keys[:,i]) for i in range(1,4)]
 dw=W*zoom; scale=dw/sw;dh=sh*scale;dx=W*.5-dw*cx;dy=H*cy-dh*.5
 # A continuous lilac environment; motion artwork remains unwarped.
 rgb=np.array([230,216,244],np.float32)
 glow=np.exp(-(((x-W*.28)/(W*.85))**2+((y-H*.3)/(H*.7))**2))
 bg=np.empty((H,W,3),np.float32)
 for c,v in enumerate(rgb[::-1]):bg[:,:,c]=v-13+glow*14
 # Exclude baked browser navigation/caption edges from the source film.
 mx=((x-dx)/scale).astype(np.float32);my=((y-dy)/scale).astype(np.float32)
 image=cv2.remap(src,mx,my,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
 if n<173:
  top,bottom=.045,1.035
 else:
  top,bottom=.12,.80
 a=np.clip((my/sh-top)/.085,0,1)*np.clip((bottom-my/sh)/(.035 if n<173 else .09),0,1)
 if n>=173:
  a*=np.clip((mx/sw-.10)/.07,0,1)*np.clip((.91-mx/sw)/.07,0,1)
 # Suppress the original lower scroll cue; this area lies below the product artwork.
 if 99<=n<173:
  cue=np.clip((np.abs(mx/sw-.50)-.032)/.01,0,1)
  bottommask=np.clip((my/sh-.945)/.02,0,1)
  a*=1-bottommask*(1-cue)
 image=np.clip(image*a[:,:,None]+bg*(1-a[:,:,None]),0,255).astype(np.uint8)
 cv2.imwrite(str(out/f'f{n:03}.webp'),image,[cv2.IMWRITE_WEBP_QUALITY,87])
 if n in [0,64,86,106,140,164,180,210,239]:
  cv2.imwrite(f'output/portrait-rebuild/frame-{n:03}.jpg',image)
 manifest.append({'frame':n,'sourceTime':n/24,'uniformScale':round(float(scale),6),'camera':[round(float(cx),4),round(float(cy),4)]})
(out/'manifest.json').write_text(json.dumps({'width':W,'height':H,'fps':24,'count':240,'camera':manifest}))
print('Built 240 uniform-scale portrait frames',flush=True)
