/* =====================================================================
   5. APP — screens and layout only. All motion lives in the components.
   ===================================================================== */
const DEFAULT_TILES=[
  {id:'coffee',emoji:'☕',label:'Coffee',price:6,max:40,tag:'A little fuel for big things.'},
  {id:'boba',emoji:'🧋',label:'Boba',price:7,max:40,tag:'Sweet, but you’re sweeter.'},
  {id:'drinks',emoji:'🍹',label:'Drinks',price:14,max:60,tag:'Cheers to saving instead.'},
  {id:'food',emoji:'🥡',label:'Food',price:18,max:80,tag:'Home-cooked and proud.'},
  {id:'shopping',emoji:'🛍️',label:'Shopping',price:25,max:200,tag:'Closed the tab, kept the cash.'},
];
const OTHER={id:'other',emoji:'＋',label:'Other',price:10,max:100,tag:'Every skip counts.',custom:true};
const EMOJI_CHOICES=['☕','🧋','🍹','🥡','🍪','🛍️','💄','🍕','🍔','🍟','🍰','🍦','🍷','🍺','🥗','🚕','🎬','🎮','👗','👟','💅','🧴','📚','🎧'];
let TILES=[];
const syncTiles=()=>{TILES=[...state.tiles,OTHER]};
const niceMax=p=>Math.max(p<=8?40:p<=15?60:p<=25?100:p<=40?160:200,Math.ceil(p*2/4)*4);
const WISH_EMOJIS=['💻','👜','👟','💄','✈️','💍','🎧','👗','🌸'];
const KEY='not-today-babe-v3';
let state={skips:[],wish:null,claimed:[],tiles:DEFAULT_TILES.map(t=>({...t}))};
let pickRow=-1;
syncTiles();
let view='home',cat=null,amt=0,note='',customLabel='',draftEmoji='💻',memoryOnly=false,shown=null,viz=null,saving=false;

/* Saving: uses the Claude viewer's storage when it exists, otherwise the browser's localStorage (GitHub Pages, Safari, Chrome...). */
const Store={
  async get(k){
    try{if(window.storage){const r=await window.storage.get(k,false);if(r&&r.value)return r.value}}catch(e){}
    try{return localStorage.getItem(k)}catch(e){return null}
  },
  async set(k,v){
    let ok=false;
    try{if(window.storage){await window.storage.set(k,v,false);ok=true}}catch(e){}
    try{localStorage.setItem(k,v);ok=true}catch(e){}
    return ok;
  }
};
async function load(){
  try{const raw=await Store.get(KEY);if(raw){const s=JSON.parse(raw);state.skips=s.skips||[];state.wish=s.wish||null;state.claimed=s.claimed||[];if(Array.isArray(s.tiles)&&s.tiles.length===5)state.tiles=s.tiles;return}}catch(e){}
  try{const raw=await Store.get('not-today-babe-v2');if(raw){const s=JSON.parse(raw);state.skips=s.skips||[];state.wish=s.wish||null;state.claimed=s.claimed||[]}}catch(e){}
}
async function save(){if(!(await Store.set(KEY,JSON.stringify(state))))memoryOnly=true}

const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'$'+(Math.round(n*100)/100).toLocaleString(undefined,{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2});
const dayKey=t=>{const d=new Date(t);return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate()};
const sum=a=>a.reduce((t,x)=>t+x.amount,0);
const uidS=()=>Math.random().toString(36).slice(2,9);
const todaySkips=()=>state.skips.filter(s=>dayKey(s.ts)===dayKey(Date.now()));
const wishSaved=()=>state.wish?sum(state.skips.filter(s=>s.ts>=state.wish.start)):0;
const pctNow=()=>state.wish?Math.min(100,wishSaved()/state.wish.price*100):0;
function toast(m,ms=2000){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),ms)}

