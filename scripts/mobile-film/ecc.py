import cv2, numpy as np, json
exec(open('render.py').read().split('HOLD=')[0].split("frames=[]")[0].replace("os.makedirs(OUT,exist_ok=True)",""))
R={}
for i,j in [(0,1),(1,2),(2,3)]:
    M=pose_map(poses[str(j)],poses[str(i)])
    bj=cv2.warpAffine(plates[j],M[:2],(W,H),flags=cv2.INTER_CUBIC)
    gi=cv2.cvtColor(plates[i].astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
    gj=cv2.cvtColor(bj.astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
    mi=cv2.erode(cv2.imread(f'work/mask{i}.png',0),np.ones((15,15)))
    warp_m=np.eye(2,3,dtype=np.float32)
    try:
        cc,warp_m=cv2.findTransformECC(cv2.GaussianBlur(gi,(0,0),1.5),cv2.GaussianBlur(gj,(0,0),1.5),warp_m,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),mi,5)
    except cv2.error as e: print('ecc fail',i,j,e); cc=0
    # ECC warp maps template(i) coords -> input(j-warped) coords; we need j-warped -> i
    Wm=np.vstack([warp_m,[0,0,1]]); Rij=np.linalg.inv(Wm)@M
    R[f'{i}{j}']=Rij.tolist(); print(i,j,'cc',cc,'\n',np.round(np.linalg.inv(Wm),4))
json.dump(R,open('work/R.json','w'))
