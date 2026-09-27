"""GOOM mobile film: hero -> through the bubble -> splash -> descend -> formula ring.
Every pixel comes from the supplied portrait plates; motion is a single continuous camera.
The Flow bottle is its own layer so it travels while the world changes around it."""
import cv2, numpy as np, json, sys, os
W,H=852,1846
OUT=sys.argv[1] if len(sys.argv)>1 else 'work/frames'; os.makedirs(OUT,exist_ok=True)
Q=int(sys.argv[2]) if len(sys.argv)>2 else 82
poses=json.load(open('work/poses.json'))
plates=[cv2.imread(f'work/plate{i}.png').astype(np.float32) for i in range(4)]
envs=[cv2.imread(f'work/env{i}.png').astype(np.float32) for i in range(4)]
masks=[cv2.GaussianBlur(cv2.erode(cv2.imread(f'work/mask{i}.png',0),np.ones((3,3))).astype(np.float32)/255,(0,0),1.6) for i in range(4)]
Rj={k:np.array(v) for k,v in json.load(open('work/R.json')).items()}
T01=np.vstack([np.load('work/T01.npy'),[0,0,1]])
BG=np.array([236,214,226],np.float32)  # BGR lavender

def sim(s,a,tx,ty):
    c,si=s*np.cos(np.radians(a)),s*np.sin(np.radians(a))
    return np.array([[c,-si,tx],[si,c,ty],[0,0,1]])
def pose_map(src,dst):
    """similarity mapping bottle pose src -> screen pose dst"""
    s=dst['size']/src['size']; a=dst['ang']-src['ang']
    R=sim(s,a,0,0); p=R@[src['cx'],src['cy'],1]
    return sim(s,a,dst['cx']-p[0],dst['cy']-p[1])
def decompose(M):
    s=np.hypot(M[0,0],M[1,0]); a=np.degrees(np.arctan2(M[1,0],M[0,0])); return s,a,M[0,2],M[1,2]
def lerp_sim(A,B,e,anchor=(W/2,H/2)):
    # interpolate in anchor space so zooms don't swing on arcs
    def rep(M):
        s,a,_,_=decompose(M); p=M@[anchor[0],anchor[1],1]; return np.log(s),a,p[0],p[1]
    ra,rb=rep(A),rep(B); r=[x+(y-x)*e for x,y in zip(ra,rb)]
    M=sim(np.exp(r[0]),r[1],0,0); p=M@[anchor[0],anchor[1],1]; M[0,2]+=r[2]-p[0]; M[1,2]+=r[3]-p[1]; return M
def lerp_pose(a,b,e): return {k:(a[k]+(b[k]-a[k])*e if k!='size' else a[k]*(b[k]/a[k])**e) for k in a}
def warp(img,M,border=cv2.BORDER_REFLECT_101):
    return cv2.warpAffine(img,M[:2],(W,H),flags=cv2.INTER_CUBIC,borderMode=border)