/* ---------- screens ---------- */
function homeHTML(){
  const w=state.wish,pct=pctNow(),ts=todaySkips(),saved=wishSaved();
  const tiles=TILES.map(t=>`<button class="tile ${t.custom?'other':''}" data-cat="${t.id}"><span class="blob">${t.emoji}</span><span>${t.label}</span></button>`).join('');
  return `<div class="screen">
    <div class="hrow"><h1>Little things<br>lead to big blooms <span>♡</span></h1><button class="todaylink" id="openlog">${money(sum(ts))} today ›</button></div>
    <div class="gwrap"><div id="scene"></div></div>
    <div class="dock">
      <div class="goalchip" id="goalcard" role="button" tabindex="0" aria-label="Edit goal">
        <div class="gicon">${w.emoji}</div>
        <div class="gname">${esc(w.name)}</div>
        <div class="gsub">${money(Math.min(saved,w.price))} of ${money(w.price)}</div>
        ${w.url?`<a class="glink" id="golink" href="${esc(w.url)}" target="_blank" rel="noopener noreferrer">View item ↗</a>`:''}
        ${pct>=100?'<button class="claim" id="claim">Claim</button>':''}
      </div>
      <div class="pick"><div class="q"><span>What did you skip?</span><button class="editlink" id="editbtns">Edit</button></div><div class="tiles">${tiles}</div></div>
    </div>
  </div>`;
}
const tickHTML=max=>{let h='';for(let k=0;k<=4;k++)h+=`<span class="tick" style="top:${k*25}%">$${Math.round(max*(4-k)/4)}</span>`;return h};
function addHTML(){
  const t=cat,f=amt/t.max,idx=TILES.indexOf(t)+1;
  return `<div class="screen">
    <div class="top"><button class="icon" id="back" aria-label="Back">‹</button>
      <div class="cat"><div class="blob ${t.custom?'b8':'b'+idx}">${t.emoji}</div>
        <div class="ctitle">${t.custom?`<input id="clabel" maxlength="24" placeholder="What was it?" value="${esc(customLabel)}" aria-label="What you skipped">`:t.label}</div>
        <div class="tag">${t.tag}</div></div>
      <button class="icon" id="close" aria-label="Close">✕</button></div>
    <div class="abody">
      <div class="slider" id="slider" role="slider" tabindex="0" aria-label="Amount skipped" aria-valuemin="0" aria-valuemax="${t.max}" aria-valuenow="${amt}" aria-valuetext="${money(amt)}">
        <div class="strack"></div>${tickHTML(t.max)}
        <div class="thumb" id="thumb" style="top:${(1-f)*100}%"><svg viewBox="-25 -25 50 50" aria-hidden="true"><use href="#s-fl_pink_full" transform="scale(.3) translate(-63.7 -62)"/></svg></div>
        <div class="bubble" id="bubble" style="top:${(1-f)*100}%">${money(amt)}</div>
      </div>
      <div class="vase"><div id="pv"></div></div>
    </div>
    <div class="note"><div class="nh"><span>✎ Add a note (optional)</span><span id="nc">${note.length}/100</span></div>
      <input id="note" maxlength="100" placeholder="Iced latte before class" value="${esc(note)}" aria-label="Note"></div>
    <button class="btn" id="addbtn">Add to my log ✦</button>
  </div>`;
}
function goalHTML(){
  const w=state.wish,first=!w;
  return `<div class="screen">
    <div class="head2"><h1>${first?'Let’s plant<br>your first bloom ♡':'Your goal'}</h1>${first?'':'<button class="icon" id="close" aria-label="Close">✕</button>'}</div>
    <div class="tag" style="margin-top:-4px">${first?'Pick something to save for. Every skip waters it.':'Change what you’re saving for.'}</div>
    <div class="gform">
      <input id="wname" maxlength="40" placeholder="What are you saving for?" value="${w?esc(w.name):''}" aria-label="Goal name">
      <input id="wprice" type="number" inputmode="decimal" min="1" placeholder="How much is it? ($)" value="${w?w.price:''}" aria-label="Goal price">
      <input id="wurl" type="url" inputmode="url" autocapitalize="off" autocorrect="off" placeholder="Link to the item (optional)" value="${w&&w.url?esc(w.url):''}" aria-label="Link to the item">
      <div class="emojis">${WISH_EMOJIS.map(e=>`<button type="button" class="${e===draftEmoji?'on':''}" data-emoji="${e}" aria-label="Pick ${e}">${e}</button>`).join('')}</div>
      <button class="btn" id="savegoal">${first?'Plant it':'Save goal'}</button>
    </div>
    <div class="links"><button class="textlink" id="openlab">Motion lab</button>${w?'<button class="textlink" id="reset">Start over</button>':''}</div>
  </div>`;
}
function customHTML(){
  const rows=state.tiles.map((t,i)=>`<div class="crow"><button class="cemoji blob b${i+1}" data-pick="${i}" aria-label="Change icon for ${esc(t.label)}">${t.emoji}</button>
      <input class="cname" data-name="${i}" maxlength="14" value="${esc(t.label)}" aria-label="Button name">
      <label class="cprice"><span>$</span><input data-cprice="${i}" type="number" inputmode="decimal" min="1" value="${t.price}" aria-label="Usual amount"></label></div>
      ${pickRow===i?`<div class="cpick">${EMOJI_CHOICES.map(e=>`<button data-emo="${e}" aria-label="Use ${e}">${e}</button>`).join('')}</div>`:''}`).join('');
  return `<div class="screen">
    <div class="head2"><h1>Your buttons</h1><button class="icon" id="close" aria-label="Close">✕</button></div>
    <div class="tag" style="margin-top:-4px">Rename them, pick an icon, and set what you usually spend. “Other” stays free-form.</div>
    <div class="clist">${rows}</div>
    <div class="links" style="margin-top:0"><button class="textlink" id="resettiles">Reset to defaults</button></div>
    <button class="btn" id="donetiles">Done</button>
  </div>`;
}
function logHTML(){
  const ts=todaySkips();
  return `<div class="screen">
    <div class="head2"><h1>Today · ${money(sum(ts))}</h1><button class="icon" id="close" aria-label="Close">✕</button></div>
    <div class="log">${ts.length?ts.slice().reverse().map(s=>`
      <div class="item"><span>${s.emoji}</span><span class="l">${esc(s.label)}${s.note?`<small>${esc(s.note)}</small>`:''}</span><span class="a">${money(s.amount)}</span>
      <button class="x" data-del="${s.id}" aria-label="Remove ${esc(s.label)}">✕</button></div>`).join(''):'<div class="empty">Nothing yet today.<br>Walk past the coffee shop and come back. ☕</div>'}</div>
    ${memoryOnly?'<p class="tag" style="text-align:center">Saving isn’t available here, so this session won’t be kept.</p>':''}
  </div>`;
}
const PRESETS=[0,10,25,50,68,75,90,100],EXP=[0,5,10,20,30,40,50],BFS=['resting','fluttering','hovering','flying','landing','celebrating'];
function demoHTML(){
  return `<div class="screen">
    <div class="head2"><h1>Motion lab</h1><button class="icon" id="close" aria-label="Close">✕</button></div>
    <div class="demoscroll">
      <section><h3>Savings</h3><div class="stage" style="height:330px" id="d-scene"></div>
        <input type="range" id="d-range" min="0" max="100" value="68" aria-label="Progress"><div class="readout" id="d-read"></div>
        <div class="chips" id="d-presets">${PRESETS.map(p=>`<button data-p="${p}">${p}%</button>`).join('')}</div>
        <label style="margin-top:8px"><input type="checkbox" id="d-rm" ${Motion.reduced()?'checked':''}> Simulate reduced motion</label></section>
      <section><h3>Expense flower</h3><div class="stage" style="height:290px;display:flex;justify-content:center"><div id="d-exp" style="width:44%;height:100%"></div></div>
        <input type="range" id="d-exr" min="0" max="50" value="18" aria-label="Amount"><div class="readout" id="d-exread"></div>
        <div class="chips" id="d-expre">${EXP.map(p=>`<button data-a="${p}">$${p}</button>`).join('')}</div></section>
      <section><h3>Butterfly</h3><div class="stage" style="height:210px" id="d-bf"></div>
        <div class="chips" id="d-states">${BFS.map(s=>`<button data-s="${s}">${s}</button>`).join('')}</div>
        <div class="chips" id="d-colors">${['pink','purple','cream','blue'].map(c=>`<button data-c="${c}">${c}</button>`).join('')}</div></section>
    </div>
  </div>`;
}

