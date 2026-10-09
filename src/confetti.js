/* =====================================================================
   CONFETTI — a small burst of petals, leaves and sparkles for every save.
   Drawn from the same artwork as everything else, floaty rather than fast.
   ===================================================================== */
const Confetti=(()=>{
  let svg=null;const live=new Set();let sub=null;
  /* what falls: [sprite, scale range, weight] */
  const KINDS=[
    ['pet0',[.34,.52],3],['pet1',[.34,.52],3],['pet2',[.34,.52],3],['pet3',[.34,.52],2],['pet4',[.34,.52],2],['pet5',[.34,.52],2],
    ['spk0',[.6,1],2],['spk1',[.6,1],2],['spk2',[.6,1],2],
    ['fill8',[.22,.32],1],['fill4',[.19,.28],1],['fill1',[.19,.28],1],
    ['accent0',[.26,.36],1]
  ];
  const TOTAL=KINDS.reduce((t,k)=>t+k[2],0);
  const pick=()=>{let r=Math.random()*TOTAL;for(const k of KINDS){if((r-=k[2])<0)return k}return KINDS[0]};
  const rand=(a,b)=>a+Math.random()*(b-a);

  function ensure(){
    if(svg&&svg.isConnected)return;
    svg=svgEl('svg',{width:'100%',height:'100%','aria-hidden':'true'});
    svg.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:70;overflow:visible';
    document.body.appendChild(svg);
  }
  function step(t,dt){
    for(const p of [...live]){
      p.age+=dt;const k=p.age/p.life;
      if(k>=1){p.el.remove();live.delete(p);continue}
      /* floaty physics: thrown up, then air resistance lets it drift down slowly */
      p.vy+=(p.g-p.drag*p.vy)*dt;p.vx+=(-p.drag*p.vx)*dt;
      p.x+=p.vx*dt+Math.sin(p.age*p.swayF+p.ph)*p.swayA*dt;p.y+=p.vy*dt;
      p.rot+=p.spin*dt;
      const flip=p.flat?1:Math.cos(p.age*p.flipF+p.ph);                 /* petals turn over as they fall */
      let s=p.s;
      if(p.twinkle)s*=.75+.35*Math.sin(p.age*9+p.ph);
      const op=Math.min(1,p.age/.08)*(k<.62?1:1-(k-.62)/.38);
      p.el.setAttribute('transform',`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rot.toFixed(1)}) scale(${(s*flip).toFixed(3)} ${s.toFixed(3)})`);
      p.el.setAttribute('opacity',op.toFixed(3));
    }
    if(!live.size&&sub){Motion.unsub(sub);sub=null}
  }
  /* x,y = where it bursts from (screen pixels) */
  function burst(x,y,{count=44,power=1}={}){
    if(Motion.reduced())return;
    ensure();
    count=Math.min(count,Math.max(0,110-live.size));
    for(let i=0;i<count;i++){
      const [name,sr]=pick(),m=ART.S[name];
      if(!m)continue;
      const el=svgEl('g',{opacity:0},svg);
      const u=svgEl('use',{href:'#s-'+name,x:-m.w/2,y:-m.h/2},el);
      const ang=rand(-165,-15)*Math.PI/180,sp=rand(340,840)*power;
      const spark=name.startsWith('spk');
      live.add({el,x:x+rand(-14,14),y:y+rand(-8,8),vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,
        g:rand(420,560),drag:rand(1.8,2.6),swayF:rand(2.2,4),swayA:rand(25,70),ph:rand(0,6.28),
        rot:rand(0,360),spin:(Math.random()<.5?-1:1)*rand(60,220),flipF:rand(3,6),flat:spark||name.startsWith('fill')||name==='accent0',
        s:rand(sr[0],sr[1]),twinkle:spark,age:0,life:rand(2.2,3.4)});
    }
    if(!sub)sub=Motion.sub(step);
  }
  const fromElement=(el,o)=>{const r=el.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2,o)};
  return{burst,fromElement,get active(){return live.size}};
})();