def warpa(a,M):
    return cv2.warpAffine(a,M[:2],(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=0)
def smooth(x,a=0,b=1):
    t=np.clip((x-a)/(b-a),0,1); return t*t*t*(t*(t*6-15)+10)
def ease(x): return smooth(x)
def vblur(img,amount):
    k=int(round(min(46,abs(amount))))
    if k<3: return img
    ker=np.zeros((k,1),np.float32); ker[:,0]=1/k
    return cv2.filter2D(img,-1,ker,borderType=cv2.BORDER_REFLECT_101)
ONES=np.ones((H,W),np.float32)
FE=cv2.GaussianBlur(np.pad(np.ones((H-60,W-60),np.float32),30),(0,0),30)
def valid(M):
    return cv2.warpAffine(FE,M[:2],(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=0)[:,:,None]
def mixenv(a,Ma,b,Mb,w):
    ea,eb=warp(a,Ma),warp(b,Mb); va,vb=valid(Ma),valid(Mb)
    wb=w*vb; wa=(1-w)*va
    # where the favoured layer has no pixels, the other one carries the frame
    tot=wa+wb; fallback=tot<1e-3
    wb=np.where(fallback,w,wb/np.maximum(tot,1e-3)); 
    return ea*(1-wb)+eb*wb
def bottle(i,M):
    return warp(plates[i],M,cv2.BORDER_CONSTANT),warpa(masks[i],M)[:,:,None]

HOLD=1.04
def held(i,h):  # bottle pose after a slow hold push-in
    p=dict(poses[str(i)]); p['size']*=HOLD**h; return p

frames=[]  # list of callables
def hold(i,n):
    for k in range(n):
        h=k/n
        def f(i=i,h=h):
            M=pose_map(poses[str(i)],held(i,h)); return warp(plates[i],M),0
        frames.append(f)

def dive(n):
    """hero -> plate1: the camera sinks below the blob while Flow falls through it"""
    start=held(0,1); A0s=pose_map(poses['0'],start)
    for k in range(n):
      def f(k=k):
        u=(k+1)/n; e=ease(u)
        A0=lerp_sim(A0s,T01,e); A1=A0@np.linalg.inv(T01)
        w=smooth(u,.30,.78)
        env=mixenv(envs[0],A0,envs[1],A1,w)
        # bottle path: dips a touch then settles, cap swings with the fall
        B=lerp_pose(start,poses['1'],smooth(u,.05,1))
        B['cy']+=-60*np.sin(np.pi*smooth(u,.05,1))
        B['ang']+=-7*np.sin(np.pi*u)
        Mb0=pose_map(poses['0'],B); c0,a0=bottle(0,Mb0); c1,a1=bottle(1,lerp_sim(Mb0@Rj['01'],pose_map(poses['1'],B),smooth(u,.66,1)))
        bw=smooth(u,.52,.66)
        return (env,c0,a0,c1,a1,bw)
      frames.append(f)

def descend(i,j,n,D):
    """bottle-locked: world i slides up and away, world j rises from below"""
    start=held(i,1)
    for k in range(n):
      def f(k=k):
        u=(k+1)/n; e=ease(u)
        B=lerp_pose(start,poses[str(j)],e)
        B['ang']+=5*np.sin(np.pi*u)
        Ai=pose_map(poses[str(i)],B); Aj=pose_map(poses[str(j)],B)
        di=sim(1,0,0,-D*e); dj=sim(1,0,0,D*(1-e))
        w=smooth(u,.22,.78)
        env=mixenv(envs[i],di@Ai,envs[j],dj@Aj,w)
        Bi=pose_map(poses[str(i)],B); ci,ai=bottle(i,Bi); cj,aj=bottle(j,lerp_sim(Bi@Rj[f'{i}{j}'],Aj,smooth(u,.57,1)))
        bw=smooth(u,.43,.57)
        return (env,ci,ai,cj,aj,bw)
      frames.append(f)

def compose(res,prev_env_center):
    env,c0,a0,c1,a1,bw=res
    col=c0*(1-bw)+c1*bw; al=a0*(1-bw)+a1*bw
    return env,col,al

# build timeline
segs=[]
hold(0,10); segs.append(('hero',len(frames)))
dive(38); segs.append(('dive',len(frames)))
hold(1,8); segs.append(('fall',len(frames)))
descend(1,2,36,520); segs.append(('toSplash',len(frames)))
hold(2,10); segs.append(('splash',len(frames)))
descend(2,3,38,600); segs.append(('toRing',len(frames)))
hold(3,10); segs.append(('ring',len(frames)))
print(segs,len(frames))

prev=None; manifest=[]
for n,f in enumerate(frames):
    r=f() if not isinstance(f,tuple) else f
    if isinstance(r,tuple) and len(r)==2:
        img=r[0]; envimg=img; col=None
    else:
        env,col,al=compose(r,None)
        envimg=env
    # motion blur from environment velocity (luma centroid shift is noisy; use frame diff proxy)
    if col is not None:
        g=cv2.cvtColor(cv2.resize(envimg,(213,461)).astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
        if prev is not None:
            sh,_=cv2.phaseCorrelate(prev,g); vy=sh[1]*4
        else: vy=0
        prev=g
        envb=vblur(envimg,vy*0.55)
        img=envb*(1-al)+col*al
    else:
        prev=cv2.cvtColor(cv2.resize(envimg,(213,461)).astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
    img=np.clip(img,0,255).astype(np.uint8)
    cv2.imwrite(f'{OUT}/f{n:03d}.webp',img,[cv2.IMWRITE_WEBP_QUALITY,Q])
json.dump({'width':W,'height':H,'count':len(frames),'segments':segs},open(f'{OUT}/manifest.json','w'))
