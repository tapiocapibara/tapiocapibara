/* ---------- Customization Presets ----------
   Saved customizations, stored in the app's IndexedDB (meta store) so they survive refresh / reopen:

     meta 'custPresets'  [{id,name,created,updated,data:{theme,accent,mcol,mn,mi,wallpaper}}]     meta 'custActive'  id|null

   A customization = light/dark theme + accent colour + mood badge colours + wallpaper (image, position x/y, zoom, opacity),
   mood icons and mood names. Presets hold real values (image Blobs included), never just a name or a thumbnail.
   This file only defines functions: it is loaded before the main script and touches the app's globals at call time. */

const PRES_NAME_MAX=40;
let custPresets=[],custActive=null,presBusy=false;

const presId=()=>'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const presHex=v=>/^#[0-9a-f]{6}$/i.test(v||'');
const presKey=o=>Object.keys(o||{}).sort().map(k=>[k,o[k]]);
const presRound=n=>Math.round((+n||0)*1000)/1000;

/* ---- the person's CURRENT settings, as plain independent copies ---- */
function presCurrentColors(){
  const mcol={};for(const k in MCOL)if(MOODS[k]&&presHex(MCOL[k]))mcol[k]=MCOL[k].toLowerCase();
  return{theme,accent:ACC,mcol};
}
function presCurrentCust(){
  const src=(typeof st!=='undefined'&&st&&st.mi)?st.mi:MI,mi={},mn={};   /* icons staged in the open sidebar count too: that is what the person sees */
  for(const k in src)if(MOODS[k]&&src[k] instanceof Blob)mi[k]=src[k];
  for(const k in MN)if(MOODS[k]&&MN[k])mn[k]=String(MN[k]);
  return{...presCurrentColors(),mi,mn,wallpaper:WP?{blob:WP.blob,zoom:WP.zoom,opacity:WP.opacity,x:WP.x,y:WP.y}:null};
}

/* ---- validation of anything read from storage / a backup ---- */
function presNormColors(c){
  if(!c||typeof c!=='object')return null;const mcol={};
  for(const k in c.mcol||{})if(MOODS[k]&&presHex(c.mcol[k]))mcol[k]=c.mcol[k].toLowerCase();
  return{theme:c.theme==='dark'?'dark':'light',accent:presHex(c.accent)?c.accent.toLowerCase():ACC_DEF,mcol};
}
function presNormMeta(p){
  if(!p||typeof p!=='object'||typeof p.id!=='string'||!p.id)return null;
  const name=String(p.name||'').replace(/\s+/g,' ').trim().slice(0,PRES_NAME_MAX);if(!name)return null;
  return{id:p.id,name,created:+p.created||Date.now(),updated:+p.updated||+p.created||Date.now()};
}
async function presNormCust(p,fromBackup){
  const m=presNormMeta(p);if(!m||!p.data||typeof p.data!=='object')return null;
  const c=presNormColors(p.data),d=p.data,mi={},mn={};if(!c)return null;
  const blob=async v=>v instanceof Blob?v:(fromBackup&&typeof v==='string'&&v?await d2b(v):null);
  for(const k in d.mi||{}){if(!MOODS[k])continue;try{const b=await blob(d.mi[k]);if(b)mi[k]=b}catch(e){}}
  for(const k in d.mn||{})if(MOODS[k]&&d.mn[k])mn[k]=String(d.mn[k]).slice(0,20);
  let wallpaper=null;const w=d.wallpaper;
  if(w&&typeof w==='object'){try{const b=await blob(fromBackup?w.data:w.blob);
    if(b)wallpaper={blob:b,zoom:wpNum(w.zoom,WP_MIN,WP_MAX,1),opacity:wpNum(w.opacity,0,1,WP_DEF_OP),x:wpNum(w.x,-6,6,0),y:wpNum(w.y,-6,6,0)}}catch(e){}}
  return{...m,data:{...c,mi,mn,wallpaper}};
}

