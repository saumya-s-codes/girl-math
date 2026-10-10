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
const OTHER={id:'other',emoji:'＋',label:'Other',price:10,max:100,tag:'Every save counts.',custom:true};
const EMOJI_CHOICES=['☕','🧋','🍹','🥡','🍪','🛍️','💄','🍕','🍔','🍟','🍰','🍦','🍷','🍺','🥗','🚕','🎬','🎮','👗','👟','💅','🧴','📚','🎧'];
let TILES=[];
const OTHER_EMOJIS=[...EMOJI_CHOICES,'🍫','🍩','🥂','🍸','🧁','🍜','🍣','🥐','🎟️','✈️','💐','🕯️','🧸','📱','💍','🛒','🚗','🏋️','💇','🎁'];
let customEmoji=null,whenPast=false,whenDate=null,logTab='saves';
const syncTiles=()=>{TILES=[...state.tiles,OTHER]};
const niceMax=p=>Math.max(p<=8?40:p<=15?60:p<=25?100:p<=40?160:200,Math.ceil(p*2/4)*4);
const WISH_EMOJIS=['💻','👜','👟','💄','✈️','💍','🎧','👗','🌸','📱','📷','🎮','🏠','🚗','🎁','🧳','📚','🛋️','⌚','🎟️','🏖️','🐶','🚲','🎸','🎨','🧴','💎','👠','🖥️','⌨️','📺','🎬','🎤','🎹','🥁','🎻','📖','✏️','🧶','🧵','👛','🧣','🧢','👒','👓','🕶️','🩰','👙','🧥','🧦','💅','💆','🛁','🪞','🏋️','🧘','⛷️','🏄','🏕️','🗼','🗽','🏝️','🚢','🚂','🛵','🏍️','🍽️','☕','🍷','🎂','🍰','🌷','🌹','🪴','🛏️','🪑','💡','🧺','🐱','🐰','🦋','🎓','💼','🔑','💰','🎄','🎈','🎀'];
const ALL_EMOJIS=[...new Set([...WISH_EMOJIS,...OTHER_EMOJIS])];
/* ===== DATA SAFETY: read this before changing anything here =====
   Your goals and saves are kept under the name KEY. NEVER rename KEY. A new name looks like an empty app and
   your data would seem to vanish (it would still be there, under the old name). If a rename is ever truly needed,
   copy the old data to the new name first, keep the old copy, and add the old name to the fallbacks in load().
   Every save also writes a second copy under BACKUP_KEY, and load() falls back to it if the main copy is missing
   or damaged. Anything unreadable is set aside under a 'rescue' name instead of being overwritten. */
const KEY='not-today-babe-v3';
const BACKUP_KEY='not-today-babe-backup';
let state={skips:[],wish:null,claimed:[],tiles:DEFAULT_TILES.map(t=>({...t}))};
let pickRow=-1;
syncTiles();
let view='home',cat=null,amt=0,note='',customLabel='',draftEmoji=null,memoryOnly=false,shown=null,viz=null,saving=false,returnView='home',lastClaimed=null,commitAmtEdit=()=>{},openAmtEdit=()=>{},addOpenedAt=0;

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
function cleanSamples(){
  if(!state.skips.some(s=>s.sample))return;
  state.skips=state.skips.filter(s=>!s.sample);
  if(state.wish&&state.sampleStart!=null)state.wish.start=state.sampleStart;
  state.sampleStart=null;
}
let restoredNote=null;
async function readCopy(k){
  const raw=await Store.get(k);
  if(!raw)return null;
  try{const s=JSON.parse(raw);if(s&&typeof s==='object')return s}catch(e){}
  /* there is something there, but it can't be read: set it aside so it is never lost */
  try{
    const rk='not-today-babe-rescue-'+k;
    if(!localStorage.getItem(rk))localStorage.setItem(rk,raw);
  }catch(e){}
  return null;
}
async function load(){
  let s=await readCopy(KEY),fromBackup=false;
  if(!s){s=await readCopy(BACKUP_KEY);fromBackup=!!s}
  if(!s)s=await readCopy('not-today-babe-v2');                 /* the earliest format */
  if(!s)return;
  state.skips=s.skips||[];state.wish=s.wish||null;state.claimed=s.claimed||[];
  if(Array.isArray(s.tiles)&&s.tiles.length===5)state.tiles=s.tiles;
  state.hinted=!!s.hinted;state.visited=!!s.visited;
  cleanSamples();
  if(fromBackup){restoredNote='Restored your data from the backup copy.';save()}
}
async function save(){
  const json=JSON.stringify(state);
  const ok=await Store.set(KEY,json);
  if(ok)await Store.set(BACKUP_KEY,json);                      /* the second copy, under a different name */
  if(!ok)memoryOnly=true;
}

const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'$'+(Math.round(n*100)/100).toLocaleString(undefined,{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2});
const dayKey=t=>{const d=new Date(t);return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate()};
const sum=a=>a.reduce((t,x)=>t+x.amount,0);
const uidS=()=>Math.random().toString(36).slice(2,9);
const todaySkips=()=>state.skips.filter(s=>dayKey(s.ts)===dayKey(Date.now()));
const wishSaved=()=>state.wish?sum(state.skips.filter(s=>s.ts>=state.wish.start)):0;
const pctNow=()=>state.wish?Math.min(100,wishSaved()/state.wish.price*100):0;
function toast(m,ms=2000,action){
  const t=$('#toast');t.textContent=m;
  if(action){const b=document.createElement('button');b.className='tundo';b.textContent=action.label;b.onclick=()=>{t.classList.remove('show');action.fn()};t.appendChild(b)}
  t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),ms);
}

