import cv2, numpy as np
src=cv2.imread('../images/4.webp'); im=src.astype(np.float32)
H,W=im.shape[:2]
x0,x1,y0,y1=34,908,75,206
bar=np.zeros((H,W),np.uint8); cv2.rectangle(bar,(x0+63,y0),(x1-63,y1),1,-1)
cv2.circle(bar,(x0+63,(y0+y1)//2),(y1-y0)//2+1,1,-1); cv2.circle(bar,(x1-63,(y0+y1)//2),(y1-y0)//2+1,1,-1)
barD=cv2.dilate(bar,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)))
# headline glyph mask from ORIGINAL
g=cv2.cvtColor(src,cv2.COLOR_BGR2GRAY)
region=np.zeros((H,W),np.uint8); region[240:430,250:W]=1
m=((g<125)&(region>0)).astype(np.uint8)
m=cv2.dilate(m,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(13,13)))

# fill bar: vertical interpolation of rows just outside, per column, smoothed
top=cv2.GaussianBlur(im[52:62].mean(0,keepdims=True),(0,0),sigmaX=34,sigmaY=0.1)[0]
bot=cv2.GaussianBlur(im[222:232].mean(0,keepdims=True),(0,0),sigmaX=34,sigmaY=0.1)[0]
t=np.clip((np.arange(H)-57)/(227-57),0,1)[:,None,None]
t=t*t*(3-2*t)
interp=top[None]*(1-t)+bot[None]*t
bigger=cv2.dilate(bar,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(31,31))).astype(np.float32)
feather=np.clip(cv2.GaussianBlur(bigger,(0,0),14)*1.25,0,1)[:,:,None]
soft=cv2.GaussianBlur(im,(0,0),16)
edgekeep=im*(1-feather)+ (interp*0.92+soft*0.08)*feather
edgekeep=edgekeep*(1-feather)+cv2.GaussianBlur(edgekeep,(0,0),22)*feather
work=np.clip(edgekeep,0,255).astype(np.uint8)
tm=((g<125)&(region>0)).astype(np.uint8)
tm=cv2.dilate(tm,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(13,13)))
work=cv2.inpaint(work,tm*255,15,cv2.INPAINT_TELEA).astype(np.float32)
bl=cv2.GaussianBlur(work,(0,0),7)
fm=np.clip(cv2.GaussianBlur(m.astype(np.float32),(0,0),6)*1.4,0,1)[:,:,None]
out=work*(1-fm)+bl*fm
# fine grain so the patch doesn't look plastic
rng=np.random.default_rng(1); out+=rng.normal(0,1.2,out.shape)*fm
cv2.imwrite('work/p4clean.png',np.clip(out,0,255).astype(np.uint8))
cv2.imwrite('work/p4clean_top.png',np.clip(out[:560],0,255).astype(np.uint8))