/* ---- comparison: is the live look still identical to a saved preset? (drives the small "Edited" hint) ---- */
const presBlobSig=b=>b?b.size+':'+b.type:'';
function presSig(d,full){
  const o={t:d.theme,a:String(d.accent).toLowerCase(),c:presKey(d.mcol)};
  if(full){
    o.n=presKey(d.mn);o.i=Object.keys(d.mi||{}).sort().map(k=>k+'='+presBlobSig(d.mi[k]));
    o.w=d.wallpaper?[presBlobSig(d.wallpaper.blob),presRound(d.wallpaper.zoom),presRound(d.wallpaper.opacity),presRound(d.wallpaper.x),presRound(d.wallpaper.y)]:null;
  }
  return JSON.stringify(o);
}

/* ---- persistence ---- */
async function presLoad(){
  let b=null,cb=null;
  try{b=await getMeta('custPresets');cb=await getMeta('custActive')}catch(e){console.error(e)}
  custPresets=[];for(const p of Array.isArray(b)?b:[]){const n=await presNormCust(p,false);if(n)custPresets.push(n)}
  custActive=custPresets.some(p=>p.id===cb)?cb:null;
  try{await run('meta','readwrite',s=>s.delete('colorPresets'));await run('meta','readwrite',s=>s.delete('colorActive'))}catch(e){console.error(e)}   /* data of the removed Color Presets feature */
}
async function presPersist(){
  try{await setMeta('custPresets',custPresets);await setMeta('custActive',custActive);return true}
  catch(e){console.error(e);alert(tr('Could not save your presets. Storage may be full or unavailable.'));return false}
}

/* ---- apply ---- */
async function presApplyColorsCore(d){
  const oldMc=mcolFor(draft.mood);
  setTheme(d.theme);try{localStorage.setItem('its-me-theme',d.theme)}catch(e){}
  if(st){st.theme=st.orig=d.theme}
  setAccent(d.accent,false);MCOL={...d.mcol};
  if(!draft.mc||draft.mc===oldMc)draft.mc=mcolFor(draft.mood);
  await setMeta('theme',d.theme);await setMeta('accent',ACC);await setMeta('mcol',MCOL);
}
async function presApplyCustCore(d){
  await presApplyColorsCore(d);
  MN={...d.mn};MI={...d.mi};applyMoodNames();
  WP=d.wallpaper?{...d.wallpaper}:null;
  await setMeta('mn',MN);await setMeta('mi',MI);await setMeta('wallpaper',WP);
  wpPaint();
  if(st)st.mi={...MI};
}
function presRepaint(){renderAll();drawBadges();presRefresh()}
function presRefresh(){presCloseMenu();if(panelOpen()&&st)renderSettings()}

/* ---- naming dialog (re-uses the app's #dlg overlay) ---- */
function presAsk({title,value='',ok,taken}){
  return new Promise(resolve=>{
    const d=document.querySelector('#dlg'),prevFocus=document.activeElement;
    d.innerHTML=`<form class="card w-full max-w-sm rounded-2xl border bl p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="pasT" novalidate><h2 id="pasT" class="text-lg font-bold">${esc(title)}</h2><label class="mute mt-3 block text-sm" for="pasI">${esc(tr('Preset name'))}</label><input id="pasI" type="text" maxlength="${PRES_NAME_MAX}" autocomplete="off" class="mt-1 w-full rounded-xl border bl px-3 py-2 text-base" value="${esc(value)}"><p id="pasE" class="mt-1 text-xs text-red-500" style="min-height:1.1rem" role="alert"></p><div class="mt-4 flex justify-end gap-2"><button type="button" class="btn gh" data-pas="0">${esc(tr('Cancel'))}</button><button type="submit" class="btn pri">${esc(ok)}</button></div></form>`;
    const f=d.firstElementChild,inp=f.querySelector('#pasI'),err=f.querySelector('#pasE');
    const onKey=e=>{
      if(e.key==='Escape'){e.stopImmediatePropagation();e.preventDefault();done(null)}
      else if(e.key==='Tab'){const bs=[inp,...f.querySelectorAll('button')],i=bs.indexOf(document.activeElement);e.preventDefault();bs[(i+(e.shiftKey?-1:1)+bs.length)%bs.length].focus()}
    };
    const onBg=e=>{if(e.target===d)done(null)};
    function done(v){document.removeEventListener('keydown',onKey,true);d.removeEventListener('click',onBg);d.classList.replace('flex','hidden');d.innerHTML='';if(prevFocus&&prevFocus.isConnected)try{prevFocus.focus()}catch(e){}resolve(v)}
    f.addEventListener('submit',e=>{
      e.preventDefault();const n=inp.value.replace(/\s+/g,' ').trim();
      if(!n){err.textContent=tr('Please enter a name.');inp.focus();return}
      if(taken&&taken(n)){err.textContent=tr('A preset with this name already exists.');inp.focus();return}
      done(n);
    });
    f.querySelector('[data-pas="0"]').onclick=()=>done(null);
    document.addEventListener('keydown',onKey,true);d.addEventListener('click',onBg);
    d.classList.replace('hidden','flex');inp.focus();inp.select();
  });
}
const presTaken=(list,name,except)=>list.some(p=>p.id!==except&&p.name.toLowerCase()===name.toLowerCase());
function presUniqueName(list,base){
  base=base.slice(0,PRES_NAME_MAX-4);let n=base,i=2;
  while(presTaken(list,n)){n=base+' '+i++}
  return n;
}

