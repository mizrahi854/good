"""GOOM mobile film v2 — the Flow bottle leaves the bubble like the reference film:
lift inside the lobe, drop out stretching the glass, camera follows, splash landing with a
dip-and-rise, gentle float, then the camera sinks toward the formula section."""
import cv2, numpy as np, json, sys, os
exec(open('render.py').read().split('HOLD=')[0].replace("os.makedirs(OUT,exist_ok=True)","os.makedirs(OUT,exist_ok=True)"))
T01i=np.linalg.inv(T01)
def layer(img,M):
    v=valid(M); a=warp(img,M,cv2.BORDER_CONSTANT); r=cv2.GaussianBlur(warp(img,M,cv2.BORDER_REPLICATE),(0,0),34)
    return a*v+r*(1-v) if v.min()<.999 else warp(img,M)
def mixenv(a,Ma,b,Mb,w):
    return layer(a,Ma)*(1-w)+layer(b,Mb)*w
P0,P1,P2=poses['0'],poses['1'],poses['2']
def apply(M,p):
    s,a,_,_=decompose(M); q=M@[p['cx'],p['cy'],1]
    return dict(cx=q[0],cy=q[1],ang=p['ang']+a,size=p['size']*s)
W1=apply(T01i,P1)   # plate1 bottle expressed in hero-world coordinates
print('world landing',W1)

# ---- gooey membrane: the lobe glass is dragged down with the bottle, then snaps back
yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
LOBE_TOP=880.; LOBE_BOT=1405.
def membrane(env,bx,drop,snap):
    """drop: how far (px, world) the bottle bottom has pulled the glass. snap: 0..1 recoil phase"""
    if drop<=0.5: return env
    wx=np.exp(-((xx-bx)/112.)**4)
    reach=LOBE_BOT+drop
    stretch=np.clip((yy-LOBE_TOP)/(reach-LOBE_TOP),0,1)*drop
    tail=drop*np.exp(-np.clip(yy-reach,0,None)/110.)
    D=np.where(yy<=reach,stretch,tail)*wx
    # the pulled membrane also pinches inward a touch, like a drop neck
    pinch=0.10*np.clip((yy-LOBE_BOT)/max(drop,1),0,1)*(yy>LOBE_BOT)*(yy<reach)*wx
    mx=xx+(xx-bx)*pinch
    my=yy-D
    return cv2.remap(env,mx.astype(np.float32),my.astype(np.float32),cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT_101)


frames=[]; SC={}
def mark(name): SC[name]=len(frames)
def bottle_on(env,i,pose,alpha=1.0):
    c,a=bottle(i,pose_map(poses[str(i)],pose)); a=a*alpha
    return env*(1-a)+c*a

# ---- formula section layers (captured from the live page at frame resolution)
def rl(n): 
    im=cv2.imread(f'work/{n}.png',cv2.IMREAD_UNCHANGED).astype(np.float32); im[:2]=im[2:4] if im.shape[2]==3 else 0; return im
FBG=rl('F_bg'); FFULL=rl('F_full')
FFL=rl('F_flow'); FOT=rl('F_others')
def fpose(a):
    m=(a>128); ys,xs=np.nonzero(m); pts=np.stack([xs,ys],1).astype(np.float64); c=pts.mean(0)
    return dict(cx=float(c[0]),cy=float(c[1]),ang=0.0,size=float(np.sqrt(m.sum())))