/* ---------- mount the botanical visuals that belong to each screen ---------- */
let rulerTw=null,fitRO=null;
function disposeViz(){rulerTw&&rulerTw.cancel();rulerTw=null;fitRO&&fitRO.disconnect();fitRO=null;if(viz){[].concat(viz).forEach(v=>v&&v.destroy&&v.destroy());viz=null}}
function mountViz(){
  if(view==='home'&&state.wish){
    const w=state.wish,p=pctNow()/100;
    const gw=$('.gwrap'),sc=$('#scene');
    let ruler=null;
    /* the scene sits on the left; the ruler gets its own gutter on the right so they never overlap */
    const fit=()=>{const W=gw.clientWidth,H=gw.clientHeight,s=Math.min(W-66+30,H*340/406);sc.style.width=s+'px';sc.style.height=(s*406/340)+'px';
      if(ruler){ruler.style.top=(sc.offsetTop+.11*sc.offsetHeight)+'px';ruler.style.height=(.855*sc.offsetHeight)+'px'}};
    fit();fitRO=new ResizeObserver(fit);fitRO.observe(gw);
    viz=new BotanicalProgress(sc,{progress:p,goal:w.price,current:wishSaved(),from:shown});
    /* the ruler: goal split in thirds, like the reference; the pill rises with the water */
    const tick=k=>`<div class="rtick" data-f="${(3-k)/3}" style="top:${k*100/3}%"><span class="rl">${money(Math.round(w.price*(3-k)/3))}</span></div>`;
    ruler=document.createElement('div');ruler.className='ruler';
    ruler.innerHTML=`<div class="rline"></div><div class="rfill" id="rfill"></div>${[0,1,2,3].map(tick).join('')}<div class="rpill" id="rpill"></div>`;
    gw.appendChild(ruler);fit();
    const pill=$('#rpill'),ticks=[...ruler.querySelectorAll('.rtick')],setPill=v=>{pill.style.bottom=(v*100)+'%';pill.textContent=Math.round(v*100)+'%';$('#rfill').style.height=(v*100)+'%';ticks.forEach(t=>{const f=+t.dataset.f,near=Math.abs(v-f)<.085,dy=!near?0:(f>v||f===1)?-26:26;t.firstChild.style.transform=`translateY(${dy}px)`})};
    const from=shown==null?p:shown;setPill(from);
    if(Math.abs(from-p)>1e-4)rulerTw=Motion.tween({from,to:p,duration:1500,ease:Motion.ease.inOut,onUpdate:setPill});
    shown=p;
  }else if(view==='add'){
    viz=new ExpenseFlower($('#pv'),{amount:amt,maxAmount:cat.max});
  }else if(view==='demo')mountDemo();
}
function mountDemo(){
  const goal=1500,rd=$('#d-read'),er=$('#d-exread');
  const bp=new BotanicalProgress($('#d-scene'),{progress:.68,goal,current:1020});
  const ef=new ExpenseFlower($('#d-exp'),{amount:18,maxAmount:50});
  const showP=v=>{rd.textContent=`${v}% · ${money(v/100*goal)} of ${money(goal)}`};showP(68);
  const showA=v=>{er.textContent=`${money(v)} · stage ${PROGRESS.expenseStage(v).toFixed(1)} of 5`};showA(18);
  $('#d-range').oninput=e=>{const v=+e.target.value;showP(v);bp.update({progress:v/100,animate:true,duration:600})};
  document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const v=+b.dataset.p;$('#d-range').value=v;showP(v);bp.update({progress:v/100,animate:true})});
  $('#d-exr').oninput=e=>{const v=+e.target.value;showA(v);ef.setAmount(v)};
  document.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{const v=+b.dataset.a;$('#d-exr').value=v;showA(v);ef.setAmount(v)});
  $('#d-rm').onchange=e=>{Motion.forceReduced(e.target.checked?true:null);render()};
  /* butterfly stage */
  injectSpriteDefs();
  const bsvg=svgEl('svg',{viewBox:'0 0 360 210'},$('#d-bf'));
  const A={x:72,y:150},Bp={x:288,y:140};
  [A,Bp].forEach(p=>svgEl('ellipse',{cx:p.x,cy:p.y+16,rx:16,ry:3,fill:'#E6D9C5'},bsvg));
  const g=svgEl('g',null,bsvg);let color='pink',bf=null,at=A;
  const make=()=>{bf&&bf.destroy();bf=new Butterfly({variant:color,x:at.x,y:at.y,size:.42,restRotation:-6}).mount(g)};make();
  const mark=(sel,attr,val)=>document.querySelectorAll(sel).forEach(b=>b.classList.toggle('on',b.dataset[attr]===val));
  mark('[data-c]','c',color);mark('[data-s]','s','resting');
  document.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{color=b.dataset.c;mark('[data-c]','c',color);make();mark('[data-s]','s','resting')});
  document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{
    const s=b.dataset.s;mark('[data-s]','s',s);
    const other=at===A?Bp:A;
    if(s==='flying')bf.setState('flying',{to:{x:other.x,y:other.y-40},onDone:()=>{at=other}});
    else if(s==='landing')bf.setState('landing',{to:other,onDone:()=>{at=other;mark('[data-s]','s','resting')}});
    else if(s==='celebrating')bf.setState('celebrating',{center:{x:180,y:100},radius:66,land:at,onDone:()=>mark('[data-s]','s','resting')});
    else bf.setState(s);
  });
  viz=[bp,ef,{destroy(){bf&&bf.destroy();bsvg.remove()}}];
}