/* ---- actions ---- */
const presClone=p=>({data:{theme:p.data.theme,accent:p.data.accent,mcol:{...p.data.mcol},mn:{...p.data.mn},mi:{...p.data.mi},wallpaper:p.data.wallpaper?{...p.data.wallpaper}:null}});

async function presGuard(fn){
  if(presBusy)return;presBusy=true;
  const snap=[custPresets,custActive];
  try{if((await fn())===false)[custPresets,custActive]=snap}
  catch(e){console.error(e);[custPresets,custActive]=snap;alert(tr('Something went wrong. Your presets were not changed.'))}
  finally{presBusy=false}
}
const presNew=()=>presGuard(async()=>{
  const list=custPresets;
  const name=await presAsk({title:tr('Save customization'),ok:tr('Save'),taken:n=>presTaken(list,n)});
  if(name===null)return;
  const now=Date.now(),p={id:presId(),name,created:now,updated:now,data:presCurrentCust()};
  custPresets=[...list,p];custActive=p.id;     /* a NEW preset is always created: nothing existing is touched */
  if(!await presPersist())return false;
  presRefresh();
});
const presApply=id=>presGuard(async()=>{
  const p=custPresets.find(x=>x.id===id);if(!p)return;
  try{await presApplyCustCore(p.data)}
  catch(e){console.error(e);alert(tr('Could not apply this preset.'));presRepaint();return false}
  custActive=id;
  if(!await presPersist())return false;
  presRepaint();
});
const presRename=id=>presGuard(async()=>{
  const list=custPresets,p=list.find(x=>x.id===id);if(!p)return;
  const name=await presAsk({title:tr('Rename preset'),value:p.name,ok:tr('Save'),taken:n=>presTaken(list,n,id)});
  if(name===null||name===p.name)return;
  custPresets=list.map(x=>x.id===id?{...x,name,updated:Date.now()}:x);
  if(!await presPersist())return false;
  presRefresh();
});
const presUpdate=id=>presGuard(async()=>{
  const list=custPresets,p=list.find(x=>x.id===id);if(!p)return;
  const ok=await askConfirm({title:tr('Update “{n}”?',{n:p.name}),body:tr('Its saved settings will be replaced with your current ones.'),ok:tr('Update'),danger:false});
  if(!ok)return;
  custPresets=list.map(x=>x.id===id?{...x,updated:Date.now(),data:presCurrentCust()}:x);
  custActive=id;
  if(!await presPersist())return false;
  presRefresh();
});
const presDuplicate=id=>presGuard(async()=>{
  const list=custPresets,p=list.find(x=>x.id===id);if(!p)return;
  const now=Date.now(),c={id:presId(),name:presUniqueName(list,tr('{n} copy',{n:p.name})),created:now,updated:now,...presClone(p)};
  const i=list.indexOf(p);custPresets=[...list.slice(0,i+1),c,...list.slice(i+1)];   /* the copy sits right under the original */
  if(!await presPersist())return false;
  presRefresh();
});
const presDelete=id=>presGuard(async()=>{
  const list=custPresets,p=list.find(x=>x.id===id);if(!p)return;
  const ok=await askConfirm({title:tr('Delete “{n}”?',{n:p.name}),body:tr('This preset will be permanently deleted. Your current look will not change.'),ok:tr('Delete')});
  if(!ok)return;
  custPresets=list.filter(x=>x.id!==id);if(custActive===id)custActive=null;
  if(!await presPersist())return false;
  presRefresh();
});
const PRES_ACT={apply:presApply,rename:presRename,update:presUpdate,dup:presDuplicate,delete:presDelete};

