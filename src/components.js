/* =====================================================================
   4. COMPONENTS
   Every component takes: size, x, y, rotation, opacity, animationState,
   animationIntensity, delay, duration  (+ colorVariant / growth / progress /
   direction / speed where they make sense).
   Artwork is only ever referenced by name through ART, so it can be swapped.
   ===================================================================== */
const NS='http://www.w3.org/2000/svg';
function svgEl(name,attrs,parent){const e=document.createElementNS(NS,name);if(attrs)for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e}
function injectSpriteDefs(){
  if(document.getElementById('sprite-defs'))return;
  let s='<svg id="sprite-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>';
  for(const k in ART.S){const m=ART.S[k];s+=`<image id="s-${k}" width="${m.w}" height="${m.h}" href="${m.d}"/>`}
  document.body.insertAdjacentHTML('afterbegin',s+'</defs></svg>');
}
/* anchored = origin at the base of the stem, otherwise centred */
function sprite(name,mode='anchor',parent){
  const m=ART.S[name];
  const attrs={href:'#s-'+name};
  if(mode==='anchor'){attrs.x=-m.ax;attrs.y=-m.ay}
  else if(mode==='bottom'){attrs.x=-m.w/2;attrs.y=-m.h}
  else{attrs.x=-m.w/2;attrs.y=-m.h/2}
  return svgEl('use',attrs,parent);
}
const VAR={pink:'pink',cream:'cream',lavender:'lav',butter:'butter'};
const BFCOLOR={pink:'pink',purple:'purple',cream:'cream',blue:'blue'};
let _uid=0;const uid=()=>'u'+(++_uid);
const f1=n=>(Math.round(n*10)/10);

/* ---------- base ---------- */
class Botanical{
  constructor(props={}){
    this.p=Object.assign({size:1,x:0,y:0,rotation:0,opacity:1,animationState:'idle',animationIntensity:1,delay:0,duration:3600},this.constructor.defaults||{},props);
    this.el=svgEl('g');this.body=svgEl('g',null,this.el);
    this.rand=Motion.rng(this.p.seed||((Math.random()*1e9)|0)||7);
    this._subs=[];this._tw=[];
    this.build();this.layout();
  }
  build(){}
  layout(){const p=this.p;this.el.setAttribute('transform',`translate(${f1(p.x)} ${f1(p.y)}) rotate(${p.rotation.toFixed?+p.rotation.toFixed(2):p.rotation}) scale(${p.size})`);this.el.setAttribute('opacity',p.opacity)}
  set(props){Object.assign(this.p,props);this.layout();if(this.changed)this.changed(props);return this}
  mount(parent){parent.appendChild(this.el);return this}
  tween(o){const t=Motion.tween(o);this._tw.push(t);return t}
  fade(ms=220,to=1){const from=+this.el.getAttribute('opacity')||0;this.set({opacity:from});this.tween({from:0,to,duration:ms,ease:Motion.ease.soft,onUpdate:v=>{this.p.opacity=v;this.el.setAttribute('opacity',v)}})}
  destroy(){this._tw.forEach(t=>t.cancel());this._subs.forEach(Motion.unsub);this.el.remove()}
}

/* ---------- Stem ---------- */
class Stem extends Botanical{
  static defaults={curve:null,growth:1,width:1.8,color:'#667349'};
  build(){
    this.path=svgEl('path',{d:this.p.curve?this.p.curve.d:'M0 0L0 -60',fill:'none',stroke:this.p.color,'stroke-width':this.p.width,'stroke-linecap':'round',pathLength:1},this.body);
    this.setGrowth(this.p.growth);
  }
  setGrowth(g){this.p.growth=g;this.path.setAttribute('stroke-dasharray',`${Math.max(0,g)} 2`);this.path.style.opacity=g>0?1:0}
}

