import cv2, numpy as np
W,H=852,1846
P=lambda p:cv2.imread(p)
hero=P('/Users/yanaimizrahi/Downloads/פרויקט חדש_ גום/assets/mobile-cinematic-art.webp')
p1=P('../images/1.webp'); p2=P('../images/2.webp'); p4=P('work/p4clean.png')
def cover(im):
    h,w=im.shape[:2]; s=max(W/w,H/h); r=cv2.resize(im,(round(w*s),round(h*s)),interpolation=cv2.INTER_CUBIC)
    y=(r.shape[0]-H)//2; x=(r.shape[1]-W)//2; return r[y:y+H,x:x+W]
def stretchfit(im,x0,keep0,keep1):
    # uniform scale for the product band, vertical-only stretch in abstract top/bottom bands
    h,w=im.shape[:2]; im=im[:,x0:]; w=im.shape[1]; s=W/w
    top=im[:keep0]; mid=im[keep0:keep1]; bot=im[keep1:]
    midr=cv2.resize(mid,(W,round(mid.shape[0]*s)),interpolation=cv2.INTER_CUBIC)
    rest=H-midr.shape[0]; tb=top.shape[0]*s; bb=bot.shape[0]*s
    th=round(rest*tb/(tb+bb)); bh=rest-th
    return np.vstack([cv2.resize(top,(W,th),interpolation=cv2.INTER_CUBIC),midr,cv2.resize(bot,(W,bh),interpolation=cv2.INTER_CUBIC)])
plates=[hero if hero.shape[:2]==(H,W) else cover(hero), cover(p1), p2 if p2.shape[:2]==(H,W) else cover(p2), stretchfit(p4,14,280,1420)]
for i,p in enumerate(plates): cv2.imwrite(f'work/plate{i}.png',p)
s=np.hstack([cv2.resize(p,(284,615)) for p in plates]); cv2.imwrite('work/plates.jpg',s)