/* ---- three-dot menu (one floating menu, flips upward near the bottom of the screen) ---- */
let presMenuEl=null,presMenuBtn=null;
function presCloseMenu(focusBack){
  if(!presMenuEl)return;const b=presMenuBtn;
  presMenuEl.remove();presMenuEl=null;presMenuBtn=null;
  if(b)b.setAttribute('aria-expanded','false');
  if(focusBack&&b&&b.isConnected)b.focus();
}
function presOpenMenu(btn,id){
  presCloseMenu();
  const items=[['apply','Apply'],['rename','Rename'],['update','Update / Save Changes'],['dup','Duplicate'],['delete','Delete']];
  const m=document.createElement('div');m.className='pmenu pres-menu';m.setAttribute('role','menu');m.dataset.pid=id;
  m.innerHTML=items.map(([k,l])=>`<button type="button" role="menuitem" data-pm="${k}" class="${k==='delete'?'danger':''}">${esc(tr(l))}</button>`).join('');
  document.body.appendChild(m);presMenuEl=m;presMenuBtn=btn;btn.setAttribute('aria-expanded','true');
  const r=btn.getBoundingClientRect(),w=m.offsetWidth,h=m.offsetHeight;
  let left=Math.min(Math.max(8,r.right-w),innerWidth-w-8),top=r.bottom+4;
  if(top+h>innerHeight-8)top=Math.max(8,r.top-h-4);
  m.style.left=left+'px';m.style.top=top+'px';
  m.querySelector('button').focus();
  const sp=document.querySelector('#spanel');if(sp)sp.addEventListener('scroll',()=>presCloseMenu(),{once:true,passive:true});
}
addEventListener('resize',()=>presCloseMenu());
document.addEventListener('keydown',e=>{
  if(!presMenuEl)return;
  if(e.key==='Escape'){e.stopImmediatePropagation();e.preventDefault();presCloseMenu(true)}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();const bs=[...presMenuEl.querySelectorAll('button')],i=bs.indexOf(document.activeElement);
    bs[(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length].focus();
  }else if(e.key==='Tab')presCloseMenu();
},true);
document.addEventListener('click',e=>{
  const t=e.target.closest?e.target:e.target.parentElement;if(!t)return;
  const mi=t.closest('.pres-menu [data-pm]');
  if(mi){e.preventDefault();const m=mi.closest('.pres-menu'),id=m.dataset.pid,fn=PRES_ACT[mi.dataset.pm];presCloseMenu();if(fn)fn(id);return}
  const b=t.closest('[data-pa]');
  if(!b){if(presMenuEl&&!t.closest('.pres-menu'))presCloseMenu();return}
  e.preventDefault();const a=b.dataset.pa,id=b.dataset.pid;
  if(a==='menu'){const same=presMenuBtn===b;presCloseMenu();if(!same)presOpenMenu(b,id)}
  else{presCloseMenu();if(a==='new')presNew();else if(a==='apply')presApply(id)}
});