/* ---------- Leaf (leaves, foliage, filler sprigs) ---------- */
class Leaf extends Botanical{
  static defaults={sprite:'fill8',growth:1,dir:1};
  build(){
    this.sway=svgEl('g',null,this.body);this.u=sprite(this.p.sprite,'anchor',this.sway);
    this.period=3800+this.rand()*4200;this.phase=this.rand()*6.28;this.g=this.p.growth;this.sw=0;this.apply(this.g);
  }
  apply(g){
    this.g=g;const e=Motion.ease.out(g);
    this._unfold=(1-e)*-9*this.p.dir;this._sc=Motion.lerp(.55,1,e);
    this.sway.setAttribute('opacity',Motion.ease.soft(Motion.clamp(g*1.4)));
    this._paint();
  }
  _paint(){this.sway.setAttribute('transform',`rotate(${(this._unfold+this.sw).toFixed(2)}) scale(${this._sc.toFixed(3)})`)}
  idle(t){if(this.g<=0||Motion.reduced())return;this.sw=Math.sin(t/this.period*6.2832+this.phase)*1.4*this.p.animationIntensity-.2;this._paint()}
}

/* ---------- Flower (head + optional stem, any growth 0..1) ---------- */
const STAGES=[[1.3,'bud1',.85],[2,'bud2',1],[3,'partial',1],[4,'full',.9],[5,'full',1]];
class Flower extends Botanical{
  static defaults={variant:'pink',growth:1,curve:null,slotScale:.55,headScale:1,stemMin:.04,stemWidth:1.8,pivot:{x:200,y:332}};
  build(){
    const p=this.p;
    this.swayG=svgEl('g',null,this.body);
    this.stem=p.curve?new Stem({curve:p.curve,width:p.stemWidth,growth:0}).mount(this.swayG):null;
    this.head=svgEl('g',null,this.swayG);
    this.layerA=svgEl('g',null,this.head);this.useA=svgEl('use',null,this.layerA);
    this.layerB=svgEl('g',null,this.head);this.useB=svgEl('use',null,this.layerB);
    this.period=3200+this.rand()*4600;this.period2=4000+this.rand()*3800;
    this.phase=this.rand()*6.28;this.phase2=this.rand()*6.28;
    this._pos={x:0,y:0,ang:0};this._hr=0;this._nudge=0;this.sw=0;this.hsw=0;this.g=p.growth;
    this.apply(this.g);
  }
  key(name){return `fl_${VAR[this.p.variant]||'pink'}_${name}`}
  apply(g){
    const p=this.p;this.g=g;const stage=g*5;
    const stemT=(g<=0&&p.stemMin<=.05)?0:Motion.lerp(p.stemMin,1,Motion.ease.out(Motion.clamp(stage/1.15)));
    if(this.stem)this.stem.setGrowth(stemT);
    const pos=p.curve?p.curve.at(stemT):{x:0,y:0,ang:0};this._pos=pos;
    let A=null,B=null;
    if(stage>=.7){
      if(stage<1.3){const k=(stage-.7)/.6;A={n:'bud1',sc:Motion.lerp(.7,.85,k),op:Motion.ease.out(k)}}
      else{
        let i=0;while(i<STAGES.length-1&&stage>=STAGES[i+1][0])i++;
        const a=STAGES[i];
        if(i===STAGES.length-1)A={n:a[1],sc:a[2],op:1};
        else{
          const b=STAGES[i+1],e=Motion.ease.inOut((stage-a[0])/(b[0]-a[0]));
          if(a[1]===b[1])A={n:a[1],sc:Motion.lerp(a[2],b[2],e),op:1};
          else{A={n:a[1],sc:a[2],op:1};B={n:b[1],sc:Motion.lerp(b[2]*.9,b[2],e),op:e}}
        }
      }
    }
    /* a slight turn as the bloom opens */
    this._hr=stage>3?Motion.lerp(-3,0,Motion.ease.inOut(Motion.clamp((stage-3)/1.6))):0;
    const S=p.slotScale*p.headScale;
    const put=(layer,use,L)=>{
      if(!L){layer.setAttribute('opacity',0);return}
      if(use.getAttribute('href')!=='#s-'+this.key(L.n)){const nm=this.key(L.n),m=ART.S[nm];use.setAttribute('href','#s-'+nm);use.setAttribute('x',-m.ax);use.setAttribute('y',-m.ay)}
      layer.setAttribute('opacity',L.op.toFixed(3));layer.setAttribute('transform',`scale(${(S*L.sc).toFixed(4)})`);
    };
    put(this.layerA,this.useA,A);put(this.layerB,this.useB,B);
    this._paintHead();
  }
  _paintHead(){const q=this._pos;this.head.setAttribute('transform',`translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) rotate(${(q.ang+this._hr+this.hsw+this._nudge*.6).toFixed(2)})`)}
  _paintSway(){const c=this.p.pivot;this.swayG.setAttribute('transform',`rotate(${(this.sw+this._nudge).toFixed(3)} ${c.x} ${c.y})`)}
  idle(t){
    if(this.g<=0||Motion.reduced())return;
    const I=this.p.animationIntensity;
    this.sw=Math.sin(t/this.period*6.2832+this.phase)*1.2*I;
    this.hsw=Math.sin(t/this.period2*6.2832+this.phase2)*1.1*I;
    this._paintSway();this._paintHead();
  }
  /* one small, slow movement */
  nudge(amount=2){if(Motion.reduced())return;this.tween({from:0,to:1,duration:1500,ease:Motion.ease.inOut,onUpdate:k=>{this._nudge=Math.sin(k*Math.PI)*amount;this._paintSway();this._paintHead()},onDone:()=>{this._nudge=0}})}
  set(props){if('growth' in props){this.apply(props.growth)}return super.set(props)}
}

