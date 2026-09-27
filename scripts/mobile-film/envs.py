import cv2, numpy as np
for i in range(4):
    p=cv2.imread(f'work/plate{i}.png'); m=cv2.imread(f'work/mask{i}.png',0)
    md=cv2.dilate(m,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(31,31)))
    small=cv2.resize(p,None,fx=.25,fy=.25,interpolation=cv2.INTER_AREA); ms=cv2.resize(md,(small.shape[1],small.shape[0]),interpolation=cv2.INTER_NEAREST)
    inp=cv2.inpaint(small,ms,9,cv2.INPAINT_TELEA)
    inp=cv2.GaussianBlur(inp,(0,0),4)
    up=cv2.resize(inp,(p.shape[1],p.shape[0]),interpolation=cv2.INTER_CUBIC).astype(np.float32)
    f=cv2.GaussianBlur(md.astype(np.float32)/255,(0,0),10)[:,:,None]
    f=np.clip(f*1.3,0,1)
    env=p*(1-f)+up*f
    cv2.imwrite(f'work/env{i}.png',np.clip(env,0,255).astype(np.uint8))
cv2.imwrite('work/envs.jpg',np.hstack([cv2.resize(cv2.imread(f'work/env{i}.png'),(284,615)) for i in range(4)]))