/* ---- sidebar UI ---- */
const PRES_DOTS='<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>';
const PRES_PLUS='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
function presItemHtml(p,cur,curSig){
  const d=p.data,active=custActive===p.id;
  const edited=active&&presSig(d,true)!==curSig;
  const bg=d.theme==='dark'?'#161412':'#faf7f2';
  const sw=d.wallpaper&&d.wallpaper.blob
    ?`<span class="pres-sw" style="border-color:${esc(d.accent)}"><img src="${url(d.wallpaper.blob)}" alt=""></span>`
    :`<span class="pres-sw" style="background:linear-gradient(135deg,${esc(d.accent)} 50%,${bg} 50%)"></span>`;
  const parts=[tr(d.theme==='dark'?'Dark mode':'Light mode')];
  if(d.wallpaper)parts.push(tr('Wallpaper'));const n=Object.keys(d.mi).length;if(n)parts.push(n===1?tr('1 mood icon'):tr('{n} mood icons',{n}));
  return `<div class="pres-item${active?' on':''}"><button type="button" class="pres-main" data-pa="apply" data-pid="${esc(p.id)}" title="${esc(tr('Apply “{n}”',{n:p.name}))}"${active?' aria-current="true"':''}>${sw}<span class="pres-nm"><span class="pres-t">${esc(p.name)}</span><span class="pres-sub">${esc(parts.join(' · '))}</span></span>${active?`<span class="pres-act">${esc(tr('Active'))}</span>`:''}${edited?`<span class="pres-ed">${esc(tr('Edited'))}</span>`:''}</button><button type="button" class="pres-dots" data-pa="menu" data-pid="${esc(p.id)}" aria-haspopup="menu" aria-expanded="false" aria-label="${esc(tr('Preset options')+': '+p.name)}" title="${esc(tr('Preset options'))}">${PRES_DOTS}</button></div>`;
}
function presListHtml(emptyText){
  if(!custPresets.length)return `<p class="mute mb-2 text-xs">${esc(tr(emptyText))}</p>`;
  const cur=presCurrentCust(),sig=presSig(cur,true);
  return custPresets.map(p=>presItemHtml(p,cur,sig)).join('');
}
/* "Your Customization": its own sidebar section */
const presCustHtml=()=>`<h3 class="mb-1 mt-4 border-t bl pt-3 text-sm font-semibold">${tr('Your Customization')}</h3>
  <p class="mute mb-2 text-xs">${tr('Colors, wallpaper, mood icons and names are saved together in one preset.')}</p>
  <div id="custpl">${presListHtml('No saved customizations yet.')}</div>
  <button type="button" class="btn gh w-full justify-center" data-pa="new">${PRES_PLUS}${tr('Save New Customization')}</button>`;

/* ---- backup / restore (called from Back Up Data / Import Backup) ---- */
async function presExport(){
  const s=b=>b?b2d(b):null,cust=[];
  for(const p of custPresets){
    const d=p.data,mi={};for(const k in d.mi)mi[k]=await s(d.mi[k]);
    cust.push({id:p.id,name:p.name,created:p.created,updated:p.updated,data:{theme:d.theme,accent:d.accent,mcol:d.mcol,mn:d.mn,mi,
      wallpaper:d.wallpaper?{data:await s(d.wallpaper.blob),zoom:d.wallpaper.zoom,opacity:d.wallpaper.opacity,x:d.wallpaper.x,y:d.wallpaper.y}:null}});
  }
  return{custPresets:cust,custActive};
}
/* Convert first (so a damaged file can't half-import); presets with the same id are replaced, all others are kept */
async function presImportPrepare(d){
  if(!d||typeof d!=='object')return null;
  const cust=[];
  for(const p of Array.isArray(d.custPresets)?d.custPresets:[]){const n=await presNormCust(p,true);if(n)cust.push(n)}
  return cust.length?{cust}:null;
}
async function presImportApply(x){
  if(!x)return;
  const merge=(cur,add)=>{
    const m=new Map(cur.map(p=>[p.id,p])),out=[...cur];
    for(const p of add){
      const i=out.findIndex(o=>o.id===p.id);
      const clash=out.some(o=>o.id!==p.id&&o.name.toLowerCase()===p.name.toLowerCase());
      const q=clash?{...p,name:presUniqueName(out.filter(o=>o.id!==p.id),p.name)}:p;
      if(i>-1)out[i]=q;else out.push(q);
    }
    return out;
  };
  custPresets=merge(custPresets,x.cust);
  await presPersist();
}

