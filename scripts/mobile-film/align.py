import cv2, numpy as np, json
poses={}
for i in range(4):
    m=cv2.imread(f'work/mask{i}.png',0)
    ys,xs=np.nonzero(m); pts=np.stack([xs,ys],1).astype(np.float64)
    c=pts.mean(0); cov=np.cov((pts-c).T); ev,evec=np.linalg.eigh(cov)
    v=evec[:,1]  # major axis
    if v[1]>0: v=-v   # point toward cap (up)
    ang=np.degrees(np.arctan2(v[0],-v[1]))  # 0 = upright, + = cap leaning right
    poses[i]=dict(cx=float(c[0]),cy=float(c[1]),ang=float(ang),size=float(np.sqrt(len(xs))))
    print(i,poses[i])
# hero -> plate1 lobe alignment with SIFT on non-Flow regions
sift=cv2.SIFT_create(6000)
a=cv2.imread('work/plate0.png',0); b=cv2.imread('work/plate1.png',0)
ma=255-cv2.dilate(cv2.imread('work/mask0.png',0),np.ones((25,25))); mb=np.zeros_like(b); mb[:420]=255
mb=cv2.bitwise_and(mb,255-cv2.dilate(cv2.imread('work/mask1.png',0),np.ones((25,25))))
ka,da=sift.detectAndCompute(a,ma); kb,db=sift.detectAndCompute(b,mb)
mt=cv2.BFMatcher().knnMatch(da,db,k=2)
good=[m for m,n in mt if m.distance<0.8*n.distance]
print('good',len(good))
if len(good)>=6:
    pa=np.float32([ka[m.queryIdx].pt for m in good]); pb=np.float32([kb[m.trainIdx].pt for m in good])
    M,inl=cv2.estimateAffinePartial2D(pa,pb,method=cv2.RANSAC,ransacReprojThreshold=12)
    print('inliers',int(inl.sum()),M)
    s=np.hypot(M[0,0],M[1,0]); print('scale',s,'rot',np.degrees(np.arctan2(M[1,0],M[0,0])))
    np.save('work/T01.npy',M)
json.dump(poses,open('work/poses.json','w'))
