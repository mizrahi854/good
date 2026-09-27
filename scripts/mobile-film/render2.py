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

# 1) hero hold
for k in range(8):
    frames.append(lambda: plates[0].copy())
mark('hero')
# 2) lift + tilt inside the lobe (anticipation, like f00-f15)
LIFT=10
def lifted(u):
    p=dict(P0); s=smooth(u); p['cy']-=34*s; p['ang']+=5*s; p['size']*=1+.03*s; return p
for k in range(LIFT):
    def f(k=k):
        u=(k+1)/LIFT; return bottle_on(envs[0],0,lifted(u))
    frames.append(f)
mark('lift')
# 3a) camera holds: the bottle falls out of the bubble, the glass stretches after it and snaps
FALL=22
start=lifted(1)
EXITY=1590.   # bottle centre when it has cleared the blob
def worldfall(t):   # t 0..1 over the static fall
    p=lerp_pose(start,W1,0); p['cy']=start['cy']+(EXITY-start['cy'])*t*t
    p['cx']=start['cx']+(W1['cx']-start['cx'])*.4*t*t
    p['ang']=start['ang']-11*np.sin(np.pi*.5*t); p['size']=start['size']*(1+.04*t); return p
def pulled(t):
    pull=worldfall(t)['cy']-start['cy']
    snapT=.72
    if t<snapT: return pull
    r=(t-snapT)/(1-snapT); return worldfall(snapT)['cy']-start['cy']
for k in range(FALL):
    def f(k=k):
        t=(k+1)/FALL; w=worldfall(t)
        snapT=.72
        if t<snapT: env=membrane(envs[0],w['cx'],w['cy']-start['cy'],0)
        else:
            r=(t-snapT)/(1-snapT); d=(worldfall(snapT)['cy']-start['cy'])*np.exp(-r*3.2)*np.cos(r*7.5)
            env=membrane(envs[0],w['cx'],max(d,0),0)
        return (env,*bottle(0,pose_map(P0,w)))
    frames.append(f)
mark('fall')
# 3b) camera follows down; the bottle rises back into frame and the next world arrives
FOLLOW=22
w0=worldfall(1)
for k in range(FOLLOW):
    def f(k=k):
        t=(k+1)/FOLLOW
        world=lerp_pose(w0,W1,1-(1-t)**2)            # still falling, slowing into the catch
        world['ang']+= 5*np.sin(np.pi*t)
        r=(1+t*FOLLOW/FALL*(1-.72))                   # membrane recoil keeps wobbling as we leave
        d=(worldfall(.72)['cy']-start['cy'])*np.exp(-(1/(1-.72))*3.2*(.28+t*.9))*np.cos(7.5*(1+t*.9*3.5))
        env0=membrane(envs[0],world['cx'],max(d,0),0)
        ec=ease(t); A0=lerp_sim(np.eye(3),T01,ec); A1=A0@T01i
        env=mixenv(env0,A0,envs[1],A1,smooth(t,.25,.8))
        scr=apply(A0,world)
        g0,a0=bottle(0,pose_map(P0,scr)); g1,a1=bottle(1,lerp_sim(pose_map(P0,scr)@Rj['01'],pose_map(P1,scr),smooth(t,.62,1)))
        bw=smooth(t,.5,.6); return (env,g0*(1-bw)+g1*bw,a0*(1-bw)+a1*bw)
    frames.append(f)
mark('drop')
# 4) plate1 -> splash, bottle-locked descent; lands with a dip
DESC=26
for k in range(DESC):
    def f(k=k):
        u=(k+1)/DESC; e=ease(u)
        B=lerp_pose(P1,P2,e)
        B['cy']+=70*np.sin(np.pi*smooth(u,.35,1))*(u>.35)   # dips past the landing
        Bi=pose_map(P1,B); Aj=pose_map(P2,B)
        env=mixenv(envs[1],sim(1,0,0,-300*e)@pose_map(P1,lerp_pose(P1,P2,e)),envs[2],sim(1,0,0,110*(1-e))@pose_map(P2,lerp_pose(P1,P2,e)),smooth(u,.15,.7))
        ci,ai=bottle(1,Bi); cj,aj=bottle(2,lerp_sim(Bi@Rj['12'],Aj,smooth(u,.57,1)))
        bw=smooth(u,.47,.55); return (env,ci*(1-bw)+cj*bw,ai*(1-bw)+aj*bw)
    frames.append(f)
mark('land')
# 5) splash: rise back up (spring) then float
FLOAT=26
for k in range(FLOAT):
    def f(k=k):
        t=(k+1)/FLOAT
        B=dict(P2)
        spring=-38*np.exp(-t*5.5)*np.sin(t*9)   # rises above rest, settles
        B['cy']+=spring-10*np.sin(2*np.pi*t)*smooth(t,.2,.6)
        B['ang']+=1.6*np.sin(2*np.pi*t+0.6)
        # blend to the untouched plate as it settles on the final frames of the hold
        return (envs[2],*bottle(2,pose_map(P2,B)))
    frames.append(f)
mark('splash')
# 6) sink toward the formula section: world rises, bottle drops through the bottom
EXIT=20
FORM=np.array([234,208,218],np.float32)  # BGR, top of the formula section
for k in range(EXIT):
    def f(k=k):
        u=(k+1)/EXIT; e=ease(u)
        Ae=sim(1,0,0,-700*e)
        env=warp(envs[2],Ae)
        rows=np.clip((H-700*e-yy[:,:1])/260.,0,1)[:,:,None]   # soft bottom edge of the rising plate
        env=env*rows+FORM*(1-rows)
        fade=smooth(u,.35,1)
        env=env*(1-fade)+FORM*fade
        B=dict(P2); B['cy']+=-700*e+ (1100*u*u); B['size']*=1-.12*e; B['ang']+=4*e
        c,a=bottle(2,pose_map(P2,B)); a=a*(1-smooth(u,.7,1))
        return (env,c,a)
    frames.append(f)
mark('exit')
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
