/* =====================================================================
   3. PROGRESS + LAYOUT
   LAYOUT   = where things sit (change when the artwork changes)
   PROGRESS = what unlocks when (change when the story changes)
   Neither one touches the DOM.
   ===================================================================== */
const LAYOUT={
  neck:{x:200,y:318},baseY:412,
  vase:{top:308,bottom:446,waterMin:.06,waterMax:.82},
  /* where each flower head sits when fully grown. s = scale of the full-bloom sprite */
  slots:{
    f0:{x:200,y:205,s:.58},f1:{x:142,y:240,s:.50},f2:{x:260,y:234,s:.50},
    f3:{x:200,y:140,s:.46},f4:{x:252,y:160,s:.44},f5:{x:158,y:160,s:.44},
    f6:{x:112,y:292,s:.46},f7:{x:292,y:282,s:.46},f8:{x:98,y:214,s:.40},
    f9:{x:304,y:204,s:.42},f10:{x:178,y:98,s:.38},f11:{x:232,y:100,s:.38},
    f12:{x:334,y:250,s:.38},f13:{x:70,y:264,s:.38}
  },
  /* foliage + filler grow from the neck of the vase */
  fillers:{
    leafA:{sprite:'fill8',x:198,y:322,rot:-8,s:.62,layer:'back'},
    leafB:{sprite:'fill4',x:192,y:322,rot:-36,s:.80,layer:'back'},
    leafC:{sprite:'fill7',x:208,y:322,rot:40,s:.78,layer:'back'},
    euc:{sprite:'fill1',x:186,y:324,rot:-62,s:.74,layer:'back'},
    leafD:{sprite:'fill8',x:214,y:324,rot:62,s:.70,layer:'back'},
    pinkS:{sprite:'fill0',x:194,y:322,rot:-30,s:.66,layer:'back'},
    pinkT:{sprite:'fill3',x:206,y:322,rot:28,s:.70,layer:'back'},
    gyp:{sprite:'fill2',x:190,y:322,rot:-52,s:.64,layer:'back'},
    whiteS:{sprite:'fill6',x:210,y:322,rot:54,s:.62,layer:'back'},
    lavS:{sprite:'fill5',x:200,y:322,rot:10,s:.66,layer:'back'}
  },
  /* places a butterfly can land (scene coordinates) */
  perches:{a:{x:276,y:204},b:{x:312,y:262},c:{x:116,y:204},d:{x:228,y:128},e:{x:302,y:156},f:{x:156,y:112},g:{x:96,y:262}},
  roam:{x0:-30,y0:-80,x1:430,y1:470},   /* where butterflies and sparkles may wander (scene units; the svg draws outside its box) */
  floorPetals:[{x:116,y:444,r:-20,n:'pet0'},{x:262,y:446,r:150,n:'pet3'},{x:156,y:449,r:30,n:'pet5'}]
};