function render(){
  disposeViz();
  if(!state.wish&&view!=='goal'&&view!=='demo')view='goal';
  $('#app').innerHTML=view==='home'?homeHTML():view==='add'?addHTML():view==='goal'?goalHTML():view==='demo'?demoHTML():view==='custom'?customHTML():logHTML();
  bind();mountViz();
}
function go(v){if(saving)return;view=v;render()}

/* Some viewers block links from opening. Try to open it; if that is blocked, copy it so it can be pasted into a browser. */
function openLink(url){
  let w=null;
  try{w=window.open(url,'_blank','noopener,noreferrer')}catch(e){}
  if(w)return;
  const done=()=>toast('Link copied. Paste it into your browser.',3200);
  const legacy=()=>{
    const t=document.createElement('textarea');t.value=url;t.setAttribute('readonly','');t.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(t);t.select();t.setSelectionRange(0,url.length);
    let ok=false;try{ok=document.execCommand('copy')}catch(e){}
    t.remove();ok?done():toast(url,6000);
  };
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(done,legacy);else legacy();
}

/* ---------- actions ---------- */
function openCat(id){cat=TILES.find(t=>t.id===id);amt=Math.min(cat.price,cat.max);note='';customLabel='';go('add')}

/* Add to my log: the button settles, the flower moves once, a single sparkle, then on. Under 600ms. */
function addSkip(){
  if(saving)return;
  if(!(amt>0)){toast('Slide to an amount first');return}
  saving=true;
  const btn=$('#addbtn');btn.classList.add('press');setTimeout(()=>btn.classList.remove('press'),110);
  if(viz&&!Motion.reduced()){viz.nudge();viz.sparkle()}
  setTimeout(()=>{
    const label=cat.custom?(customLabel.trim()||'Something fun'):cat.label;
    const before=pctNow();
    state.skips.push({id:uidS(),label,emoji:cat.custom?'🌼':cat.emoji,amount:amt,note:note.trim(),ts:Date.now()});
    save();saving=false;view='home';render();
    if(before<100&&pctNow()>=100)toast('Fully grown. Ready to claim.',2600);
  },Motion.reduced()?60:420);
}