/* ---------- Sparkle ---------- */
class Sparkle extends Botanical{
  static defaults={sprite:'spk0',opacity:1};
  build(){this.g=svgEl('g',null,this.body);sprite(this.p.sprite,'center',this.g);this.g.setAttribute('opacity',0)}
  play(){
    if(Motion.reduced())return;
    const dur=this.p.duration&&this.p.duration!==3600?this.p.duration:800+this.rand()*600;
    this.tween({from:0,to:1,duration:dur,delay:this.p.delay,ease:Motion.ease.linear,
      onUpdate:k=>{const s=k<.5?Motion.lerp(.7,1,k*2):Motion.lerp(1,.8,(k-.5)*2);this.g.setAttribute('opacity',(.95*Math.sin(Math.PI*k)).toFixed(3));this.g.setAttribute('transform',`scale(${(s*(this.p.sk||.8)).toFixed(3)})`)},
      onDone:()=>this.g.setAttribute('opacity',0)});
  }
}

/* ---------- Petal (resting / drifting / falling) ---------- */
class Petal extends Botanical{
  static defaults={sprite:'pet0',animationState:'resting'};
  build(){this.g=svgEl('g',null,this.body);sprite(this.p.sprite,'center',this.g);this.g.setAttribute('transform','scale(.34)')}
  drift({from,to,duration=6000,onDone}){
    if(Motion.reduced()){onDone&&onDone();return}
    this.p.animationState='drifting';
    const sway=(this.rand()<.5?-1:1)*(18+this.rand()*20);
    const path=new Motion.Path([[from,{x:from.x+sway,y:from.y+(to.y-from.y)*.28},{x:to.x-sway*1.1,y:from.y+(to.y-from.y)*.62},to]]);
    const r0=this.rand()*60-30,dr=(this.rand()<.5?-1:1)*(110+this.rand()*120);
    this.tween({from:0,to:1,duration,ease:Motion.ease.soft,onUpdate:k=>{
      const q=path.at(k);const op=(k<.6?Motion.lerp(1,.8,k/.6):Motion.lerp(.8,0,(k-.6)/.4))*Math.min(1,k/.07);
      this.p.x=q.x;this.p.y=q.y;this.p.rotation=r0+dr*k;this.p.opacity=op;this.layout();
    },onDone});
  }
}

