/* ---------- Vase (glass only; same physical size at every progress) ---------- */
const VASE_PATH='M178 308C172 322 128 338 118 380C110 420 154 446 200 446C246 446 290 420 282 380C272 338 228 322 222 308Z';
class Vase extends Botanical{
  build(){
    this.back=svgEl('g');this.front=svgEl('g');
    svgEl('path',{d:VASE_PATH,fill:'#F4F0E8','fill-opacity':.34},this.back);
    svgEl('ellipse',{cx:200,cy:308,rx:24,ry:5,fill:'#E9E4DA','fill-opacity':.55,stroke:'#7E9396','stroke-opacity':.55,'stroke-width':1.2},this.back);
    svgEl('path',{d:VASE_PATH,fill:'none',stroke:'#7E9396','stroke-opacity':.85,'stroke-width':1.8,'stroke-linejoin':'round'},this.front);
    svgEl('path',{d:'M176 307C177 313 223 313 224 307',fill:'none',stroke:'#7E9396','stroke-opacity':.8,'stroke-width':1.6,'stroke-linecap':'round'},this.front);
    svgEl('path',{d:'M130 366C122 388 126 410 142 428',fill:'none',stroke:'#fff','stroke-opacity':.85,'stroke-width':3.2,'stroke-linecap':'round'},this.front);
    svgEl('path',{d:'M270 360C280 380 280 400 270 418',fill:'none',stroke:'#fff','stroke-opacity':.5,'stroke-width':2.2,'stroke-linecap':'round'},this.front);
    svgEl('ellipse',{cx:200,cy:441,rx:42,ry:5,fill:'none',stroke:'#fff','stroke-opacity':.55,'stroke-width':1.4},this.front);
  }
  mount(parent){parent.appendChild(this.back);parent.appendChild(this.front);return this}
  destroy(){this.back.remove();this.front.remove()}
}

/* ---------- Water: level = progress ---------- */
class Water extends Botanical{
  static defaults={progress:0};
  build(){
    const id=uid();this.id=id;
    const defs=svgEl('defs',null,this.body);
    const cp=svgEl('clipPath',{id:'wc'+id},defs);svgEl('path',{d:VASE_PATH},cp);
    const lg=svgEl('linearGradient',{id:'wg'+id,x1:0,y1:0,x2:0,y2:1},defs);
    svgEl('stop',{offset:0,'stop-color':'#A6CBDB'},lg);svgEl('stop',{offset:1,'stop-color':'#D9E8EC'},lg);
    this.clip=svgEl('g',{'clip-path':`url(#wc${id})`},this.body);
    this.fill=svgEl('rect',{x:90,y:350,width:220,height:120,fill:`url(#wg${id})`,opacity:.92},this.clip);
    this.surface=svgEl('g',null,this.clip);this.surfSpr=svgEl('g',null,this.surface);sprite('w_surface','center',this.surfSpr);this.surfSpr.setAttribute('transform','scale(1.45 1)');
    svgEl('g',{transform:'translate(150 424) scale(.26)',opacity:.55},this.clip).appendChild(sprite('w_bub0','center'));
    svgEl('g',{transform:'translate(246 432) scale(.16)',opacity:.5},this.clip).appendChild(sprite('w_bub1','center'));
    /* a second, clearer layer drawn over the stems so they look submerged */
    this.front=svgEl('g',{'clip-path':`url(#wc${id})`,'pointer-events':'none'});
    this.tint=svgEl('rect',{x:90,y:350,width:220,height:120,fill:'#BBD9E6',opacity:.34},this.front);
    this.ripples=svgEl('g',{'clip-path':`url(#wc${id})`},this.body);
    this.level=LAYOUT.vase.waterMin;this.lvl=this.level;this.setLevel(this.level);
    this.period=3800+this.rand()*1200;
  }
  mount(parent){parent.appendChild(this.el);return this}
  levelY(l){return LAYOUT.vase.bottom-l*(LAYOUT.vase.bottom-LAYOUT.vase.top-6)}
  setLevel(l){
    this.lvl=l;const y=this.levelY(l);this.y=y;
    this.fill.setAttribute('y',y);this.tint.setAttribute('y',y);
    this.surface.setAttribute('transform',`translate(200 ${y})`);
  }
  setProgress(p,{animate=true}={}){
    const to=LAYOUT.vase.waterMin+(LAYOUT.vase.waterMax-LAYOUT.vase.waterMin)*Motion.clamp(p);
    const from=this.lvl;this._lvlTw&&this._lvlTw.cancel();
    if(Math.abs(to-from)<1e-4){return}
    if(!animate){this.setLevel(to);return}
    if(Motion.reduced()){ /* short fade instead of a rising surface */
      this.setLevel(to);this.surface.setAttribute('opacity',.3);
      this._lvlTw=Motion.tween({from:.3,to:1,duration:240,ease:Motion.ease.soft,onUpdate:v=>this.surface.setAttribute('opacity',v)});return;
    }
    const d=900+700*Motion.clamp(Math.abs(to-from)*3.2);
    this._lvlTw=Motion.tween({from,to,duration:d,ease:Motion.ease.inOut,onUpdate:v=>this.setLevel(v)});
    if(to-from>.06)Motion.after(d*.6,()=>this.ripple());
  }
  /* one tiny ripple, not continuous */
  ripple(){
    if(Motion.reduced())return;
    const e=svgEl('ellipse',{cx:200,cy:this.y+2,rx:20,ry:3,fill:'none',stroke:'#fff','stroke-width':1.4},this.ripples);
    Motion.tween({from:0,to:1,duration:1500,ease:Motion.ease.out,onUpdate:k=>{e.setAttribute('rx',20+60*k);e.setAttribute('ry',3+6*k);e.setAttribute('stroke-opacity',.6*(1-k))},onDone:()=>e.remove()});
  }
  /* very slight surface life */
  idle(t){
    if(Motion.reduced())return;
    const I=this.p.animationIntensity;
    const dy=Math.sin(t/this.period*6.2832)*1*I,sx=1+Math.sin(t/(this.period*.8)*6.2832+1)*.01*I;
    this.surface.setAttribute('transform',`translate(200 ${(this.y+dy).toFixed(2)}) scale(${sx.toFixed(4)} 1)`);
  }
  destroy(){this.front.remove();super.destroy()}
}