/* vertical slider: amount -> flower */
function setAmt(v){
  const step=cat.max>100?5:1;
  v=Math.max(0,Math.min(cat.max,Math.round(v/step)*step));
  if(v===amt)return;
  amt=v;const f=amt/cat.max;
  $('#thumb').style.top=(1-f)*100+'%';$('#bubble').style.top=(1-f)*100+'%';$('#bubble').textContent=money(amt);
  const s=$('#slider');s.setAttribute('aria-valuenow',amt);s.setAttribute('aria-valuetext',money(amt));
  viz&&viz.setAmount(amt);
}
function bindSlider(){
  const s=$('#slider'),tr=s.querySelector('.strack');let drag=false;
  const fromEvent=e=>{const r=tr.getBoundingClientRect();setAmt((1-(e.clientY-r.top)/r.height)*cat.max)};
  s.onpointerdown=e=>{drag=true;s.setPointerCapture(e.pointerId);fromEvent(e)};
  s.onpointermove=e=>{if(drag)fromEvent(e)};
  s.onpointerup=s.onpointercancel=()=>{drag=false};
  s.onkeydown=e=>{
    const step=cat.max>100?5:1;
    if(e.key==='ArrowUp'||e.key==='ArrowRight'){setAmt(amt+step);e.preventDefault()}
    else if(e.key==='ArrowDown'||e.key==='ArrowLeft'){setAmt(amt-step);e.preventDefault()}
    else if(e.key==='Home'){setAmt(0);e.preventDefault()}
    else if(e.key==='End'){setAmt(cat.max);e.preventDefault()}
  };
}