const PROGRESS={
  /* each element grows from 0 to 1 across its range of overall progress */
  recipe:[
    {id:'leafA',kind:'filler',filler:'leafA',range:[.03,.18]},
    {id:'f0',kind:'flower',variant:'pink',slot:'f0',range:[.0,.38]},
    {id:'f1',kind:'flower',variant:'pink',slot:'f1',range:[.01,.48]},
    {id:'f2',kind:'flower',variant:'pink',slot:'f2',range:[.02,.64]},
    {id:'f5',kind:'flower',variant:'pink',slot:'f5',range:[.14,.66]},
    {id:'f9',kind:'flower',variant:'pink',slot:'f9',range:[.20,.70]},
    {id:'f3',kind:'flower',variant:'cream',slot:'f3',range:[.30,.58]},
    {id:'f4',kind:'flower',variant:'cream',slot:'f4',range:[.36,.62]},
    {id:'pinkT',kind:'filler',filler:'pinkT',range:[.40,.52]},
    {id:'gyp',kind:'filler',filler:'gyp',range:[.46,.60]},
    {id:'f6',kind:'flower',variant:'lavender',slot:'f6',range:[.50,.74]},
    {id:'f10',kind:'flower',variant:'cream',slot:'f10',range:[.52,.80]},
    {id:'f7',kind:'flower',variant:'lavender',slot:'f7',range:[.58,.78]},
    {id:'f8',kind:'flower',variant:'butter',slot:'f8',range:[.64,.86]},
    {id:'f13',kind:'flower',variant:'lavender',slot:'f13',range:[.70,.92]},
    {id:'f11',kind:'flower',variant:'butter',slot:'f11',range:[.72,.92]},
    {id:'euc',kind:'filler',filler:'euc',range:[.78,.88]},
    {id:'leafB',kind:'filler',filler:'leafB',range:[.80,.90]},
    {id:'f12',kind:'flower',variant:'pink',slot:'f12',range:[.80,.98]},
    {id:'pinkS',kind:'filler',filler:'pinkS',range:[.82,.92]},
    {id:'leafC',kind:'filler',filler:'leafC',range:[.84,.93]},
    {id:'leafD',kind:'filler',filler:'leafD',range:[.86,.96]},
    {id:'lavS',kind:'filler',filler:'lavS',range:[.86,.95]},
    {id:'whiteS',kind:'filler',filler:'whiteS',range:[.88,.97]}
  ],
  milestones:[.25,.5,.75,1],
  growth(range,p){return Motion.clamp((p-range[0])/(range[1]-range[0]))},
  /* progress 0..1  ->  everything the scene needs to know */
  map(p){
    p=Motion.clamp(p);
    return{
      water:LAYOUT.vase.waterMin+(LAYOUT.vase.waterMax-LAYOUT.vase.waterMin)*p,
      elements:this.recipe.map(e=>({id:e.id,growth:this.growth(e.range,p)})),
      restingPetals:p>=1?3:p>=.95?2:p>=.9?1:0,
      driftingPetalsMax:p>=.9?3:p>=.7?2:p>=.4?1:0,
      visitors:p>=.25,                /* butterflies pass by now and then */
      restingButterflies:p>=.85?3:p>=.7?2:p>=.5?1:0,
      sparkleEvery:p<.03?0:Motion.lerp(1.1,.25,p),
      sparkleBurst:1+Math.floor(p*2.2),   /* seconds between ambient sparkles */
      complete:p>=1
    };
  },
  /* expense slider: dollars (on a 0-50 scale) -> flower stage 0..5 */
  expenseStage(a){
    const k=[[0,0],[5,1.3],[10,2],[20,3],[30,4],[40,4.7],[50,5]];
    a=Motion.clamp(a,0,50);
    for(let i=0;i<k.length-1;i++)if(a<=k[i+1][0])return Motion.lerp(k[i][1],k[i+1][1],(a-k[i][0])/(k[i+1][0]-k[i][0]));
    return 5;
  }
};

/* stem geometry: base in the water -> through the neck -> tip. Pure maths. */
const Geometry={
  curve(slot,fullMeta){
    const s=slot.s,N=LAYOUT.neck,B=LAYOUT.baseY;
    const th=Math.atan2(slot.x-200,340-slot.y)*.8,c=Math.cos(th),sn=Math.sin(th);
    const hxp=(fullMeta.hx-fullMeta.ax)*s,hyp=(fullMeta.hy-fullMeta.ay)*s;
    let Ax=slot.x-(hxp*c-hyp*sn),Ay=slot.y-(hxp*sn+hyp*c);
    if(Ay>300)Ay=300;
    const bx=200+(Ax-200)*.1,Nx=200+(Ax-200)*.12,d2=Math.hypot(Ax-Nx,Ay-N.y);
    const q0={x:bx,y:B},qc={x:Nx,y:362},q1={x:Nx,y:N.y};
    const s1=[q0,{x:q0.x+2/3*(qc.x-q0.x),y:q0.y+2/3*(qc.y-q0.y)},{x:q1.x+2/3*(qc.x-q1.x),y:q1.y+2/3*(qc.y-q1.y)},q1];
    const s2=[q1,{x:Nx,y:N.y-d2*.4},{x:Ax-sn*d2*.4,y:Ay+c*d2*.4},{x:Ax,y:Ay}];
    const f=n=>n.toFixed(1);
    const d=`M${f(s1[0].x)} ${f(s1[0].y)}C${f(s1[1].x)} ${f(s1[1].y)} ${f(s1[2].x)} ${f(s1[2].y)} ${f(s1[3].x)} ${f(s1[3].y)}C${f(s2[1].x)} ${f(s2[1].y)} ${f(s2[2].x)} ${f(s2[2].y)} ${f(s2[3].x)} ${f(s2[3].y)}`;
    const path=new Motion.Path([s1,s2]);
    return{d,at:t=>path.at(t),tip:{x:Ax,y:Ay},rot:th*180/Math.PI,len:path.total};
  }
};