PF=fpose(FFL[:,:,3]); print('slot',PF)
def flow_layer(pose):
    M=pose_map(PF,pose)
    c=cv2.warpAffine(FFL[:,:,:3],M[:2],(W,H),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT)
    a=cv2.warpAffine(FFL[:,:,3]/255.,M[:2],(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT)[:,:,None]
    return c,a

# 0) hero
frames.append(lambda: plates[0].copy()); mark('hero')
# 1) scroll 1 — the bottle rises toward the camera inside its lobe
RISE=20
def raised(u):
    p=dict(P0); s=smooth(u); p['cy']-=78*s; p['ang']+=7*s; p['size']*=1+.13*s; return p
for k in range(RISE):
    def f(k=k):
        u=(k+1)/RISE
        # the lobe glass bulges up with it (membrane in reverse, small)
        return bottle_on(envs[0],0,raised(u))
    frames.append(f)
mark('raised')
# 2) scroll 2 — falls through the bubble (glass stretches, snaps), camera follows, lands in the splash
FALL=20
start=raised(1)
EXITY=1600.
def worldfall(t):
    p=dict(start); p['cy']=start['cy']+(EXITY-start['cy'])*t*t
    p['cx']=start['cx']+(W1['cx']-start['cx'])*.4*t*t
    p['ang']=start['ang']-13*np.sin(np.pi*.5*t); p['size']=start['size']*(1-.06*t); return p
SNAP=.72
for k in range(FALL):
    def f(k=k):
        t=(k+1)/FALL; w=worldfall(t)
        if t<SNAP: env=membrane(envs[0],w['cx'],w['cy']-P0['cy'],0)
        else:
            r=(t-SNAP)/(1-SNAP); d=(worldfall(SNAP)['cy']-P0['cy'])*np.exp(-r*3.2)*np.cos(r*7.5)
            env=membrane(envs[0],w['cx'],max(d,0),0)
        return (env,*bottle(0,pose_map(P0,w)))
    frames.append(f)
FOLLOW=20
w0=worldfall(1)
for k in range(FOLLOW):
    def f(k=k):
        t=(k+1)/FOLLOW
        world=lerp_pose(w0,W1,1-(1-t)**2); world['ang']+=5*np.sin(np.pi*t)
        d=(worldfall(SNAP)['cy']-P0['cy'])*np.exp(-3.2/(1-SNAP)*(1-SNAP+t*.5))*np.cos(7.5*(1+t*2))
        env0=membrane(envs[0],world['cx'],max(d,0),0)
        ec=ease(t); A0=lerp_sim(np.eye(3),T01,ec); A1=A0@T01i
        env=mixenv(env0,A0,envs[1],A1,smooth(t,.25,.8))
        scr=apply(A0,world)
        g0,a0=bottle(0,pose_map(P0,scr)); g1,a1=bottle(1,lerp_sim(pose_map(P0,scr)@Rj['01'],pose_map(P1,scr),smooth(t,.62,1)))
        bw=smooth(t,.5,.6); return (env,g0*(1-bw)+g1*bw,a0*(1-bw)+a1*bw)
    frames.append(f)
LAND=22
for k in range(LAND):
    def f(k=k):
        u=(k+1)/LAND; e=ease(u)
        B=lerp_pose(P1,P2,e)
        B['cy']+=62*np.sin(np.pi*smooth(u,.4,1))*(u>.4)
        Bi=pose_map(P1,B); Aj=pose_map(P2,B)
        env=mixenv(envs[1],sim(1,0,0,-300*e)@pose_map(P1,lerp_pose(P1,P2,e)),envs[2],sim(1,0,0,110*(1-e))@pose_map(P2,lerp_pose(P1,P2,e)),smooth(u,.15,.7))
        ci,ai=bottle(1,Bi); cj,aj=bottle(2,lerp_sim(Bi@Rj['12'],Aj,smooth(u,.57,1)))
        bw=smooth(u,.47,.55); return (env,ci*(1-bw)+cj*bw,ai*(1-bw)+aj*bw)
    frames.append(f)
# splash rest: rises back up after the landing dip, then floats
FLOAT=16
def floatpose(t):
    B=dict(P2); B['cy']+=-34*np.exp(-t*4.5)*np.sin(t*8)-8*np.sin(np.pi*t)*smooth(t,.3,.8); B['ang']+=1.4*np.sin(2*np.pi*t); return B
for k in range(FLOAT):
    def f(k=k):
        t=(k+1)/FLOAT; return (envs[2],*bottle(2,pose_map(P2,floatpose(t))))
    frames.append(f)
mark('splash')
# 3) scroll 3 — falls through the liquid ring, camera sinks with it, lands in the Flow slot of the formulas
DIVE=34
b0=floatpose(1)
for k in range(DIVE):
    def f(k=k):
        u=(k+1)/DIVE
        cam=ease(u)*H                           # camera travels one full screen down
        # worlds stacked vertically, soft seam
        env2=warp(envs[2],sim(1,0,0,-cam))
        fb=warp(FBG[:,:,:3],sim(1,0,0,H-cam))
        seam=H-cam; band=np.clip((yy[:,:1]-(seam-340))/680.,0,1)[:,:,None]; band=band*band*(3-2*band)
        env=env2*(1-band)+fb*band
        # the other formulas settle into place as the section arrives
        ot=FOT; oy=H-cam+90*(1-smooth(u,.55,1))
        oc=warp(ot[:,:,:3],sim(1,0,0,oy),cv2.BORDER_CONSTANT); oa=cv2.warpAffine(ot[:,:,3]/255.,sim(1,0,0,oy)[:2],(W,H))[:,:,None]*smooth(u,.30,.55)
        env=env*(1-oa)+oc*oa
        # bottle: falls ahead of the camera through the ring, straightens, lands in its slot with a small settle
        fall=smooth(u,0,.62); settle=smooth(u,.62,1)
        B=lerp_pose(b0,PF,ease(u))
        B['cy']+=(260*np.sin(np.pi*fall))*(1-settle) + 26*np.sin(np.pi*settle)*(1-settle)
        B['ang']=b0['ang']*(1-smooth(u,.25,.85))+(-6*np.sin(np.pi*smooth(u,.2,.85)))
        c2,a2=bottle(2,pose_map(P2,B)); cf,af=flow_layer(B)
        bw=smooth(u,.5,.72)
        return (env,c2*(1-bw)+cf*bw,a2*(1-bw)+af*bw)
    frames.append(f)
frames.append(lambda: FFULL[:,:,:3].copy())
mark('formulas')
print(SC,len(frames))

prev=None
for n,f in enumerate(frames):
    r=f()
    if isinstance(r,tuple):
        env,col,al=r
        g=cv2.cvtColor(cv2.resize(env,(213,461)).astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
        vy=0
        if prev is not None: sh,_=cv2.phaseCorrelate(prev,g); vy=sh[1]*4
        prev=g
        img=vblur(env,vy*0.5)*(1-al)+col*al
    else:
        img=r; prev=cv2.cvtColor(cv2.resize(img,(213,461)).astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
    cv2.imwrite(f'{OUT}/f{n:03d}.webp',np.clip(img,0,255).astype(np.uint8),[cv2.IMWRITE_WEBP_QUALITY,Q])
json.dump({'width':W,'height':H,'count':len(frames),'marks':SC},open(f'{OUT}/manifest.json','w'))