/* ---------- Bouquet: progress reveals / grows individual elements ---------- */
class Bouquet extends Botanical{
  build(){
    this.layers={back:svgEl('g',null,this.body),mid:svgEl('g',null,this.body),front:svgEl('g',null,this.body)};
    this.items=[];this.by={};
    const rec=PROGRESS.recipe.slice();
    /* flowers sit behind each other by height */
    const order=rec.filter(r=>r.kind==='flower').sort((a,b)=>LAYOUT.slots[a.slot].y-LAYOUT.slots[b.slot].y);
    const make=(r,i)=>{
      let comp,layer;
      if(r.kind==='flower'){
        const slot=LAYOUT.slots[r.slot],full=ART.S[`fl_${VAR[r.variant]}_full`];
        const curve=Geometry.curve(slot,full);
        comp=new Flower({variant:r.variant,growth:0,curve,slotScale:slot.s,stemWidth:Math.max(1.3,Math.min(2.2,3.2*slot.s)),seed:i*977+13});
        layer=this.layers.mid;
      }else{
        const F=LAYOUT.fillers[r.filler];
        comp=new Leaf({sprite:F.sprite,growth:0,x:F.x,y:F.y,rotation:F.rot,size:F.s,dir:F.rot<0?-1:1,seed:i*733+5});
        layer=this.layers[F.layer];
      }
      const it={r,comp,g:0,target:0,tw:null,rand:Motion.rng(i*131+7)(),i};
      this.items.push(it);this.by[r.id]=it;return it;
    };
    /* creation order = draw order */
    rec.filter(r=>r.kind==='filler'&&LAYOUT.fillers[r.filler].layer==='back').forEach((r,k)=>{const it=make(r,100+k);it.comp.mount(this.layers.back)});
    order.forEach((r,k)=>{const it=make(r,k);it.comp.mount(this.layers.mid)});
    rec.filter(r=>r.kind==='filler'&&LAYOUT.fillers[r.filler].layer==='front').forEach((r,k)=>{const it=make(r,200+k);it.comp.mount(this.layers.front)});
  }
  /* jump to a progress with no animation (used on load) */
  snap(p){PROGRESS.map(p).elements.forEach(e=>{const it=this.by[e.id];it.target=e.growth;it.g=e.growth;it.comp.apply(e.growth)})}
  apply(p,{animate=true,duration}={}){
    PROGRESS.map(p).elements.forEach(e=>{
      const it=this.by[e.id];if(Math.abs(e.growth-it.target)<1e-4)return;
      it.target=e.growth;it.tw&&it.tw.cancel();
      const from=it.g,to=e.growth;
      if(!animate){it.g=to;it.comp.apply(to);return}
      if(Motion.reduced()){it.g=to;it.comp.apply(to);if(from===0&&to>0)it.comp.fade(220);return}
      const d=duration||Math.max(800,(1500+it.rand*1100)*Motion.clamp(Math.abs(to-from)*2.2,.45,1));
      it.tw=Motion.tween({from,to,duration:d,delay:it.rand*320,ease:Motion.ease.inOut,onUpdate:v=>{it.g=v;it.comp.apply(v)}});
    });
  }
  idle(t){for(const it of this.items)if(it.comp.idle)it.comp.idle(t)}
  headPos(id){const r=this.by[id].r;return r.kind==='flower'?LAYOUT.slots[r.slot]:LAYOUT.fillers[r.filler]}
  destroy(){this.items.forEach(i=>{i.tw&&i.tw.cancel();i.comp.destroy()});super.destroy()}
}