/* ---------- screens ---------- */
function chipInner(){
  const w=state.wish,pct=pctNow(),saved=wishSaved();
  return `<div class="gicon">${w.emoji}</div>
        <div class="gname">${esc(w.name)}</div>
        <div class="gsub">${money(Math.min(saved,w.price))} of ${money(w.price)}</div>
        ${w.url?`<a class="glink" id="golink" href="${esc(w.url)}" target="_blank" rel="noopener noreferrer">View item ↗</a>`:''}
        ${pct>=100?'<button class="claim" id="claim">Claim</button>':''}`;
}
function goalHTML(){
  return `<div class="screen welcome">
    <div class="garden" id="garden" aria-hidden="true"></div><div class="gfx" id="gfx" aria-hidden="true"></div>
    <div class="hrow wtop"><div class="wtext">
      <div class="wbrand">Not Today, Babe ♡</div>
      <h1>Little things<br>lead to big blooms</h1>
    </div><button class="homebtn" id="opensettings" aria-label="Settings">⚙️</button><button class="todaylink" id="totracker">My tracker ›</button></div>
    ${goalForm()}
    <div class="gpanel" id="gpanel" hidden><div class="tag" style="margin-bottom:8px">Pick an icon</div><div class="gpgrid">${WISH_EMOJIS.map(e=>`<button type="button" data-gemo="${e}" aria-label="Use ${e}">${e}</button>`).join('')}</div></div>
  </div>`;
}
function bloomedHTML(){
  const c=lastClaimed;
  if(!c)return homeHTML();
  return `<div class="screen bloomed">
    <button class="icon bloomx" id="close" aria-label="Close">✕</button>
    <div class="bloomhero" id="bloom" aria-hidden="true"></div>
    <h1>${esc(c.name)} Bloomed!</h1>
    <div class="bsub">All your little choices added up<br>to something big. ♡</div>
    <div class="bcard"><span class="bspk s1" aria-hidden="true">✦</span><span class="bspk s2" aria-hidden="true">✦</span><span class="bspk s3" aria-hidden="true">✦</span>
      <div class="bicon">${esc(c.emoji||'🌸')}</div>
      <div class="btext"><div class="bsaved"><span id="bamt">${money(c.saved!=null?c.saved:c.price)}</span> <small>saved</small></div>
        <div class="bline">You reached your goal for ${esc(c.name)}!</div></div></div>
    <button class="btn" id="newgoal"><span class="bsp">✦</span> Add new goal <span class="bsp">✦</span></button>
    <button class="textlink backlink" id="backtrk">Back to tracker</button>
  </div>`;
}
function homeHTML(){
  const w=state.wish,pct=pctNow(),ts=todaySkips(),saved=wishSaved();
  const tiles=TILES.map(t=>`<button class="tile ${t.custom?'other':''}" data-cat="${t.id}"><span class="blob">${t.emoji}</span><span>${t.label}</span></button>`).join('');
  return `<div class="screen">
    <div class="hrow"><h1>Little things<br>lead to big blooms <span>♡</span></h1><div class="hbtns"><button class="todaylink" id="openlog">${money(sum(ts))} today ›</button></div></div>
    <div class="gwrap"><div id="scene"></div></div>
    <div class="dock">
      <div class="goalchip ${w?'':'empty'}" id="goalcard" role="button" tabindex="0" aria-label="${w?'Edit goal':'Enter goal'}">${w?chipInner():'<div class="gplus">＋</div><div class="gname">Enter goal</div>'}</div>
      <div class="pick"><div class="q"><span>What did you save on?</span><button class="editlink" id="editbtns">Edit</button></div><div class="tiles">${tiles}</div></div>
    </div>
  </div>`;
}
const tickHTML=max=>{let h='';for(let k=0;k<=4;k++)h+=`<span class="tick" style="top:${k*25}%">${money(k===0?max:Math.round(max*(4-k)/4))}${k===0?'<small> to goal</small>':''}</span>`;return h};
const isoDay=off=>{const d=new Date();d.setDate(d.getDate()-off);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const fmtPicked=iso=>{const [y,m,d]=iso.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString(undefined,{month:'short',day:'numeric'})};
const fmtLong=iso=>{
  const [y,m,d]=iso.split('-').map(Number),dt=new Date(y,m-1,d);
  const pretty=dt.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  return iso===isoDay(1)?'Yesterday · '+dt.toLocaleDateString(undefined,{month:'short',day:'numeric'}):pretty;
};
function chosenTs(){
  if(!whenPast||!whenDate)return Date.now();
  const [y,m,dd]=whenDate.split('-').map(Number),d=new Date(y,m-1,dd);
  if(dayKey(d)===dayKey(Date.now()))return Date.now();
  d.setHours(12,0,0,0);return +d;                                   /* a past day: midday, so it sorts sensibly */
}
function whenHint(){
  if(!whenPast)return '';
  const ts=chosenTs();
  if(state.wish&&ts<state.wish.start)return 'That’s before this goal started, so it will show in your history but won’t count toward it.';
  return '';
}
function addHTML(){
  const t=cat,f=amt/t.max,idx=t.idx+1;
  return `<div class="screen">
    <div class="top"><button class="icon" id="back" aria-label="Back">‹</button>
      <button class="icon" id="close" aria-label="Close">✕</button></div>
    <div class="abody">
      <div class="slider" id="slider" role="slider" tabindex="0" aria-label="Amount saved" aria-valuemin="0" aria-valuemax="${t.max}" aria-valuenow="${amt}" aria-valuetext="${money(amt)}">
        <div class="strack"></div>${tickHTML(t.max)}
        <div class="thumb" id="thumb" style="top:${(1-f)*100}%"><svg viewBox="-25 -25 50 50" aria-hidden="true"><use href="#s-fl_pink_full" transform="scale(.3) translate(-63.7 -62)"/></svg></div>
        <div class="bubble" id="bubble" style="top:${(1-f)*100}%"><span id="bval">${money(amt)}</span><input id="bubin" class="bubin" type="text" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false" hidden aria-label="Exact amount"></div>
      </div>
      <div class="vase"><div id="pv"></div></div>
    </div>
    <div class="dcard">
      <div class="drow">
        <div class="dicon"><button type="button" class="iconpick set" id="apickbtn" aria-label="Choose an icon" aria-expanded="false">${customEmoji||(t.custom?'🌼':t.emoji)}</button><span class="dchg">tap to change</span></div>
        <div class="dfield">
          <input id="alabel" class="dname" maxlength="24" placeholder="What was it?" value="${esc(customLabel)}" aria-label="What you saved on">
          <input id="note" class="notein" maxlength="100" placeholder="Add a note (optional)" value="${esc(note)}" aria-label="Note">
        </div>
      </div>
      ${whenPast?`<div class="when"><span class="wl">Date</span>
        <label class="wpick on"><span id="wlabel">${esc(fmtLong(whenDate))}</span><input type="date" id="wdate" max="${isoDay(0)}" value="${whenDate}" aria-label="Pick a date"></label></div>
      <div class="whenhint" id="whenhint">${whenHint()}</div>`:''}
    </div>
    <div class="gpanel apanel" id="apanel" hidden><div class="tag" style="margin-bottom:8px">Pick an icon</div><div class="gpgrid">${ALL_EMOJIS.map(e=>`<button type="button" data-aemo="${e}" aria-label="Use ${e}">${e}</button>`).join('')}</div></div>
    <button class="btn" id="addbtn"><span class="bsp">✦</span> Add to my log <span class="bsp">✦</span></button>
  </div>`;
}
/* saves logged while no goal was set count toward the next goal (anything newer than the last claim) */
function startForNewGoal(){
  const lastClaim=Math.max(0,...(state.claimed||[]).map(c=>c.claimedAt||0));
  const loose=state.skips.filter(s=>s.ts>lastClaim).map(s=>s.ts);
  return loose.length?Math.min(...loose)-1000:Date.now();
}
function goalForm(){
  const w=state.wish,first=!w;
  return `<div class="wform">
    <div class="wfhead"><div><div class="wftitle">${first?'Plant your first bloom ♡':'Your goal'}</div>
      <div class="tag">${first?'Pick something to save for. Every save waters it.':'Change what you’re saving for.'}</div></div>
    </div>
    <div class="gform">
      <input id="wname" maxlength="40" placeholder="What are you saving for?" value="${w?esc(w.name):''}" aria-label="Goal name">
      <input id="wprice" type="number" inputmode="decimal" min="1" placeholder="How much is it? ($)" value="${w?w.price:''}" aria-label="Goal price">
      <input id="wurl" type="url" inputmode="url" autocapitalize="off" autocorrect="off" placeholder="Link to the item (optional)" value="${w&&w.url?esc(w.url):''}" aria-label="Link to the item">
      <div class="iconrow"><button type="button" class="iconpick ${draftEmoji?'set':''}" id="gpickbtn" aria-label="Choose an icon" aria-expanded="false">${draftEmoji||'＋'}</button><span class="iconhint" id="gpickhint">${draftEmoji?'Tap to change the icon':'Add an icon (optional)'}</span></div>
      <button class="btn" id="savegoal">${first?'Plant it':'Save goal'}</button>
    </div>
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
const dayLabel=ts=>{
  const d=new Date(ts),t=new Date(),y=new Date();y.setDate(t.getDate()-1);
  if(dayKey(d)===dayKey(t))return'Today';if(dayKey(d)===dayKey(y))return'Yesterday';
  return d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
};
function pastpickHTML(){
  const tiles=TILES.map(t=>`<button class="tile ${t.custom?'other':''}" data-past="${t.id}"><span class="blob">${t.emoji}</span><span>${esc(t.label)}</span></button>`).join('');
  return `<div class="screen">
    <div class="head2"><h1>Add a past save</h1><button class="icon" id="close" aria-label="Close">✕</button></div>
    <div class="tag" style="margin-top:-4px">Forgot to log something? Pick what it was, then choose the day. For a donut or anything else, use Other.</div>
    <div class="pastgrid">${tiles}</div>
  </div>`;
}
function claimedHTML(){
  const list=state.claimed||[];
  if(!list.length)return '<div class="empty">Nothing claimed yet.<br>When a goal is full, tap Claim on its card and it will live here. 🌸</div>';
  const total=list.reduce((t,c)=>t+(c.price||0),0);
  const fmt=ts=>new Date(ts).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
  return `<div class="claimsum"><b>${list.length}</b> claimed · <b>${money(total)}</b> saved up</div>`+list.map((c,i)=>{
    const days=c.claimedAt&&c.start?Math.max(1,Math.round((c.claimedAt-c.start)/86400000)):null;
    return `<div class="cl"><div class="gicon">${esc(c.emoji||'🌸')}</div>
      <div class="cltext"><div class="gname">${esc(c.name)}</div>
        <div class="gsub">${money(c.price)}${c.claimedAt?` · claimed ${fmt(c.claimedAt)}`:''}${days?` · ${days} day${days===1?'':'s'}`:''}</div>
        ${c.url?`<a class="glink" href="${esc(c.url)}" data-openlink="${esc(c.url)}" target="_blank" rel="noopener noreferrer">View item ↗</a>`:''}</div>
      <button class="x" data-delclaim="${i}" aria-label="Remove ${esc(c.name)} from claimed">✕</button></div>`}).join('');
}
function weekCols(days,max){
  return days.map((d,i)=>`<button class="wcol ${d.today?'t':''} ${i===0?'first':''} ${i===6?'last':''}" data-wday="${i}" aria-label="${d.name}: ${money(d.total)}, ${d.count} save${d.count===1?'':'s'}"><div class="wtip" hidden><b>${money(d.total)}</b> <small>${d.name} · ${d.count} save${d.count===1?'':'s'}</small></div><div class="wtrack"><div class="wbar" style="height:${Math.max(4,Math.round(d.total/max*100))}%"></div></div><span class="wlabel">${d.label}</span></button>`).join('');
}
function bindWeek(){
  document.querySelectorAll('[data-wday]').forEach(col=>col.onclick=()=>{
    const on=!col.classList.contains('sel');
    document.querySelectorAll('.wcol').forEach(c=>{c.classList.remove('sel');c.querySelector('.wtip').hidden=true});
    if(on){col.classList.add('sel');col.querySelector('.wtip').hidden=false}
  });
}
let weekFix=null;
function weekDays(){
  const days=[];
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);const k=dayKey(d);
    days.push({k,label:d.toLocaleDateString(undefined,{weekday:'narrow'}),name:i===0?'Today':d.toLocaleDateString(undefined,{weekday:'short'}),
      count:state.skips.filter(s=>dayKey(s.ts)===k).length,total:sum(state.skips.filter(s=>dayKey(s.ts)===k)),today:i===0});
  }
  return days;
}
/* Removing a save only changes a few things on the screen, so change just those: the list keeps its place
   and the bars glide to their new height instead of the whole screen being redrawn. */
function patchWeek(){
  const days=weekDays(),max=Math.max(1,...days.map(d=>d.total));
  const total=days.reduce((t,d)=>t+d.total,0),count=days.reduce((t,d)=>t+d.count,0);
  const wh=document.querySelector('.weekhead');
  if(wh){const b=wh.querySelector('b'),sp=wh.querySelectorAll('span');if(b)b.textContent=money(total);if(sp[1])sp[1].textContent=`· ${count} save${count===1?'':'s'}`}
  document.querySelectorAll('.wcol').forEach((col,i)=>{
    const d=days[i];if(!d)return;
    col.setAttribute('aria-label',`${d.name}: ${money(d.total)}, ${d.count} save${d.count===1?'':'s'}`);
    const bar=col.querySelector('.wbar');
    if(bar){
      const now=bar.getBoundingClientRect().height;          /* start from exactly where the bar is... */
      bar.style.height=now+'px';void bar.offsetHeight;        /* ...make the browser notice... */
      bar.style.height=Math.max(4,Math.round(d.total/max*100))+'%';   /* ...then glide to the new height */
    }
    const tip=col.querySelector('.wtip');if(tip)tip.innerHTML=`<b>${money(d.total)}</b> <small>${d.name} · ${d.count} save${d.count===1?'':'s'}</small>`;
  });
  /* once the glide is over, redraw the chart cleanly from the data, so it is always exactly right on any browser */
  clearTimeout(weekFix);
  weekFix=setTimeout(()=>{
    const w=document.querySelector('.week');if(!w||view!=='log')return;
    const sel=[...w.querySelectorAll('.wcol')].findIndex(c=>c.classList.contains('sel'));
    const dd=weekDays(),mx=Math.max(1,...dd.map(d=>d.total));
    w.innerHTML=weekCols(dd,mx);bindWeek();
    if(sel>=0){const c=w.querySelectorAll('.wcol')[sel];if(c){c.classList.add('sel');c.querySelector('.wtip').hidden=false}}
  },800);
}
function removeSave(id){
  const s=state.skips.find(x=>x.id===id);if(!s)return;
  state.skips=state.skips.filter(x=>x.id!==id);save();
  const btn=document.querySelector(`[data-del="${id}"]`),row=btn&&btn.closest('.item');
  if(!row||view!=='log'||logTab!=='saves'){render();return}
  let head=row.previousElementSibling;while(head&&!head.classList.contains('dayhead'))head=head.previousElementSibling;
  row.remove();
  const left=state.skips.filter(x=>dayKey(x.ts)===dayKey(s.ts));
  if(head){if(!left.length)head.remove();else head.lastElementChild.textContent=money(sum(left))}
  patchWeek();
  const log=document.querySelector('.log');
  if(log&&!log.querySelector('.item'))log.innerHTML='<div class="empty">Nothing yet.<br>Walk past the coffee shop and come back. ☕</div>';
}
function logHTML(){
  const all=state.skips.slice().sort((a,b)=>b.ts-a.ts);
  const groups=[];
  all.forEach(s=>{const k=dayKey(s.ts);let g=groups[groups.length-1];if(!g||g.k!==k){g={k,ts:s.ts,items:[]};groups.push(g)}g.items.push(s)});
  /* last seven days as soft bars */
  const days=weekDays();
  const max=Math.max(1,...days.map(d=>d.total)),weekTotal=sum(days.map(d=>({amount:d.total})));
  const weekCount=state.skips.filter(s=>days.some(d=>d.k===dayKey(s.ts))).length;
  return `<div class="screen">
    <div class="head2"><h1>Your saves</h1><button class="icon" id="close" aria-label="Close">✕</button></div>
    <div class="tabs" role="tablist"><button role="tab" data-tab="saves" class="${logTab==='saves'?'on':''}">Saves</button><button role="tab" data-tab="claimed" class="${logTab==='claimed'?'on':''}">Claimed${(state.claimed||[]).length?' · '+state.claimed.length:''}</button></div>
    ${logTab==='claimed'?`<div class="log">${claimedHTML()}</div>`:`<button class="addpast" id="addpast">＋ Add a past save</button>
    <div class="weekhead"><span>This week</span><b>${money(weekTotal)}</b><span>· ${weekCount} save${weekCount===1?'':'s'}</span><i class="whint">tap a bar</i></div>
    <div class="week" role="group" aria-label="Saves over the last seven days">${weekCols(days,max)}</div>
    <div class="log">${groups.length?groups.map(g=>`
      <div class="dayhead"><span>${dayLabel(g.ts)}</span><span>${money(sum(g.items))}</span></div>
      ${g.items.map(s=>`<div class="item"><span>${s.emoji}</span><span class="l">${esc(s.label)}${s.note?`<small>${esc(s.note)}</small>`:''}</span><span class="a">${money(s.amount)}</span>
        <button class="x" data-del="${s.id}" aria-label="Remove ${esc(s.label)}">✕</button></div>`).join('')}`).join(''):'<div class="empty">Nothing yet.<br>Walk past the coffee shop and come back. ☕</div>'}</div>`}
    ${memoryOnly?'<p class="tag" style="text-align:center">Saving isn’t available here, so this session won’t be kept.</p>':''}
  </div>`;
}

/* ---------- mount the botanical visuals that belong to each screen ---------- */
let rulerTw=null,fitRO=null,homeUI=null;
function disposeViz(){homeUI=null;rulerTw&&rulerTw.cancel();rulerTw=null;fitRO&&fitRO.disconnect();fitRO=null;if(viz){[].concat(viz).forEach(v=>v&&v.destroy&&v.destroy());viz=null}}
function mountViz(){
  if(view==='bloomed'){
    const hero=$('#bloom');
    const fit=()=>{const W=hero.clientWidth,H=hero.clientHeight,s=Math.min(W,H*340/406);hero.firstChild&&(hero.firstChild.style.width=s+'px',hero.firstChild.style.height=(s*406/340)+'px')};
    const holder=document.createElement('div');holder.style.cssText='position:relative;margin:0 auto';hero.appendChild(holder);
    const f2=()=>{const W=hero.clientWidth,H=hero.clientHeight,s=Math.min(W,H*340/406);holder.style.width=s+'px';holder.style.height=(s*406/340)+'px'};
    f2();fitRO=new ResizeObserver(f2);fitRO.observe(hero);
    const bp=new BotanicalProgress(holder,{progress:1,sky:false});
    const rain=new PetalRain(document.querySelector('.bloomed'));
    const total=lastClaimed.saved!=null?lastClaimed.saved:lastClaimed.price,amtEl=$('#bamt'),card=document.querySelector('.bcard');
    let counter=null;
    if(!Motion.reduced()&&amtEl){
      amtEl.textContent=money(0);
      counter=Motion.tween({from:0,to:total,duration:1800,delay:700,ease:Motion.ease.out,
        onUpdate:v=>{amtEl.textContent=money(Math.round(v))},
        onDone:()=>{amtEl.textContent=money(total);card&&card.classList.add('pulse')}});
    }
    viz=[bp,rain,{destroy(){counter&&counter.cancel()}}];
    setTimeout(()=>{
      if(view!=='bloomed')return;
      const r=hero.getBoundingClientRect();
      Confetti.burst(r.left+r.width/2,r.top+r.height*.6,{count:70,power:1.3});          /* the confetti, as it arrives */
      if(bp.scene)bp.scene.celebrate();
    },400);
  }else if(view==='goal'){
    viz=new GardenScene($('#garden'),$('#gfx'));            /* the full, lush bouquet: butterflies, petals and sparkles included */
  }else if(view==='home'){
    const w=state.wish,p=w?pctNow()/100:0;
    const gw=$('.gwrap'),sc=$('#scene');
    let ruler=null;
    /* the scene sits on the left; the ruler gets its own gutter on the right so they never overlap */
    const fit=()=>{const W=gw.clientWidth,H=gw.clientHeight,s=Math.min(W-66+30,H*340/406);sc.style.width=s+'px';sc.style.height=(s*406/340)+'px';
      if(ruler){ruler.style.top=(sc.offsetTop+.11*sc.offsetHeight)+'px';ruler.style.height=(.855*sc.offsetHeight)+'px'}};
    fit();fitRO=new ResizeObserver(fit);fitRO.observe(gw);
    viz=new BotanicalProgress(sc,{progress:p,goal:w?w.price:undefined,current:w?wishSaved():undefined,from:shown});
    if(w){
      /* the ruler: goal split in thirds, like the reference; the pill rises with the water */
      const tick=k=>`<div class="rtick" data-f="${(3-k)/3}" style="top:${k*100/3}%"><span class="rl">${money(Math.round(w.price*(3-k)/3))}</span></div>`;
      ruler=document.createElement('div');ruler.className='ruler';
      ruler.innerHTML=`<div class="rline"></div><div class="rfill" id="rfill"></div>${[0,1,2,3].map(tick).join('')}<div class="rpill" id="rpill"></div>`;
      gw.appendChild(ruler);fit();
      const pill=$('#rpill'),ticks=[...ruler.querySelectorAll('.rtick')],setPill=v=>{homeUI.v=v;pill.style.bottom=(v*100)+'%';pill.textContent=Math.round(v*100)+'%';$('#rfill').style.height=(v*100)+'%';ticks.forEach(t=>{const f=+t.dataset.f,near=Math.abs(v-f)<.085,dy=!near?0:(f>v||f===1)?-26:26;t.firstChild.style.transform=`translateY(${dy}px)`})};
      homeUI={v:0,setPill:null};homeUI.setPill=setPill;
      const from=shown==null?p:shown;setPill(from);
      if(Math.abs(from-p)>1e-4)rulerTw=Motion.tween({from,to:p,duration:1500,ease:Motion.ease.inOut,onUpdate:setPill});
    }
    shown=p;
    if(state.wish&&!state.hinted){state.hinted=true;save();setTimeout(()=>{if(view==='home')toast('Tap to log it. Hold, then let go, for details.',4200)},1100)}   /* the hint waits until there is a goal to log toward */
  }else if(view==='add'){
    viz=new ExpenseFlower($('#pv'),{amount:amt,maxAmount:cat.max});
  }
}
function render(){
  disposeViz();
  $('#app').innerHTML=view==='bloomed'?bloomedHTML():view==='home'?homeHTML():view==='add'?addHTML():view==='goal'?goalHTML():view==='custom'?customHTML():view==='pastpick'?pastpickHTML():logHTML();
  bind();mountViz();
}
function nav(v){returnView='home';go(v)}
function go(v){if(saving)return;view=v;render()}

const APP_VERSION='{{APP_VERSION}}';

/* ---------- Settings: a small sheet, with the version ---------- */
function openSettings(){
  if($('#settings'))return;
  const m=document.createElement('div');m.id='settings';m.className='modal';
  m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Settings');
  m.innerHTML=`<div class="mcard scard"><div class="mtitle">Settings</div>
    <div class="srow"><span>Version</span><b id="appver">${APP_VERSION}</b></div>
    <button class="btn" id="sdone">Done</button></div>`;
  document.body.appendChild(m);
  const close=()=>{document.removeEventListener('keydown',esc);m.classList.add('out');setTimeout(()=>m.remove(),180)};
  const esc=e=>{if(e.key==='Escape')close()};
  document.addEventListener('keydown',esc);
  m.onclick=e=>{if(e.target===m)close()};
  $('#sdone').onclick=close;$('#sdone').focus();
}

/* ---------- nothing to log toward yet: ask for a goal first ---------- */
function goalPrompt(){
  if($('#goalprompt'))return;
  
  const m=document.createElement('div');m.id='goalprompt';m.className='modal';
  m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Add a goal to get started');
  m.innerHTML=`<div class="mcard"><div class="mflower">🌸</div><div class="mtitle">Add a goal to get started</div>
    <div class="mtext">Pick something you’re saving for. Every save will grow your bouquet toward it.</div>
    <button class="btn" id="mgo">Add a goal</button><button class="textlink" id="mlater">Not now</button></div>`;
  document.body.appendChild(m);
  const close=()=>{document.removeEventListener('keydown',esc);m.classList.add('out');setTimeout(()=>m.remove(),180)};
  const esc=e=>{if(e.key==='Escape')close()};
  document.addEventListener('keydown',esc);
  m.onclick=e=>{if(e.target===m)close()};
  $('#mlater').onclick=close;
  $('#mgo').onclick=()=>{close();draftEmoji=null;nav('goal')};
  $('#mgo').focus();
}
const needsGoal=()=>{if(state.wish)return false;goalPrompt();return true};

/* ---------- lifting your finger after a press-and-hold must never press whatever has appeared under it ---------- */
let shieldUntil=0;
document.addEventListener('click',e=>{if(performance.now()<shieldUntil){e.stopImmediatePropagation();e.preventDefault()}},true);
function raiseShield(){shieldUntil=performance.now()+800}

/* ---------- rapid logging: tap = log the usual amount, hold = detailed screen ---------- */
const HOLD_MS=420;
function refreshHome(){
  if(view!=='home'||!state.wish||!viz||!homeUI){render();return}
  const w=state.wish,p=pctNow()/100;
  $('#openlog').textContent=`${money(sum(todaySkips()))} today ›`;
  $('#goalcard').innerHTML=chipInner();bindChip();
  viz.update({progress:p,goal:w.price,current:wishSaved(),animate:true});
  rulerTw&&rulerTw.cancel();rulerTw=null;
  const from=homeUI.v;
  if(Math.abs(from-p)>1e-4)rulerTw=Motion.tween({from,to:p,duration:1500,ease:Motion.ease.inOut,onUpdate:homeUI.setPill});
  shown=p;
}
function quickLog(id,el){
  if(needsGoal())return;
  const t=TILES.find(x=>x.id===id);if(!t)return;
  if(t.custom){openCat(id);return}                       /* "Other" needs a name, so it goes to the detailed screen */
  const skip={id:uidS(),label:t.label,emoji:t.emoji,amount:t.price,note:'',ts:Date.now()};
  state.skips.push(skip);save();refreshHome();
  if(el)Confetti.fromElement(el);
  if(viz&&viz.scene)viz.scene.sparkleAt(212+Math.random()*30,150+Math.random()*40,0);
  toast(`${t.label} · ${money(t.price)} added`,3600,{label:'Undo',fn:()=>{state.skips=state.skips.filter(s=>s.id!==skip.id);save();refreshHome()}});
}
function bindTile(b){
  let timer=null,ready=false,down=false,sx=0,sy=0;
  const reset=()=>{clearTimeout(timer);timer=null;ready=false;b.classList.remove('holding','ready')};
  const openDetails=()=>{reset();down=false;if(state.wish)raiseShield();openCat(b.dataset.cat)};   /* the shield is only needed when the details screen really opens */
  b.onpointerdown=e=>{
    down=true;ready=false;sx=e.clientX;sy=e.clientY;b.classList.add('holding');
    /* held long enough: a tick and a full ring say "let go to open the details" */
    timer=setTimeout(()=>{timer=null;ready=true;b.classList.remove('holding');b.classList.add('ready');},HOLD_MS);
  };
  b.onpointermove=e=>{
    if(!down)return;
    const far=Math.hypot(e.clientX-sx,e.clientY-sy);
    if(!ready&&far>10)reset();                       /* it was a drag or a scroll, not a press */
    else if(ready&&far>40){reset();down=false}       /* changed your mind: slide away to cancel */
  };
  b.onpointerup=()=>{
    if(!down)return;down=false;
    if(ready){openDetails();return}                  /* released after a hold: open the details */
    if(timer){reset();quickLog(b.dataset.cat,b)}     /* released quickly: log it */
  };
  b.onpointercancel=()=>{const was=ready;down=false;reset();if(was)openDetails()};
  b.onpointerleave=()=>{if(!ready){down=false;reset()}};
  b.oncontextmenu=e=>e.preventDefault();
  b.onclick=e=>e.preventDefault();
  b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.shiftKey?openCat(b.dataset.cat):quickLog(b.dataset.cat,b)}};
}
function bindChip(){
  if($('#golink'))$('#golink').onclick=e=>{e.stopPropagation();e.preventDefault();openLink(state.wish.url)};
  if($('#claim'))$('#claim').onclick=e=>{
    e.stopPropagation();
    
    lastClaimed=Object.assign({},state.wish,{claimedAt:Date.now(),saved:wishSaved()});
    state.claimed.unshift(lastClaimed);state.wish=null;draftEmoji=null;shown=null;
    save();view='bloomed';render();
  };
}

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
const stepFor=max=>max<=100?1:max<=500?5:max<=2000?10:25;
function sliderMax(){
  const w=state.wish,left=w?w.price-wishSaved():0;
  return Math.max(1,Math.ceil(left>0?left:(w?w.price:100)));
}
function openCat(id){if(needsGoal())return;addOpenedAt=performance.now();const base=TILES.find(t=>t.id===id);cat=Object.assign({},base,{idx:TILES.indexOf(base),max:sliderMax()});customEmoji=null;amt=Math.min(cat.price,cat.max);note='';customLabel=base.custom?'':base.label;whenDate=whenPast?isoDay(1):null;go('add')}

/* Add to my log: the button settles, then the flower answers slowly (a long sway, a ripple, a sparkle) before moving on. */
function addSkip(){
  if(saving)return;
  if(performance.now()-addOpenedAt<800)return;               /* a finger that has only just let go must not press Save */
  commitAmtEdit();
  if(!(amt>0)){toast('Slide to an amount first');return}
  saving=true;
  const btn=$('#addbtn');btn.classList.add('press');setTimeout(()=>btn.classList.remove('press'),110);
  btn.textContent='Saved ✓';                                   /* answers the tap straight away */
  if(viz&&!Motion.reduced()){viz.nudge();viz.sparkle();Confetti.fromElement(btn,{count:48,power:1.1})}
  setTimeout(()=>{
    const label=customLabel.trim()||(cat.custom?'Something fun':cat.label);
    const before=pctNow();
    state.skips.push({id:uidS(),label,emoji:customEmoji||(cat.custom?'🌼':cat.emoji),amount:amt,note:note.trim(),ts:chosenTs()});
    const wasPast=whenPast;whenPast=false;
    save();saving=false;view=wasPast?'log':'home';render();
    if(wasPast)toast('Added to your history');
    if(before<100&&pctNow()>=100)toast('Fully grown. Ready to claim.',2600);
  },Motion.reduced()?60:800);
}

/* vertical slider: amount -> flower */
function setAmt(v,exact){
  try{
    if(!cat||!isFinite(v))return;
    const step=stepFor(cat.max);
    v=exact?Math.round(v*100)/100:Math.round(v/step)*step;
    v=Math.max(0,Math.min(cat.max,v));
    if(v===amt)return;
    amt=v;const f=amt/cat.max;
    const th=$('#thumb'),bu=$('#bubble'),bv=$('#bval'),s=$('#slider');
    if(th)th.style.top=(1-f)*100+'%';
    if(bu)bu.style.top=(1-f)*100+'%';
    if(bv)bv.textContent=money(amt);
    if(s){s.setAttribute('aria-valuenow',amt);s.setAttribute('aria-valuetext',money(amt))}
    if(viz&&typeof viz.setAmount==='function')viz.setAmount(amt);
  }catch(err){console.error('amount bar',err)}
}
function bindSlider(){
  const s=$('#slider'),tr=s.querySelector('.strack');let drag=false,pend=null;
  const fromEvent=e=>{const r=tr.getBoundingClientRect();if(!(r.height>0))return;setAmt((1-(e.clientY-r.top)/r.height)*cat.max)};
  s.onpointerdown=e=>{
    if(e.target.closest&&e.target.closest('.bubin'))return;            /* typing in the box: leave it alone */
    try{s.setPointerCapture(e.pointerId)}catch(_){}
    if(e.target.closest&&e.target.closest('#bubble')){                 /* on the amount label: a tap opens typing, a drag still slides */
      pend={x:e.clientX,y:e.clientY,t:performance.now()};return;
    }
    drag=true;fromEvent(e);
  };
  s.onpointermove=e=>{
    if(pend){if(Math.hypot(e.clientX-pend.x,e.clientY-pend.y)>6){pend=null;drag=true;fromEvent(e)}return}
    if(drag)fromEvent(e);
  };
  s.onpointerup=()=>{
    if(pend){const quick=performance.now()-pend.t<600;pend=null;if(quick)openAmtEdit()}
    drag=false;
  };
  s.onpointercancel=()=>{drag=false;pend=null};
  s.onkeydown=e=>{
    const step=stepFor(cat.max);
    if(e.key==='ArrowUp'||e.key==='ArrowRight'){setAmt(amt+step);e.preventDefault()}
    else if(e.key==='ArrowDown'||e.key==='ArrowLeft'){setAmt(amt-step);e.preventDefault()}
    else if(e.key==='Home'){setAmt(0);e.preventDefault()}
    else if(e.key==='End'){setAmt(cat.max);e.preventDefault()}
  };
}

function bind(){
  document.querySelectorAll('[data-cat]').forEach(bindTile);
  if($('#goalcard')){
    const open=()=>{draftEmoji=state.wish?state.wish.emoji:null;nav('goal')};
    $('#goalcard').onclick=open;$('#goalcard').onkeydown=e=>{if(e.key==='Enter'&&e.target.id==='goalcard')open()};
    bindChip();
  }
  if($('#totracker'))$('#totracker').onclick=()=>go('home');
  if($('#opensettings'))$('#opensettings').onclick=openSettings;
  if($('#newgoal'))$('#newgoal').onclick=()=>{draftEmoji=null;nav('goal')};
  if($('#backtrk'))$('#backtrk').onclick=()=>go('home');
  if($('#openlog'))$('#openlog').onclick=()=>{logTab='saves';nav('log')};
  bindWeek();
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{logTab=b.dataset.tab;render()});
  document.querySelectorAll('[data-openlink]').forEach(l=>l.onclick=e=>{e.preventDefault();openLink(l.dataset.openlink)});
  document.querySelectorAll('[data-delclaim]').forEach(b=>b.onclick=()=>{if(!confirm('Remove this from your claimed list?'))return;state.claimed.splice(+b.dataset.delclaim,1);save();render()});
  if($('#addpast'))$('#addpast').onclick=()=>{if(needsGoal())return;go('pastpick')};
  document.querySelectorAll('[data-past]').forEach(b=>b.onclick=()=>{whenPast=true;openCat(b.dataset.past)});
  if($('#editbtns'))$('#editbtns').onclick=()=>{pickRow=-1;nav('custom')};
  document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const i=+b.dataset.pick;pickRow=pickRow===i?-1:i;render()});
  document.querySelectorAll('[data-emo]').forEach(b=>b.onclick=()=>{state.tiles[pickRow].emoji=b.dataset.emo;pickRow=-1;syncTiles();save();render()});
  document.querySelectorAll('[data-name]').forEach(i=>{
    i.oninput=()=>{const t=state.tiles[+i.dataset.name];t.label=i.value.trim()||t.label;syncTiles();save()};
    i.onblur=()=>{if(!i.value.trim())i.value=state.tiles[+i.dataset.name].label};
  });
  document.querySelectorAll('[data-cprice]').forEach(i=>i.oninput=()=>{const n=parseFloat(i.value);if(n>0){const t=state.tiles[+i.dataset.cprice];t.price=n;t.max=niceMax(n);syncTiles();save()}});
  if($('#donetiles'))$('#donetiles').onclick=()=>go('home');
  if($('#resettiles'))$('#resettiles').onclick=()=>{if(!confirm('Put the buttons back the way they were?'))return;state.tiles=DEFAULT_TILES.map(t=>({...t}));pickRow=-1;syncTiles();save();render()};
  if($('#close'))$('#close').onclick=()=>{
    whenPast=false;
    if(view==='pastpick')return go('log');
    if(['log','goal','custom'].includes(view))return go(returnView);
    go('home');
  };
  if($('#back'))$('#back').onclick=()=>{const p=whenPast;whenPast=false;go(p?'pastpick':'home')};
  if($('#apickbtn')){
    const btn=$('#apickbtn'),panel=$('#apanel'),scr=document.querySelector('.screen');
    const place=()=>{
      const sr=scr.getBoundingClientRect(),br=btn.getBoundingClientRect();
      panel.style.bottom=(sr.bottom-br.top+14)+'px';
      panel.style.setProperty('--cx',(br.left+br.width/2-(sr.left+20)-8)+'px');
    };
    const close=()=>{
      if(panel.hidden)return;
      btn.setAttribute('aria-expanded','false');document.removeEventListener('pointerdown',outside,true);
      if(Motion.reduced()){panel.hidden=true;panel.classList.remove('open','closing');return}
      panel.classList.remove('open');panel.classList.add('closing');
      setTimeout(()=>{panel.hidden=true;panel.classList.remove('closing')},190);
    };
    const outside=e=>{if(!panel.contains(e.target)&&!btn.contains(e.target))close()};
    const open=()=>{
      place();panel.hidden=false;panel.classList.remove('closing');void panel.offsetWidth;panel.classList.add('open');
      btn.setAttribute('aria-expanded','true');document.addEventListener('pointerdown',outside,true);
    };
    btn.onclick=()=>panel.hidden?open():close();
    panel.querySelectorAll('[data-aemo]').forEach(b=>b.onclick=()=>{customEmoji=b.dataset.aemo;btn.textContent=customEmoji;close()});
  }
  if($('#bubble')){
    const bub=$('#bubble'),val=$('#bval'),inp=$('#bubin');let editing=false;
    const commit=(apply=true)=>{
      if(!editing)return;editing=false;
      if(apply){
        const v=parseFloat(String(inp.value).replace(',','.'));
        if(isFinite(v)&&v>=0){try{setAmt(v,true)}catch(e){console.error(e)}}
      }
      inp.hidden=true;val.hidden=false;val.textContent=money(amt);
    };
    commitAmtEdit=()=>commit(true);
    /* the bubble sits right beside the handle, so it must never steal a drag: the slider decides whether a touch was a tap */
    openAmtEdit=()=>{
      if(editing)return;editing=true;
      inp.value=String(amt);val.hidden=true;inp.hidden=false;
      inp.focus();try{inp.select()}catch(_){}
    };
    inp.onpointerdown=e=>e.stopPropagation();
    inp.onclick=e=>e.stopPropagation();
    inp.onblur=()=>commit(true);
    inp.onkeydown=e=>{
      if(e.key==='Enter'){e.preventDefault();inp.blur()}
      else if(e.key==='Escape'){commit(false);inp.blur()}
    };
  }
  if($('#wdate')){
    $('#wdate').onchange=e=>{
      const v=e.target.value;
      if(!v){e.target.value=whenDate;return}
      if(v>isoDay(0)){toast('That day hasn’t happened yet');e.target.value=whenDate;return}
      whenDate=v;$('#wlabel').textContent=fmtLong(v);$('#whenhint').textContent=whenHint();
    };
  }
  if($('#slider')){
    bindSlider();
    $('#note').oninput=e=>{note=e.target.value};
    if($('#alabel'))$('#alabel').oninput=e=>{customLabel=e.target.value};
    $('#addbtn').onclick=addSkip;
  }
  if($('#gpickbtn')){
    const btn=$('#gpickbtn'),panel=$('#gpanel'),wel=document.querySelector('.welcome');
    const place=()=>{                                   /* sit just above the circle, with the little tail pointing at it */
      const wr=wel.getBoundingClientRect(),br=btn.getBoundingClientRect();
      panel.style.bottom=(wr.bottom-br.top+14)+'px';
      panel.style.setProperty('--cx',(br.left+br.width/2-(wr.left+20)-8)+'px');
    };
    const close=()=>{
      if(panel.hidden)return;
      btn.setAttribute('aria-expanded','false');document.removeEventListener('pointerdown',outside,true);
      if(Motion.reduced()){panel.hidden=true;panel.classList.remove('open','closing');return}
      panel.classList.remove('open');panel.classList.add('closing');
      setTimeout(()=>{panel.hidden=true;panel.classList.remove('closing')},190);
    };
    const outside=e=>{if(!panel.contains(e.target)&&!btn.contains(e.target))close()};
    const open=()=>{
      place();panel.hidden=false;panel.classList.remove('closing');void panel.offsetWidth;panel.classList.add('open');
      btn.setAttribute('aria-expanded','true');document.addEventListener('pointerdown',outside,true);
    };
    btn.onclick=()=>panel.hidden?open():close();
    panel.querySelectorAll('[data-gemo]').forEach(b=>b.onclick=()=>{
      draftEmoji=b.dataset.gemo;btn.textContent=draftEmoji;btn.classList.add('set');
      $('#gpickhint').textContent='Tap to change the icon';close();
    });
  }
  if($('#savegoal'))$('#savegoal').onclick=()=>{
    const name=$('#wname').value.trim(),price=parseFloat($('#wprice').value);
    if(!name||!(price>0)){toast('Add a name and a price');return}
    const first=!state.wish;
    let url=$('#wurl').value.trim();
    if(url){
      if(!/^https?:\/\//i.test(url))url='https://'+url;
      try{const u=new URL(url);if(!u.hostname.includes('.'))throw 0;url=u.href}catch(e){toast('That link doesn’t look right');return}
    }
    state.wish={name,price,emoji:draftEmoji||'🌸',url,start:state.wish?state.wish.start:startForNewGoal()};
    if(first)shown=null;
    save();view='home';render();toast(first?'Planted. Let’s grow it.':'Goal updated.');
  };
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>removeSave(b.dataset.del));
  if($('#reset'))$('#reset').onclick=()=>{
    if(!confirm('Wipe everything and start fresh?'))return;
    state={skips:[],wish:null,claimed:[],tiles:state.tiles,hinted:true};shown=null;save();render();
  };
}

(async()=>{
  await load();syncTiles();injectSpriteDefs();
  if(state.wish)draftEmoji=state.wish.emoji;
  /* the very first time, open on the goals page; after that, always on the tracker */
  const first=!state.visited&&!state.wish&&!state.skips.length&&!(state.claimed||[]).length;
  state.visited=true;save();
  view=first?'goal':'home';
  render();
  if(restoredNote)setTimeout(()=>toast(restoredNote,4500),900);
})();

/* A small, honest message if anything unexpected happens, so the cause can be reported. */
window.addEventListener('error',e=>{try{toast('Something went wrong: '+(e.message||'unknown error'),6000)}catch(_){}});
window.addEventListener('unhandledrejection',e=>{try{toast('Something went wrong: '+((e.reason&&e.reason.message)||e.reason||'unknown error'),6000)}catch(_){}});
