/* =====================================================================
   2. MOTION  — one shared clock, easing, tweens, paths.
   Nothing here knows about flowers. It only knows time.
   ===================================================================== */
const Motion=(()=>{
  const mq=matchMedia('(prefers-reduced-motion: reduce)');
  let forced=null;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;

  /* cubic-bezier easing, same maths as CSS */
  function bezier(x1,y1,x2,y2){
    const cx=3*x1,bx=3*(x2-x1)-cx,ax=1-cx-bx,cy=3*y1,by=3*(y2-y1)-cy,ay=1-cy-by;
    const sx=t=>((ax*t+bx)*t+cx)*t,sy=t=>((ay*t+by)*t+cy)*t,dx=t=>(3*ax*t+2*bx)*t+cx;
    return x=>{
      if(x<=0)return 0;if(x>=1)return 1;
      let t=x;
      for(let i=0;i<6;i++){const e=sx(t)-x;if(Math.abs(e)<1e-4)break;const d=dx(t);if(Math.abs(d)<1e-6)break;t-=e/d}
      return sy(t);
    };
  }
  const ease={inOut:bezier(.45,0,.25,1),out:bezier(.2,.6,.3,1),soft:bezier(.4,0,.2,1),linear:t=>t};

  /* small seeded random so each organic object keeps its own personality */
  function rng(seed){let a=seed|0||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  /* ---- shared ticker: ONE requestAnimationFrame loop for everything ---- */
  const subs=new Set();let raf=0,last=0,clock=0,inFrame=false;
  function frame(now){
    raf=0;inFrame=true;
    let dt=(now-last)/1000;if(!(dt>0))dt=0;dt=Math.min(.05,dt);last=now;clock+=dt;
    for(const s of [...subs]){
      if(!subs.has(s)||s.paused)continue;
      if(s.fps){s.acc+=dt;if(s.acc<1/s.fps)continue;const d=s.acc;s.acc=0;s.fn(clock,d)}
      else s.fn(clock,dt);
    }
    inFrame=false;
    if(subs.size&&!document.hidden)raf=requestAnimationFrame(frame);
  }
  function start(){if(!raf&&!inFrame&&subs.size&&!document.hidden){last=performance.now();raf=requestAnimationFrame(frame)}}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else start()});
  function sub(fn,{fps=0}={}){const s={fn,fps,acc:0,paused:false};subs.add(s);start();return s}
  function unsub(s){if(s)subs.delete(s)}

  /* pause a subscription while an element is off-screen */
  function watch(el,s){
    if(!('IntersectionObserver' in window))return()=>{};
    const io=new IntersectionObserver(es=>{s.paused=!es[es.length-1].isIntersecting});
    io.observe(el);return()=>io.disconnect();
  }

  /* ---- tween: value from -> to, eased, delayed. Reduced motion jumps. ---- */
  function tween({from=0,to=1,duration=1200,delay=0,ease:e=ease.inOut,onUpdate,onDone}){
    let t=-delay/1000,dead=false;
    const api={cancel(){dead=true;unsub(s)},finish(){if(dead)return;dead=true;unsub(s);onUpdate&&onUpdate(to);onDone&&onDone()}};
    if(reduced()){onUpdate&&onUpdate(to);onDone&&onDone();dead=true;const s=null;return{cancel(){},finish(){}}}
    const s=sub((_,dt)=>{
      if(dead)return;t+=dt;if(t<0)return;
      const k=clamp(t/(duration/1000));onUpdate&&onUpdate(lerp(from,to,e(k)));
      if(k>=1){dead=true;unsub(s);onDone&&onDone()}
    });
    return api;
  }
  /* one-shot timer on the same clock */
  function after(ms,fn){let t=0,dead=false;const s=sub((_,dt)=>{if(dead)return;t+=dt*1000;if(t>=ms){dead=true;unsub(s);fn()}});return{cancel(){dead=true;unsub(s)}}}

  /* ---- bezier paths (cubic, multi-segment, arc-length parameterised) ---- */
  const cub=(p0,p1,p2,p3,t)=>{const u=1-t;return{x:u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x,y:u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y}};
  class Path{
    constructor(segs){
      this.pts=[];this.len=[0];
      const N=24;
      segs.forEach((s,si)=>{for(let i=(si?1:0);i<=N;i++)this.pts.push(cub(s[0],s[1],s[2],s[3],i/N))});
      for(let i=1;i<this.pts.length;i++)this.len.push(this.len[i-1]+Math.hypot(this.pts[i].x-this.pts[i-1].x,this.pts[i].y-this.pts[i-1].y));
      this.total=this.len[this.len.length-1];
    }
    at(s){ /* s in 0..1 along the length */
      const L=clamp(s)*this.total;let lo=0,hi=this.len.length-1;
      while(hi-lo>1){const m=(lo+hi)>>1;if(this.len[m]<=L)lo=m;else hi=m}
      const a=this.pts[lo],b=this.pts[Math.min(lo+1,this.pts.length-1)],seg=this.len[Math.min(lo+1,this.len.length-1)]-this.len[lo]||1;
      const f=(L-this.len[lo])/seg;
      return{x:lerp(a.x,b.x,f),y:lerp(a.y,b.y,f),dx:b.x-a.x,dy:b.y-a.y,ang:Math.atan2(b.x-a.x,-(b.y-a.y))*180/Math.PI};
    }
  }
  const reduced=()=>forced!==null?forced:mq.matches;
  return{clamp,lerp,ease,bezier,rng,sub,unsub,watch,tween,after,Path,cub,reduced,
    forceReduced(v){forced=v},get now(){return clock}};
})();
