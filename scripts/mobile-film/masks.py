import cv2, numpy as np
rects={0:(265,870,385,540),1:(180,550,480,670),2:(150,430,600,830),3:(180,690,430,590)}
thumbs=[]
for i,(x,y,w,h) in rects.items():
    p=cv2.imread(f'work/plate{i}.png')
    m=np.zeros(p.shape[:2],np.uint8)
    bg=np.zeros((1,65),np.float64); fg=np.zeros((1,65),np.float64)
    cv2.grabCut(p,m,(x,y,w,h),bg,fg,6,cv2.GC_INIT_WITH_RECT)
    mm=np.where((m==1)|(m==3),255,0).astype(np.uint8)
    # keep the largest component (the bottle), fill holes
    n,lab,st,_=cv2.connectedComponentsWithStats(mm)
    k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); mm=np.where(lab==k,255,0).astype(np.uint8)
    cnts,_=cv2.findContours(mm,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    mm=np.zeros_like(mm); cv2.drawContours(mm,cnts,-1,255,-1)
    mm=cv2.morphologyEx(mm,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
    cv2.imwrite(f'work/mask{i}.png',mm)
    ov=p.copy(); ov[mm==0]=(ov[mm==0]*0.25).astype(np.uint8)
    thumbs.append(cv2.resize(ov,(284,615)))
cv2.imwrite('work/masks.jpg',np.hstack(thumbs))