function bind(){
  document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>openCat(b.dataset.cat));
  if($('#goalcard')){
    const open=()=>{draftEmoji=state.wish.emoji;go('goal')};
    $('#goalcard').onclick=open;$('#goalcard').onkeydown=e=>{if(e.key==='Enter'&&e.target.id==='goalcard')open()};
    if($('#golink'))$('#golink').onclick=e=>{e.stopPropagation();e.preventDefault();openLink(state.wish.url)};
  }
  if($('#claim'))$('#claim').onclick=e=>{
    e.stopPropagation();
    state.claimed.unshift(state.wish);state.wish=null;draftEmoji='💻';shown=null;
    save();render();toast('Treat yourself. You earned it.',2600);
  };
  if($('#openlog'))$('#openlog').onclick=()=>go('log');
  if($('#editbtns'))$('#editbtns').onclick=()=>{pickRow=-1;go('custom')};
  document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const i=+b.dataset.pick;pickRow=pickRow===i?-1:i;render()});
  document.querySelectorAll('[data-emo]').forEach(b=>b.onclick=()=>{state.tiles[pickRow].emoji=b.dataset.emo;pickRow=-1;syncTiles();save();render()});
  document.querySelectorAll('[data-name]').forEach(i=>{
    i.oninput=()=>{const t=state.tiles[+i.dataset.name];t.label=i.value.trim()||t.label;syncTiles();save()};
    i.onblur=()=>{if(!i.value.trim())i.value=state.tiles[+i.dataset.name].label};
  });
  document.querySelectorAll('[data-cprice]').forEach(i=>i.oninput=()=>{const n=parseFloat(i.value);if(n>0){const t=state.tiles[+i.dataset.cprice];t.price=n;t.max=niceMax(n);syncTiles();save()}});
  if($('#donetiles'))$('#donetiles').onclick=()=>go('home');
  if($('#resettiles'))$('#resettiles').onclick=()=>{if(!confirm('Put the buttons back the way they were?'))return;state.tiles=DEFAULT_TILES.map(t=>({...t}));pickRow=-1;syncTiles();save();render()};
  if($('#openlab'))$('#openlab').onclick=()=>go('demo');
  if($('#close'))$('#close').onclick=()=>go(view==='demo'&&!state.wish?'goal':'home');
  if($('#back'))$('#back').onclick=()=>go('home');
  if($('#slider')){
    bindSlider();
    $('#note').oninput=e=>{note=e.target.value;$('#nc').textContent=note.length+'/100'};
    if($('#clabel'))$('#clabel').oninput=e=>{customLabel=e.target.value};
    $('#addbtn').onclick=addSkip;
  }
  document.querySelectorAll('[data-emoji]').forEach(b=>b.onclick=()=>{draftEmoji=b.dataset.emoji;document.querySelectorAll('[data-emoji]').forEach(x=>x.classList.toggle('on',x===b))});
  if($('#savegoal'))$('#savegoal').onclick=()=>{
    const name=$('#wname').value.trim(),price=parseFloat($('#wprice').value);
    if(!name||!(price>0)){toast('Add a name and a price');return}
    const first=!state.wish;
    let url=$('#wurl').value.trim();
    if(url){
      if(!/^https?:\/\//i.test(url))url='https://'+url;
      try{const u=new URL(url);if(!u.hostname.includes('.'))throw 0;url=u.href}catch(e){toast('That link doesn’t look right');return}
    }
    state.wish={name,price,emoji:draftEmoji,url,start:state.wish?state.wish.start:Date.now()};
    if(first)shown=null;
    save();view='home';render();toast(first?'Planted. Let’s grow it.':'Goal updated.');
  };
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{state.skips=state.skips.filter(s=>s.id!==b.dataset.del);save();render()});
  if($('#reset'))$('#reset').onclick=()=>{
    if(!confirm('Wipe everything and start fresh?'))return;
    state={skips:[],wish:null,claimed:[],tiles:state.tiles};shown=null;save();render();
  };
}

(async()=>{
  await load();syncTiles();injectSpriteDefs();
  if(state.wish)draftEmoji=state.wish.emoji;
  view=location.hash==='#demo'?'demo':(state.wish?'home':'goal');
  render();
})();
