"""Restore native-rate motion using the supplied clean JPEGs as UI-removal guides.
No product transforms, generated poses, or interpolated animation frames.
"""
from pathlib import Path
import cv2, numpy as np,json
cv2.setNumThreads(4)
video='/Users/yanaimizrahi/Downloads/Create_a_premium_cinematic_WEB.mp4'
folder=Path('assets/ezgif-8bf509dc7bc9d281-jpg');temp=Path('/tmp/goom-source-sequence')
c=cv2.VideoCapture(video);frames=[]
while True:
 ok,f=c.read()
 if not ok:break
 frames.append(f)
c.release()
small=[cv2.resize(f,(320,180)) for f in frames]
raw=[cv2.imread(str(p)) for p in sorted(folder.glob('ezgif-frame-*.jpg'))]
indices=[];prev=0
for i,f in enumerate(raw):
 ref=cv2.resize(f,(320,180))[25:160,125:290].astype(np.float32)
 scores=[np.mean((x[25:160,125:290].astype(np.float32)-ref)**2) for x in small]
 idx=max(prev,int(np.argmin(scores)));indices.append(idx);prev=idx
print('Mapped JPEGs to native video:',indices,flush=True)
# All artwork pixels come from the native video. The clean JPEGs replace only
# baked navigation/copy pixels, preserving native liquid, bottle and fruit motion.
guides=[];masks=[]
allowed=np.zeros((720,1280),np.uint8);allowed[:,:490]=255;allowed[:100,1090:]=255;allowed[675:,530:680]=255
for clean,idx in zip(raw,indices):
 # The clean exports already removed the filmed copy. Transfer that entire
 # region, feathering the boundary; never blend original glyph pixels back in.
 mask=np.zeros((720,1280),np.float32);mask[:,:470]=1
 for col in range(470,510):mask[:,col]=(510-col)/40
 guides.append(clean);masks.append(mask)
gray=[cv2.cvtColor(cv2.resize(f,(640,360)),cv2.COLOR_BGR2GRAY) for f in frames]
flow=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
y,x=np.mgrid[0:720,0:1280].astype(np.float32)
# Retain through 7.167s: the liquid exit before the final isolated ring / lineup.
last=172
for n in range(last+1):
 k=int(np.argmin(np.abs(np.asarray(indices)-n)));anchor=indices[k]
 if anchor==n: guide=guides[k];mask=masks[k]
 else:
  f=flow.calc(gray[n],gray[anchor],None)
  f=cv2.resize(f,(1280,720))*2
  guide=cv2.remap(guides[k],x+f[:,:,0],y+f[:,:,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
  mask=cv2.remap(masks[k],x+f[:,:,0],y+f[:,:,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
 m=mask[:,:,None]
 clean=np.clip(frames[n]*(1-m)+guide*m,0,255).astype(np.uint8)
 # The source's small top-right mark is replaced by the site's real navbar.
 logo=np.zeros((720,1280),np.uint8);logo[12:85,1090:1279]=255
 clean=cv2.inpaint(clean,logo,7,cv2.INPAINT_TELEA)
 cv2.imwrite(str(temp/f'{n:03}.png'),clean)
 if n%24==0: print('Prepared native frame',n,flush=True)
Path('qa/frame-sequence/mapping.json').write_text(json.dumps({'fps':24,'sourceFrames':240,'usedFrames':last+1,'lastSourceTime':last/24,'jpegToNative':indices,'method':'Native source artwork; supplied clean JPEGs guide baked UI removal only.'},indent=2))