/* ---------- BotanicalScene: vase + water + bouquet + visitors ---------- */
class BotanicalScene{
  constructor(container,{progress=0,from=null,onSettled}={}){
    injectSpriteDefs();
    this.svg=svgEl('svg',{viewBox:'30 54 340 406',role:'img'});container.appendChild(this.svg);
    const defs=svgEl('defs',null,this.svg);
    const rg=svgEl('radialGradient',{id:'halo'},defs);svgEl('stop',{offset:0,'stop-color':'#F9D9C6','stop-opacity':.9},rg);svgEl('stop',{offset:1,'stop-color':'#F9D9C6','stop-opacity':0},rg);
    svgEl('circle',{cx:200,cy:250,r:150,fill:'url(#halo)',opacity:.5},this.svg);
    this.vase=new Vase();this.water=new Water();this.bouquet=new Bouquet();
    this.vase.back&&this.svg.appendChild(this.vase.back);
    this.water.mount(this.svg);this.bouquet.mount(this.svg);
    this.svg.appendChild(this.water.front);this.svg.appendChild(this.vase.front);
    this.floorG=svgEl('g',null,this.svg);this.petalG=svgEl('g',null,this.svg);
    this.sparkG=svgEl('g',null,this.svg);this.bfG=svgEl('g',null,this.svg);
    this.sparks=Array.from({length:18},(_,i)=>new Sparkle({sprite:'spk'+(i%3),seed:i+3}).mount(this.sparkG));this.trailT=0;this.sparkCountdown=2;
    this.rest=[];this.sky=new Set();this.temps=new Set();this.floor=[];this.drifters=new Set();this.visitCountdown=5+Math.random()*5;this.petalCountdown=5;this.progress=0;this.idleT=0;
    this._timers=new Set();
    this.idleSub=Motion.sub((t,dt)=>this._idle(t,dt),{fps:30});this.stopWatch=Motion.watch(this.svg,this.idleSub);
    const start=from==null?progress:from;
    this._setNow(start);
    if(from!=null&&Math.abs(from-progress)>1e-4)this.setProgress(progress,{animate:true});
  }
  _after(ms,fn){const t=Motion.after(ms,()=>{this._timers.delete(t);fn()});this._timers.add(t);return t}
  /* build the state for progress p instantly (no animation, no events) */
  _setNow(p){
    p=Motion.clamp(p);this.progress=p;
    this.water.setProgress(p,{animate:false});this.bouquet.snap(p);
    const m=PROGRESS.map(p);
    this._syncFloor(m,false);
    for(let i=0;i<m.restingButterflies;i++)this._spawnRest(i,false);
    this._aria();
  }
  _aria(){this.svg.setAttribute('aria-label',`A vase of flowers, ${Math.round(this.progress*100)} percent grown`)}
  _idle(t,dt){
    this.bouquet.idle(t);this.water.idle(t);
    const m=PROGRESS.map(this.progress);
    if(Motion.reduced())return;
    /* a butterfly may pass by from time to time */
    if(m.visitors&&this.temps.size<2){this.visitCountdown-=dt;if(this.visitCountdown<=0){this.visitCountdown=12+Math.random()*12;this.visit()}}
    /* sparkles: soft and brief, but always somewhere — more of them, in more places, as the bouquet grows */
    if(m.sparkleEvery>0){
      this.sparkCountdown-=dt;
      if(this.sparkCountdown<=0){
        this.sparkCountdown=m.sparkleEvery*(.7+Math.random()*.6);
        const fl=this.bouquet.items.filter(i=>i.r.kind==='flower'&&i.g>.2),R=LAYOUT.roam;
        for(let k=0;k<m.sparkleBurst;k++){
          const r=Math.random();
          if(r<.22&&fl.length){const sl=LAYOUT.slots[fl[Math.floor(Math.random()*fl.length)].r.slot];this.sparkleAt(sl.x+(Math.random()*64-32),sl.y+(Math.random()*56-40),Math.random()*400)}
          else if(r<.3){this.sparkleAt(130+Math.random()*140,this.water.y-4+Math.random()*10,Math.random()*300)}   /* glints on the water */
          else this.sparkleAt(R.x0+Math.random()*(R.x1-R.x0),R.y0+Math.random()*(R.y1-R.y0),Math.random()*500);    /* anywhere on screen */
        }
      }
    }
    /* butterflies leave a faint trail of sparkles while they move */
    this.trailT-=dt;
    if(this.trailT<=0){
      this.trailT=.32;
      [...this.rest,...this.temps].forEach(b=>{if(b&&['flying','landing','hovering','celebrating'].includes(b.state)&&b.p.opacity>.5&&Math.random()<.7)this.sparkleAt(b.p.x-10+Math.random()*20,b.p.y+6+Math.random()*16,0)});
    }
    /* petals fall slowly from the top of the screen, a few at a time */
    this.skyCountdown=(this.skyCountdown??1.5)-dt;
    if(this.skyCountdown<=0&&this.sky.size<2+Math.floor(this.progress*6)){
      this.skyCountdown=(1.7-this.progress*.9)*(.7+Math.random()*.7);
      this.skyPetal();
    }
    /* petals are rare: at most 1-3 moving at once */
    if(m.driftingPetalsMax>0){
      this.petalCountdown-=dt;
      if(this.petalCountdown<=0&&this.drifters.size<m.driftingPetalsMax){this.petalCountdown=2.5+Math.random()*3;this.dropPetal()}
    }
  }
  /* ----- progress ----- */
  setProgress(p,{animate=true,duration}={}){
    p=Motion.clamp(p);const prev=this.progress;if(Math.abs(p-prev)<1e-5)return;
    this.progress=p;
    this.water.setProgress(p,{animate});this.bouquet.apply(p,{animate,duration});
    const m=PROGRESS.map(p);
    this._syncFloor(m,animate);this._syncButterflies(m,animate);this._aria();
    if(animate&&p>prev&&!Motion.reduced())PROGRESS.milestones.forEach(ms=>{if(prev<ms-1e-9&&p>=ms-1e-9)this._after(1100,()=>this._milestone(ms))});
  }
  _milestone(ms){
    if(ms===.25){const it=this._first(it=>it.r.kind==='flower'&&it.g>.1&&it.g<.7);if(it)this.bloomCue(it.r.id)}
    else if(ms===.5){this.bloomCue('f1')}
    else if(ms===.75){this.visit();this._after(1800,()=>this.visit())}
    else if(ms===1){this.celebrate()}
  }
  _first(fn){return this.bouquet.items.find(fn)}
  bloomCue(id){
    const it=this.bouquet.by[id];if(!it)return;const sl=LAYOUT.slots[it.r.slot];
    it.comp.nudge(2);this.sparkleAt(sl.x+8,sl.y-14,0);
  }
  sparkleAt(x,y,delay=0){
    if(Motion.reduced())return;const s=this.sparks[(this._sk=((this._sk||0)+1)%this.sparks.length)];
    s.set({x,y,delay,sk:.34+Math.random()*.3});s.play();
  }
  /* ----- resting petals on the table ----- */
  _syncFloor(m,animate){
    while(this.floor.length<m.restingPetals){
      const F=LAYOUT.floorPetals[this.floor.length];
      const pt=new Petal({sprite:F.n,x:F.x,y:F.y,rotation:F.r,opacity:animate?0:.9}).mount(this.floorG);
      if(animate&&!Motion.reduced())pt.tween({from:0,to:.9,duration:1600,ease:Motion.ease.soft,onUpdate:v=>pt.set({opacity:v})});else pt.set({opacity:.9});
      this.floor.push(pt);
    }
    while(this.floor.length>m.restingPetals){this.floor.pop().destroy()}
  }
  skyPetal(){
    const R=LAYOUT.roam,names=['pet0','pet1','pet2','pet3','pet4','pet5'];
    const x=R.x0+Math.random()*(R.x1-R.x0),sz=1.05+Math.random()*.65;
    const pt=new Petal({sprite:names[Math.floor(Math.random()*names.length)],x,y:-120,size:sz,opacity:0,seed:(Math.random()*1e6)|0}).mount(this.petalG);
    this.sky.add(pt);
    pt.drift({from:{x,y:-120},to:{x:x+(Math.random()*160-80),y:360+Math.random()*110},duration:9500+Math.random()*5500,onDone:()=>{this.sky.delete(pt);pt.destroy()}});
  }
  dropPetal(){
    const cands=this.bouquet.items.filter(i=>i.r.kind==='flower'&&i.g>.8);if(!cands.length)return;
    const it=cands[Math.floor(Math.random()*cands.length)],sl=LAYOUT.slots[it.r.slot];
    const names=['pet0','pet1','pet2','pet4'];
    const pt=new Petal({sprite:names[Math.floor(Math.random()*names.length)],x:sl.x,y:sl.y,opacity:0,seed:(Math.random()*1e6)|0}).mount(this.petalG);
    this.drifters.add(pt);
    pt.drift({from:{x:sl.x,y:sl.y+8},to:{x:sl.x+(Math.random()*80-40),y:441},duration:4200+Math.random()*3800,onDone:()=>{this.drifters.delete(pt);pt.destroy()}});
  }
  /* ----- butterflies ----- */
  _perch(i){return[LAYOUT.perches.a,LAYOUT.perches.b,LAYOUT.perches.c,LAYOUT.perches.d][i]}
  _spawnRest(i,animate){
    const home=this._perch(i),v=['pink','purple','cream','blue'][i],rr=[-6,8,-10,6][i];
    const b=new Butterfly({variant:v,x:home.x,y:home.y,rotation:rr,restRotation:rr,seed:i*41+9,opacity:1}).mount(this.bfG);
    b.home=home;this.rest[i]=b;
    if(!animate)this._wander(b,true);
    if(animate&&!Motion.reduced()){
      const start={x:i%2?440:-40,y:60+i*45};b.set({x:start.x,y:start.y,opacity:0});
      this._after(900+i*1300,()=>{if(this.rest[i]===b)b.setState('landing',{to:home,duration:7000,fadeIn:true,onDone:()=>this._wander(b,true)})});
      b.setState('hovering',{});
    }
  }
  /* butterflies never stop: land, breathe, drift to the next flower, repeat */
  _wander(b,first){
    if(!b||this.rest.indexOf(b)<0||Motion.reduced())return;
    this._after(first?400+Math.random()*2400:900+Math.random()*1800,()=>{
      if(this.rest.indexOf(b)<0||!b.el.isConnected)return;
      const P=LAYOUT.perches,all=Object.values(P),taken=this.rest.filter(x=>x&&x!==b).map(x=>x.home);
      const free=all.filter(q=>!taken.includes(q)&&q!==b.home);
      if(b.home===null)b.home=all[0];
      const to=free[Math.floor(Math.random()*free.length)]||all[0];
      const R=LAYOUT.roam,far=()=>{let q,n=0;do{q={x:R.x0+Math.random()*(R.x1-R.x0),y:R.y0+Math.random()*(R.y1-R.y0)};n++}while(Math.hypot(q.x-b.p.x,q.y-b.p.y)<120&&n<8);return q};
      if(Math.random()<.55){ /* drift out across the screen and hover there for a moment */
        b.home=null;b.setState('flying',{to:far(),duration:5200+Math.random()*3600,onDone:()=>this._wander(b)});
      }else{
        b.home=to;
        const go=()=>b.setState('landing',{to,duration:4600+Math.random()*3400,onDone:()=>this._wander(b)});
        if(Math.random()<.4){b.setState('hovering',{});this._after(1200+Math.random()*1200,()=>{if(this.rest.indexOf(b)>=0)go()})}else go();
      }
    });
  }
  _syncButterflies(m,animate){
    for(let i=0;i<m.restingButterflies;i++)if(!this.rest[i])this._spawnRest(i,animate);
    for(let i=this.rest.length-1;i>=m.restingButterflies;i--){
      const b=this.rest[i];if(!b)continue;this.rest.length=i;
      if(Motion.reduced()||!animate){b.destroy();continue}
      b.setState('flying',{to:{x:-50,y:b.p.y-80},duration:5200,fadeOut:true,final:true,onDone:()=>b.destroy()});
    }
  }
  /* a visitor passes through and leaves */
  visit(){
    if(Motion.reduced())return;
    const colors=['cream','blue','pink','purple'],c=colors[Math.floor(Math.random()*colors.length)];
    const left=Math.random()<.5,sx=left?-60:460,sy=-20+Math.random()*300;
    const b=new Butterfly({variant:c,x:sx,y:sy,opacity:0,seed:(Math.random()*1e6)|0}).mount(this.bfG);
    this.temps.add(b);
    const R=LAYOUT.roam,near={x:R.x0+60+Math.random()*(R.x1-R.x0-120),y:R.y0+20+Math.random()*(R.y1-R.y0-120)};
    const out={x:left?460:-60,y:near.y-70};
    b.setState('flying',{to:near,duration:5200,fadeIn:true,onDone:()=>{
      b.setState('hovering',{});
      this._after(2600,()=>{ if(!b.el.isConnected)return; b.setState('flying',{to:out,duration:6200,fadeOut:true,final:true,onDone:()=>{this.temps.delete(b);b.destroy()}})});
    }});
  }
  /* completion: one graceful flight around the bouquet, no confetti */
  celebrate(){
    if(Motion.reduced())return;
    const home=this._perch(0);let b=this.rest[0],temp=false;
    if(!b||b.state!=='resting'){b=new Butterfly({variant:'cream',x:home.x,y:home.y,opacity:0}).mount(this.bfG);temp=true;this.temps.add(b)}
    b.setState('celebrating',{center:{x:200,y:210},radius:118,land:temp?null:home,onDone:()=>{if(temp){this.temps.delete(b);b.destroy()}}});
    [2400,3200,4000,4800].forEach((t,i)=>this._after(t,()=>this.sparkleAt(150+i*34,100+(i%2)*40,0)));
  }
  destroy(){
    Motion.unsub(this.idleSub);this.stopWatch&&this.stopWatch();
    this._timers.forEach(t=>t.cancel());
    this.sparks.forEach(s=>s.destroy());this.floor.forEach(p=>p.destroy());this.drifters.forEach(p=>p.destroy());this.sky.forEach(p=>p.destroy());
    this.rest.forEach(b=>b&&b.destroy());this.temps.forEach(b=>b.destroy());
    this.bouquet.destroy();this.water.destroy();this.vase.destroy();this.svg.remove();
  }
}