/* ---------- Butterfly ---------- */
class Butterfly extends Botanical{
  static defaults={variant:"pink",state:"resting",size:.42,speed:1,direction:1,restRotation:0};
  build(){
    const spec=ART.BF[BFCOLOR[this.p.variant]||'pink'],c=BFCOLOR[this.p.variant]||'pink';this.spec=spec;
    this.flight=svgEl('g',null,this.body);                       /* hover / bob */
    this.closed=svgEl('g',null,this.flight);sprite(`bf_${c}_closed`,'center',this.closed);
    this.open=svgEl('g',{opacity:0},this.flight);
    const comp=svgEl('g',{transform:`translate(${-spec.W/2} ${-spec.H/2})`},this.open);
    const wing=(side)=>{const w=spec[side],g=svgEl('g',null,comp);const u=sprite(`bf_${c}_${side}`,'topleft',g);u.setAttribute('x',0);u.setAttribute('y',0);return{g,w}};
    this.L=wing('lw');this.R=wing('rw');
    const b=svgEl('g',{transform:`translate(${spec.body.cx} ${spec.body.cy}) scale(${spec.body.s})`},comp);sprite(`bf_${c}_body`,'center',b);
    const a=svgEl('g',{transform:`translate(${spec.ant.cx} ${spec.ant.by}) scale(${spec.ant.s})`},comp);sprite(`bf_${c}_ant`,'bottom',a);
    this.state='resting';this.openAmt=0;this.angle=8;this._sub=null;this.bobT=this.rand()*10;
    this.rotNow=0;this.q=[];this.cycleT=this.rand()*3;this.restTimer=2+this.rand()*5;this.peek=null;this.periodMod=1;
    this.flutterRange=[8,65];this.period=.26+this.rand()*.16;
    this._setWings(8);this._paintOpen(0);
    this.setState(this.p.state,{instant:true});
  }
  /* wings turn on Y: simulated in SVG with scaleX = cos(angle) about the point where each wing meets the body */
  _setWings(deg){
    const k=Math.cos(deg*Math.PI/180);
    [this.L,this.R].forEach(({g,w})=>g.setAttribute('transform',`translate(${w.x} ${w.y}) scale(${w.s}) translate(${w.axl} ${w.ayl}) scale(${k.toFixed(3)} 1) translate(${-w.axl} ${-w.ayl})`));
  }
  _paintOpen(a){this.openAmt=a;this.open.setAttribute('opacity',a.toFixed(3));this.closed.setAttribute('opacity',(1-a).toFixed(3))}
  _place(dx=0,dy=0,dr=0){
    this.flight.setAttribute('transform',`translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${dr.toFixed(2)})`);
  }
  /* ---- state machine ---- */
  setState(s,opts={}){
    this.state=s;this.p.animationState=s;this.opts=opts;
    this._stopLoop();
    if(Motion.reduced()){ /* butterflies simply rest */
      this.state='resting';this._paintOpen(0);this._place();this.rotNow=this.p.restRotation;this.p.rotation=this.rotNow;this.layout();
      if(opts.to){this.p.x=opts.to.x;this.p.y=opts.to.y;this.layout()}
      opts.onDone&&opts.onDone();return this;
    }
    switch(s){
      case 'resting':this.restTimer=3+this.rand()*5;this.peek=null;if(opts.instant){this._paintOpen(0)}else this._fadeOpen(0,420);this._startRest();break;
      case 'fluttering':case 'hovering':this._fadeOpen(1,320);this._loop(dt=>this._hover(dt,s==='hovering'));break;
      case 'flying':this._fly(opts,false);break;
      case 'landing':this._fly(opts,true);break;
      case 'celebrating':this._celebrate(opts);break;
    }
    return this;
  }
  _fadeOpen(to,ms){const from=this.openAmt;this._fo&&this._fo.cancel();this._fo=this.tween({from,to,duration:ms,ease:Motion.ease.soft,onUpdate:v=>this._paintOpen(v)})}
  _loop(fn,opts){this._stopLoop();this._sub=Motion.sub((t,dt)=>fn(dt,t),opts);this._subs.push(this._sub)}
  _stopLoop(){if(this._sub){Motion.unsub(this._sub);this._sub=null}}
  _startRest(){ /* slow, rare: open a little, close, pause */
    this._loop(dt=>{
      this.restTimer-=dt;
      if(!this.peek&&this.restTimer<=0){this.peek={t:0,dur:1.1+this.rand()*.7};this._fadeOpen(1,260)}
      if(this.peek){
        this.peek.t+=dt;const k=this.peek.t/this.peek.dur;
        this.angle=Motion.lerp(70,38,Math.sin(Math.min(1,k)*Math.PI));this._setWings(this.angle);
        if(k>=1){this.peek=null;this.restTimer=5+this.rand()*5;this._fadeOpen(0,360)}
      }
      this._bob(dt,.35);
    },{fps:30});
  }
  _flutter(dt,speedMul=1,amp=1){
    this.cycleT+=dt;
    if(this.cycleT>2.2+this.rand()){this.cycleT=0;this.periodMod=.92+this.rand()*.16}
    const per=this.period*this.periodMod/speedMul;
    this._ph=(this._ph||0)+dt/per;
    const s=(1-Math.cos(this._ph*6.2832))/2;
    const a1=Motion.lerp(20,65,amp);
    this.angle=8+(a1-8)*s;this._setWings(this.angle);
  }
  _bob(dt,k=1){
    this.bobT+=dt;const t=this.bobT;
    this._place(Math.sin(t*1.3)*2*k,Math.sin(t*.9+1)*3*k,Math.sin(t*1.1+2)*3*k);
  }
  _hover(dt,bob){this._flutter(dt,1,1);this._bob(dt,bob?1:.25)}
  /* ---- flight: slow cubic Bezier arcs, never a straight line ---- */
  _route(from,to,rnd){
    const v={x:to.x-from.x,y:to.y-from.y},d=Math.hypot(v.x,v.y)||1,n={x:-v.y/d,y:v.x/d};
    const side=this.rand()<.5?-1:1,arc=Math.min(60,d*.22);
    const P=[from,
      {x:from.x+v.x*.22+n.x*arc*.7*side,y:from.y+v.y*.22+n.y*arc*.7*side-16},
      {x:from.x+v.x*.48-n.x*arc*.5*side,y:from.y+v.y*.48-n.y*arc*.5*side+9},
      {x:from.x+v.x*.76+n.x*arc*.45*side,y:from.y+v.y*.76+n.y*arc*.45*side-24},
      to];
    return this._catmull(P);
  }
  _catmull(P){
    const segs=[];
    for(let i=0;i<P.length-1;i++){
      const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(P.length-1,i+2)];
      segs.push([p1,{x:p1.x+(p2.x-p0.x)/6,y:p1.y+(p2.y-p0.y)/6},{x:p2.x-(p3.x-p1.x)/6,y:p2.y-(p3.y-p1.y)/6},p2]);
    }
    return new Motion.Path(segs);
  }
  _fly(opts,landing){
    const from={x:this.p.x,y:this.p.y},to=opts.to||{x:from.x+80,y:from.y-40};
    const path=opts.path||this._route(from,to);
    const dist=Math.hypot(to.x-from.x,to.y-from.y);
    const dur=(opts.duration||Motion.clamp(3600+dist*14,4000,9000)*(this.p.speed?1/this.p.speed:1))/1000;
    let t=0,tilt=0;this._ph=this._ph||0;
    this._fadeOpen(1,landing?300:240);
    const easeFn=landing?Motion.ease.out:Motion.ease.inOut;
    this._loop(dt=>{
      t+=dt;const k=Motion.clamp(t/dur),s=easeFn(k),q=path.at(s);
      this.p.x=q.x;this.p.y=q.y;
      /* body leans a little in the direction of travel */
      const target=Motion.clamp(q.dx*2.2,-22,22)*(landing?1-Motion.clamp((k-.8)/.2):1);
      tilt+=(target-tilt)*Math.min(1,dt*3);this.p.rotation=this.p.restRotation+tilt;
      /* wing beat slows as it comes in to land */
      const slow=landing?Motion.clamp((k-.45)/.55):0;
      const per=Motion.lerp(.32,1.5,Motion.ease.inOut(slow));
      this.cycleT+=dt;if(this.cycleT>1.8){this.cycleT=0;this.glide=.6}
      this.glide=Math.max(0,(this.glide||0)-dt);
      this._ph+=dt/per;const sw=(1-Math.cos(this._ph*6.2832))/2;
      const a1=this.glide>0?42:(landing?Motion.lerp(65,45,slow):65);
      this.angle=8+(a1-8)*sw;this._setWings(this.angle);
      this._bob(dt,.3);
      if(opts.fadeIn)this.p.opacity=Motion.clamp(k/.22);
      if(opts.fadeOut)this.p.opacity=1-Motion.ease.soft(Motion.clamp((k-.45)/.55));
      this.layout();
      if(k>=1){this._stopLoop();if(opts.final){opts.onDone&&opts.onDone()}else this._arrive(opts,landing)}
    });
  }
  _arrive(opts,landing){
    this.p.rotation=this.p.restRotation;this.layout();
    if(!landing){this.setState('hovering',opts);opts.onDone&&opts.onDone();return}
    /* one small wing movement, then rest */
    let t=0;this._loop(dt=>{
      t+=dt;const k=Motion.clamp(t/1.3);
      this.angle=Motion.lerp(65,28,Math.sin(k*Math.PI));this._setWings(this.angle);this._bob(dt,.2);
      if(k>=1){this.setState('resting',{});opts.onDone&&opts.onDone()}
    });
  }
  /* ---- celebration: emerge, flutter, lift, one loose curve around the bouquet, hover, land or drift away ---- */
  _celebrate(o){
    const C=o.center||{x:200,y:200},home=o.land||null;
    const start={x:C.x+120,y:C.y+70};
    this.p.x=start.x;this.p.y=start.y;this.layout();
    const steps=[];
    steps.push(cb=>{this.p.opacity=0;this.layout();this._fadeOpen(1,300);this._fadeBody(1,1100);this._hoverFor(1.5,cb)});
    steps.push(cb=>{this._flyTo({x:start.x-4,y:start.y-46},{duration:1500},cb)});
    const R=o.radius||112;
    const loop=[{x:C.x+R*.9,y:C.y-R*.45},{x:C.x+R*.35,y:C.y-R*1.0},{x:C.x-R*.55,y:C.y-R*.92},{x:C.x-R*.98,y:C.y-R*.2},{x:C.x-R*.8,y:C.y+R*.3}];
    steps.push(cb=>{this._flyPath(this._catmull([{x:start.x-4,y:start.y-46},...loop]),5600,cb)});
    steps.push(cb=>this._hoverFor(1.5,cb));
    if(home)steps.push(cb=>{this.setState('landing',{to:home,onDone:cb})});
    else steps.push(cb=>{this._flyTo({x:C.x-260,y:C.y-150},{duration:5200,fadeOut:true},cb)});
    const run=i=>{if(i>=steps.length){o.onDone&&o.onDone();return}steps[i](()=>run(i+1))};
    run(0);
  }
  _fadeBody(to,ms){const from=+this.el.getAttribute('opacity')||0;this.tween({from,to,duration:ms,ease:Motion.ease.soft,onUpdate:v=>{this.p.opacity=v;this.layout()}})}
  _hoverFor(sec,cb){let t=0;this._loop(dt=>{t+=dt;this._hover(dt,true);if(t>=sec){this._stopLoop();cb()}})}
  _flyTo(to,o,cb){
    const from={x:this.p.x,y:this.p.y};const path=this._route(from,to);
    this._flyPath(path,o.duration||4500,cb,o.fadeOut);
  }
  _flyPath(path,ms,cb,fadeOut){
    let t=0,tilt=0;this._ph=this._ph||0;const dur=ms/1000;
    this._loop(dt=>{
      t+=dt;const k=Motion.clamp(t/dur),q=path.at(Motion.ease.inOut(k));
      this.p.x=q.x;this.p.y=q.y;
      tilt+=(Motion.clamp(q.dx*2.2,-22,22)-tilt)*Math.min(1,dt*3);this.p.rotation=tilt;
      this._flutter(dt,1,.9);this._bob(dt,.3);
      if(fadeOut)this.p.opacity=1-Motion.ease.soft(Motion.clamp((k-.45)/.55));
      this.layout();
      if(k>=1){this._stopLoop();cb&&cb()}
    });
  }
  /* public conveniences */
  flyTo(to,o={}){return this.setState('flying',Object.assign({to},o))}
  landOn(to,o={}){return this.setState('landing',Object.assign({to},o))}
  destroy(){this._stopLoop();super.destroy()}
}
Butterfly.prototype.changed=function(p){if('state' in p)this.setState(p.state)};