/* ---- Thai translations (only keys that don't already exist) ---- */
(()=>{
  const add={
    'Your Customization':'การปรับแต่งของฉัน','Save New Customization':'บันทึกการปรับแต่งใหม่',
    'Colors, wallpaper, mood icons and names are saved together in one preset.':'สี วอลเปเปอร์ ไอคอนอารมณ์ และชื่ออารมณ์จะถูกบันทึกไว้ด้วยกันในพรีเซ็ตเดียว',
    'No saved customizations yet.':'ยังไม่มีการปรับแต่งที่บันทึกไว้','Active':'ใช้งานอยู่','Edited':'แก้ไขแล้ว',
    'Apply':'ใช้','Rename':'เปลี่ยนชื่อ','Update / Save Changes':'อัปเดต / บันทึกการเปลี่ยนแปลง','Duplicate':'ทำสำเนา','Delete':'ลบ',
    'Preset options':'ตัวเลือกพรีเซ็ต','Preset name':'ชื่อพรีเซ็ต','Save customization':'บันทึกการปรับแต่ง',
    'Rename preset':'เปลี่ยนชื่อพรีเซ็ต','Save':'บันทึก','Cancel':'ยกเลิก','Please enter a name.':'กรุณาใส่ชื่อ',
    'A preset with this name already exists.':'มีพรีเซ็ตชื่อนี้อยู่แล้ว','Update “{n}”?':'อัปเดต “{n}” ไหม?',
    'Its saved settings will be replaced with your current ones.':'ค่าที่บันทึกไว้จะถูกแทนที่ด้วยค่าปัจจุบันของคุณ','Update':'อัปเดต',
    'Delete “{n}”?':'ลบ “{n}” ไหม?','This preset will be permanently deleted. Your current look will not change.':'พรีเซ็ตนี้จะถูกลบถาวร หน้าตาปัจจุบันของคุณจะไม่เปลี่ยน',
    '{n} copy':'{n} (สำเนา)','Apply “{n}”':'ใช้ “{n}”','1 mood icon':'ไอคอนอารมณ์ 1 รายการ','{n} mood icons':'ไอคอนอารมณ์ {n} รายการ',
    'Wallpaper':'วอลเปเปอร์','Dark mode':'โหมดมืด','Light mode':'โหมดสว่าง',
    'Could not save your presets. Storage may be full or unavailable.':'ไม่สามารถบันทึกพรีเซ็ตได้ พื้นที่จัดเก็บอาจเต็มหรือใช้ไม่ได้',
    'Could not apply this preset.':'ไม่สามารถใช้พรีเซ็ตนี้ได้','Something went wrong. Your presets were not changed.':'เกิดข้อผิดพลาด พรีเซ็ตของคุณไม่ได้ถูกเปลี่ยนแปลง'
  };
  if(typeof TH!=='undefined')for(const k in add)if(!Object.prototype.hasOwnProperty.call(TH,k))TH[k]=add[k];
})();

/* ---- styles (theme-aware through the app's CSS variables) ---- */
(()=>{const s=document.createElement('style');s.textContent=`
.pres-item{display:flex;align-items:center;margin-bottom:.4rem;border:1px solid var(--line);border-radius:14px;background:transparent;transition:border-color .15s,background .15s}
.pres-item.on{border-color:var(--brand);background:rgba(var(--brand-rgb),.08)}
.pres-main{flex:1;min-width:0;display:flex;align-items:center;gap:.6rem;padding:.5rem .4rem .5rem .55rem;border-radius:14px;text-align:left;color:inherit;cursor:pointer}
.pres-main:hover{background:rgba(var(--brand-rgb),.08)}
.pres-main:focus-visible,.pres-dots:focus-visible{outline:2px solid var(--brand);outline-offset:-2px}
.pres-sw{width:38px;height:38px;flex:none;border-radius:10px;border:2px solid var(--line);overflow:hidden;display:block;box-sizing:border-box}
.pres-sw img{display:block;width:100%;height:100%;object-fit:cover}
.pres-nm{min-width:0;flex:1;display:flex;flex-direction:column}
.pres-t{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;line-height:1.25}
.pres-sub{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem;color:var(--mute)}
.pres-act{flex:none;font-size:.68rem;font-weight:700;padding:.12rem .55rem;border-radius:999px;background:var(--brand);color:var(--on-brand)}
.pres-ed{flex:none;font-size:.68rem;color:var(--mute)}
.pres-dots{flex:none;width:42px;height:42px;display:flex;align-items:center;justify-content:center;border-radius:12px;color:var(--mute);cursor:pointer}
.pres-dots:hover{background:rgba(var(--brand-rgb),.12);color:var(--brand)}
.pres-menu{position:fixed;z-index:80;min-width:12.5rem;max-width:calc(100vw - 16px);background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.28);padding:.25rem 0;overflow:hidden}
.pres-menu button{white-space:nowrap}.pres-menu button:focus-visible{outline:2px solid var(--brand);outline-offset:-2px;background:rgba(var(--brand-rgb),.12)}
`;document.head.appendChild(s)})();