/* ---------- <BotanicalProgress progress goal current /> ---------- */
class BotanicalProgress{
  constructor(container,{progress,goal,current,from=null}={}){
    this.goal=goal;this.current=current;
    const p=progress!=null?progress:(goal>0?current/goal:0);
    this.scene=new BotanicalScene(container,{progress:Motion.clamp(p),from});
    this.progress=Motion.clamp(p);
  }
  update({progress,goal,current,animate=true,duration}={}){
    if(goal!=null)this.goal=goal;if(current!=null)this.current=current;
    const p=progress!=null?progress:(this.goal>0?this.current/this.goal:0);
    this.progress=Motion.clamp(p);this.scene.setProgress(this.progress,{animate,duration});
  }
  destroy(){this.scene.destroy()}
}

/* ---------- <ExpenseFlower amount maxAmount /> : magnitude, not "good behaviour" ---------- */
class ExpenseFlower{
  constructor(container,{amount=0,maxAmount=50}={}){
    injectSpriteDefs();
    this.max=maxAmount;this.svg=svgEl('svg',{viewBox:'100 116 200 340',role:'img'});container.appendChild(this.svg);
    this.vase=new Vase();this.water=new Water();
    this.svg.appendChild(this.vase.back);this.water.mount(this.svg);
    const slot={x:200,y:196,s:.62},slot2={x:150,y:244,s:.36};
    this.leaves=[['fill8',-14,.52],['fill4',-36,.62],['fill7',38,.6]].map((l,i)=>{
      const lf=new Leaf({sprite:l[0],growth:0,x:200+(i===2?10:-6),y:322,rotation:l[1],size:l[2],dir:l[1]<0?-1:1,seed:i+21});lf.mount(this.svg);return lf});
    this.second=new Flower({variant:'cream',growth:0,curve:Geometry.curve(slot2,ART.S.fl_cream_full),slotScale:slot2.s,stemWidth:1.3,stemMin:.04,seed:55}).mount(this.svg);
    this.main=new Flower({variant:'pink',growth:0,curve:Geometry.curve(slot,ART.S.fl_pink_full),slotScale:slot.s,stemWidth:2,stemMin:.5,seed:77}).mount(this.svg);
    this.svg.appendChild(this.water.front);this.svg.appendChild(this.vase.front);
    this.spark=new Sparkle({sprite:'spk0',x:236,y:176}).mount(this.svg);
    this.amb=[1,2,0,1].map((k,i)=>new Sparkle({sprite:'spk'+k,seed:i+90}).mount(this.svg));this.ambT=1;this._ai=0;
    this.cur=this._scale(amount);this.target=this.cur;this._apply(this.cur);
    this.idleSub=Motion.sub((t,dt)=>{this.main.idle(t);this.second.idle(t);this.leaves.forEach(l=>l.idle(t));this.water.idle(t);
      this.ambT-=dt;
      if(this.ambT<=0&&!Motion.reduced()){
        this.ambT=Motion.lerp(1.6,.6,this.cur/50)*(.7+Math.random()*.6);
        const tip=this.main.p.curve.tip,s=this.amb[(this._ai=(this._ai+1)%this.amb.length)];
        s.set({x:tip.x+(Math.random()*90-45),y:tip.y-20-Math.random()*90,sk:.32+Math.random()*.26});s.play();
      }},{fps:30});
    this.stopWatch=Motion.watch(this.svg,this.idleSub);
    this.sm=null;
  }
  _scale(a){return Motion.clamp(a/this.max*50,0,50)}
  _apply(a){
    const m=this.main;m.p.headScale=1+.12*Motion.clamp((a-40)/10);
    m.apply(PROGRESS.expenseStage(a)/5);
    this.leaves[0].apply(Motion.clamp((a-6)/10));this.leaves[1].apply(Motion.clamp((a-16)/12));this.leaves[2].apply(Motion.clamp((a-28)/12));
    this.second.apply(Motion.clamp((a-36)/14)*.55);
    this.water.setLevel(.12+.30*(a/50));
  }
  /* the flower follows the slider with a soft, damped glide: no jumps, no bounce */
  setAmount(a){
    this.target=this._scale(a);
    if(Motion.reduced()){this.cur=this.target;this._apply(this.cur);return}
    if(this.sm)return;
    this.sm=Motion.sub((t,dt)=>{
      this.cur+=(this.target-this.cur)*(1-Math.exp(-dt/.13));
      if(Math.abs(this.target-this.cur)<.02){this.cur=this.target;Motion.unsub(this.sm);this.sm=null}
      this._apply(this.cur);
    });
  }
  nudge(){this.main.nudge(2.2)}
  sparkle(){this.spark.set({x:this.main._pos?this.main.p.curve.tip.x+22:236,y:this.main.p.curve.tip.y-60});this.spark.play()}
  destroy(){Motion.unsub(this.idleSub);Motion.unsub(this.sm);this.stopWatch&&this.stopWatch();[this.main,this.second,this.spark,...this.amb,...this.leaves].forEach(c=>c.destroy());this.water.destroy();this.vase.destroy();this.svg.remove()}
}
