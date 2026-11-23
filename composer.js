/* ---------- Mood badge (with its own background color) ---------- */
/* Badge colour the person picked for each mood (meta 'mcol'): new posts start with it until they press ↺ */
let MCOL={};
const mcolFor=k=>/^#[0-9a-f]{6}$/i.test(MCOL[k]||'')?MCOL[k]:'';
const saveMcol=()=>setMeta('mcol',MCOL).catch(console.error);
const uid=()=>Date.now()+'-'+Math.random().toString(36).slice(2,7);
const inkOn=c=>{const m=/^#([0-9a-f]{6})$/i.exec(c||'');if(!m)return '#fff';const n=parseInt(m[1],16);return (0.299*(n>>16)+0.587*((n>>8)&255)+0.114*(n&255))>175?'#1a1a1a':'#fff'};
const emptyDraft=()=>({link:null,lpOff:'',mood:'neutral',media:[],mc:mcolFor('neutral')});
const MAX_MEDIA=6;  /* one shared limit: photos + videos together, max 6 per post (Create Post, Add another post, Edit post) */
const mediaCount=ms=>ms.filter(m=>m.type==='image'||m.type==='video').length;
/* Normalise any stored/imported post: drop legacy thread fields and the removed Tags fields */
const normPost=p=>{delete p.thread;delete p.ti;delete p.tags;delete p.tc;delete p.replies;return p};
const moodBg=p=>p.mc||(MOODS[p.mood]||[])[1]||'#94a3b8';
const bs=c=>`background:${c};color:${inkOn(c)}`;
const moodBadge=(p,px=14)=>MOODS[p.mood]?`<span class="mbadge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style="${bs(moodBg(p))}">${mi(p.mood,px)} ${esc(MOODS[p.mood][2])}</span>`:'';

/* ---------- Mentions: @handle (letters incl. Thai, digits, _) ---------- */
const MENTION_RE=/(^|[^\p{L}\p{M}\p{N}_@])@([\p{L}\p{M}\p{N}_]{1,30})/gu;
const richPlain=t=>esc(t).replace(MENTION_RE,(_,pre,h)=>`${pre}<span class="mention">@${h}</span>`);
const rich=t=>lpRich(String(t),richPlain);   /* URLs become links, @mentions still work */
function insertMention(ta){
  if(!ta)return;
  const v=ta.value,s=ta.selectionStart??v.length,e=ta.selectionEnd??s,pre=v.slice(0,s),sp=pre&&!/\s$/.test(pre)?' ':'';
  ta.value=pre+sp+'@'+v.slice(e);const c=s+sp.length+1;ta.setSelectionRange(c,c);ta.focus();
  ta.dispatchEvent(new Event('input',{bubbles:true}));
}

/* ---------- Media rules: up to 6 photos/videos (combined) per post; a voice note excludes them ---------- */
const cnt=t=>draft.media.filter(m=>m.type===t).length;
const fmtSize=b=>b>=1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' KB';
function mediaError(ms){return mainMediaError(ms)}
function mainMediaError(ms){
  const pv=ms.filter(m=>m.type==='image'||m.type==='video').length,a=ms.some(m=>m.type==='audio');
  return pv>MAX_MEDIA?tr('Maximum {n} photos and videos per post.',{n:MAX_MEDIA}):a&&pv?tr('A voice note can’t be combined with photos or videos. Remove one to continue.'):'';
}
let mErr='',mT;
function mediaNote(err){clearTimeout(mT);mErr=err||'';mediaUi();if(err)mT=setTimeout(()=>{mErr='';mediaUi()},5000)}
function addMedia(files,kind){
  let err='';
  for(const f of files){
    if(!f.type.startsWith(kind+'/')){err=tr('“{name}” is not a {kind}.',{name:f.name,kind:tr(kind==='image'?'photo':'video')});continue}
    if(cnt('audio')||rec){err=tr('Remove the voice note to add photos or videos.');break}
    if(cnt('image')+cnt('video')>=MAX_MEDIA){err=tr('Maximum {n} photos and videos per post — extra files were skipped.',{n:MAX_MEDIA});break}
    draft.media.push({type:kind,blob:f});
  }
  prev();mediaNote(err);
}
function mediaUi(){
  const n=cnt('image'),v=cnt('video'),a=cnt('audio'),t=n+v,voice=a>0||!!rec,full=t>=MAX_MEDIA,off=voice||full;
  const fl=$('#fl'),fv=$('#flv'),mic=$('#mic');if(!fl||!fv)return;
  fl.disabled=off;fv.disabled=off;
  fl.parentElement.classList.toggle('dis',off);fv.parentElement.classList.toggle('dis',off);
  const why=voice?tr('Remove the voice note to add photos or videos'):tr('Limit reached ({n}/{max})',{n:MAX_MEDIA,max:MAX_MEDIA});
  fl.parentElement.title=off?why:tr('Add photos ({n}/{max})',{n:t,max:MAX_MEDIA});
  fv.parentElement.title=off?why:tr('Add a video ({n}/{max})',{n:t,max:MAX_MEDIA});
  if(mic){const offM=t>0&&!rec;mic.disabled=offM;mic.classList.toggle('dis',offM);mic.title=offM?tr('Remove photos and videos to record a voice note'):tr('Voice note')}
  $('#mnote').innerHTML=mErr?`<span class="text-red-500">${esc(mErr)}</span>`:t?`${t}/${MAX_MEDIA}${full?' · '+tr('limit reached'):''} · ${tr('tap × to remove')}`:a?tr('Voice note attached · photos and videos are unavailable'):'';
}

/* ---------- Composer (inline on desktop, full-screen sheet below lg) ---------- */
let drafts=[],tdraft=[],posting=false;
const hasContent=()=>{const t=$('#txt');return !!(t&&t.value.trim())||draft.media.length>0};
function syncBtns(){
  const has=canPost();document.querySelectorAll('.postbtn').forEach(b=>b.disabled=!has);const ta=document.querySelector('[data-tadd]');if(ta)ta.disabled=!has||tdraft.length>=MAX_THREAD-1;mediaUi();
  const d=$('#cx-dc');if(d)d.textContent=drafts.length?tr('Drafts ({n})',{n:drafts.length}):tr('Drafts');
}
function refreshComposer(){const t=$('#txt');t.style.height='auto';t.style.height=t.scrollHeight+'px';syncBtns()}
function resetComposer(){tdraft=[];draft=emptyDraft();lpSeq++;lpDraw();$('#txt').value='';mediaNote('');renderThreadX();refreshComposer();prev();pills();drawBadges()}
function openComposer(){$('#composer').classList.add('open');document.body.style.overflow='hidden';if(typeof wpPaint==='function')wpPaint();setTimeout(()=>$('#txt').focus(),50)}
function closeComposer(){$('#composer').classList.remove('open');document.body.style.overflow='';closeMoodPop()}
function cancelComposer(){if((hasContent()||tdraft.some(x=>x.text.trim()||x.media.length))&&!confirm(tr('Discard this post? (Use Drafts to keep it instead.)')))return;resetComposer();closeComposer()}
async function doPost(){
  const text=$('#txt').value.trim();
  if(!text&&!draft.media.length)return;
  const err=mainMediaError(draft.media);if(err)return mediaNote(err);
  if(!canPost()||posting)return;posting=true;
  try{
    const base=Date.now(),p={id:uid(),ts:base,text,mood:draft.mood,media:draft.media,mc:draft.mc||'',link:draft.link||null};
    const more=tdraft.map((d,i)=>({id:uid(),ts:base+i+1,text:d.text.trim(),mood:'',media:d.media,mc:'',tid:p.id,ord:i+1}));
    if(more.length){p.tid=p.id;p.ord=0}
    await putPost(p);for(const x of more)await putPost(x);
    if(draft.did){drafts=drafts.filter(x=>x.id!==draft.did);await setMeta('drafts',drafts)}
    posts=[...posts,p,...more].sort((a,b)=>b.ts-a.ts);
  }finally{posting=false}
  resetComposer();closeComposer();renderAll();
}
/* ---------- Drafts (stored in the 'meta' store under key 'drafts') ---------- */
async function saveDraft(){
  if(!hasContent())return;
  drafts=drafts.filter(x=>x.id!==draft.did);
  drafts.unshift({id:uid(),ts:Date.now(),link:draft.link||null,text:$('#txt').value.trim(),mood:draft.mood,mc:draft.mc,media:[...draft.media],extras:tdraft.map(x=>({text:x.text,media:[...x.media]}))});
  await setMeta('drafts',drafts);resetComposer();
}
function draftsHtml(){
  const has=hasContent();
  return `<h2 class="mb-3 text-lg font-bold">${tr('Drafts')}</h2>
  <button class="btn gh mb-3 w-full justify-center ${has?'':'dis'}" data-dr="save" ${has?'':'disabled'}>${tr('Save current post as draft')}</button>
  ${drafts.length?drafts.map(d=>`<div class="flex items-start gap-2 border-t bl py-2"><button class="min-w-0 flex-1 text-left" data-dr="use" data-id="${d.id}"><p class="line-clamp-2 break-words">${d.text?esc(d.text):'<i class="mute">'+tr('(media only)')+'</i>'}</p><p class="mute text-xs">${fmt(d.ts)}${d.media.length?' · 📎 '+d.media.length:''}${(d.extras||[]).length?' · 🧵 +'+d.extras.length:''}</p></button><button class="mute px-2 text-lg leading-none" data-dr="del" data-id="${d.id}" aria-label="${tr('Delete draft')}">×</button></div>`).join(''):'<p class="mute py-4 text-center text-sm">'+tr('No drafts yet.')+'</p>'}
  <button class="btn gh mt-4 w-full justify-center" data-act="closesheet">${tr('Close')}</button>`;
}
function openDrafts(){openSheet(draftsHtml());$('#sheetBody').onclick=drClick}
async function drClick(e){
  const b=e.target.closest('[data-dr]');if(!b)return;const k=b.dataset.dr,id=b.dataset.id;
  if(k==='save'){await saveDraft();closeSheet()}
  else if(k==='del'){drafts=drafts.filter(d=>d.id!==id);await setMeta('drafts',drafts);openDrafts()}
  else if(k==='use'){
    const d=drafts.find(x=>x.id===id);if(!d)return;
    if(hasContent()&&!confirm(tr('Replace what you are writing with this draft?')))return;
    tdraft=(d.extras||[]).map(x=>({k:uid(),text:x.text||'',media:[...(x.media||[])]}));
    draft={link:d.link||null,lpOff:'',mood:d.mood,media:[...d.media],mc:d.mc,did:d.id};$('#txt').value=d.text;
    closeSheet();refreshComposer();renderThreadX();prev();pills();drawBadges();mediaNote('');lpDraw();
  }
}
function closeMoodPop(){const p=$('#moodpop'),b=$('#moodbtn');if(p)p.classList.add('hidden');if(b)b.setAttribute('aria-expanded','false')}
document.addEventListener('click',e=>{if(!e.target.closest('#moodpop,#moodbtn'))closeMoodPop()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMoodPop()});

function renderComposer(){
  $('#composer').innerHTML=`<div id="wpc" class="wpl" aria-hidden="true"><img alt="" draggable="false"></div><div class="cbar flex items-center justify-between border-b bl px-4 py-3 lg:hidden" style="padding-top:calc(.75rem + env(safe-area-inset-top,0px))">
    <button type="button" id="cx-cancel" class="text-base">${tr('Cancel')}</button>
    <div class="flex items-center gap-3"><button type="button" id="cx-dc" class="text-base font-semibold" style="color:var(--brand)">${tr('Drafts')}</button><button id="postm" class="btn pri postbtn" disabled>${tr('Post')}</button></div></div>
  <div class="cmain relative flex min-h-0 flex-1 flex-col">
    <button type="button" id="moodbtn" class="card absolute right-4 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border bl shadow-md" aria-label="${tr('Choose mood')}" aria-haspopup="true" aria-expanded="false"></button>
    <div id="moodpop" class="card absolute right-4 top-16 z-20 hidden w-[min(22rem,calc(100vw-2rem))] rounded-2xl border bl p-2 shadow-lg" role="menu" aria-label="${tr('Mood')}"><div id="moodgrid" class="grid grid-cols-4 gap-1"></div></div>
    <div class="cscroll min-h-0 flex-1 overflow-y-auto px-4 pt-4 lg:overflow-visible"><div class="flex gap-3"><div id="cav" class="tcol"></div><div class="min-w-0 flex-1">
      <textarea id="txt" rows="2" placeholder="${tr('How was your day?')}" class="w-full resize-none pr-14 text-lg"></textarea>
      <div class="flex items-center gap-1">
        <label class="cursor-pointer p-2" style="color:var(--brand)" title="${tr('Add photos')}"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><input type="file" id="fl" multiple accept="image/*" class="hidden"></label>
        <label class="cursor-pointer p-2" style="color:var(--brand)" title="${tr('Add a video')}"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg><input type="file" id="flv" accept="video/*" class="hidden"></label>
        <button id="mic" type="button" class="p-2" style="color:var(--brand)" title="${tr('Voice note')}" aria-label="${tr('Voice note')}"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg></button>
        <span id="recl" class="rec hidden text-sm text-red-500">${tr('● Recording…')}</span>
      </div>
      <div id="prev" class="my-2 grid grid-cols-2 gap-2"></div>
      <p id="mnote" class="mute mb-2 text-xs" role="status" aria-live="polite"></p>
      <div id="lprev"></div>
      <div id="badgerow" class="mt-2 flex flex-wrap items-center gap-1"></div>
      <div id="colrow" class="mt-1 flex flex-wrap items-center gap-3"></div>
    </div></div></div>
    <div class="mx-4 mb-3 mt-3 hidden items-center justify-end border-t bl pt-2 lg:mb-4 lg:flex" style="padding-bottom:env(safe-area-inset-bottom,0px)">
      <span class="inline-flex"><button id="post" class="btn pri postbtn" disabled>${tr('Post')}</button></span></div>
  </div>`;
  const t=$('#txt');
  t.oninput=()=>{refreshComposer();lpWatch()};t.addEventListener('paste',()=>setTimeout(lpWatch,0));
  $('#moodbtn').onclick=()=>{const p=$('#moodpop'),open=p.classList.contains('hidden');p.classList.toggle('hidden',!open);$('#moodbtn').setAttribute('aria-expanded',String(open))};
  $('#moodgrid').onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;draft.mood=b.dataset.m;draft.mc=mcolFor(draft.mood);pills();drawBadges();closeMoodPop()};
  $('#fl').onchange=e=>{const fs=[...e.target.files];e.target.value='';addMedia(fs,'image')};   /* no automatic Image Editor */
  $('#flv').onchange=e=>{const fs=[...e.target.files];e.target.value='';addMedia(fs,'video')};
  $('#mic').onclick=toggleRec;
  $('#cx-cancel').onclick=cancelComposer;$('#cx-dc').onclick=openDrafts;
  $('#post').onclick=doPost;$('#postm').onclick=doPost;
  drawBadges();renderThreadX();syncBtns();icons();lpDraw();
  if(typeof wpPaint==='function')wpPaint();   /* wallpaper layer inside this window */
}
function drawBadges(noCol){
  $('#badgerow').innerHTML=moodBadge(draft);
  const row=(k,label,v)=>`<span class="mute inline-flex items-center gap-1 text-xs">${label}<input type="color" data-c="${k}" value="${v}" class="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"><button class="lnk" data-creset="${k}" title="${tr('Reset color')}" aria-label="${tr('Reset color')}">↺</button></span>`;
  if(!noCol)$('#colrow').innerHTML=draft.mood&&MOODS[draft.mood]?row('mc',tr('Mood badge'),moodBg(draft)):'';
}
function pills(){
  if(!draft.mood||!MOODS[draft.mood])draft.mood='neutral';
  const btn=$('#moodbtn');if(btn){btn.innerHTML=mi(draft.mood,26);btn.title=MOODS[draft.mood][2]}
  const g=$('#moodgrid');if(!g)return;
  g.innerHTML=Object.entries(MOODS).map(([k,m])=>{const on=draft.mood===k;return `<button type="button" role="menuitemradio" aria-checked="${on}" data-m="${k}" class="flex min-w-0 flex-col items-center gap-1 rounded-xl p-2 text-xs" style="${on?'background:rgba(var(--brand-rgb),.16);box-shadow:inset 0 0 0 2px var(--brand)':''}">${mi(k,28)}<span class="w-full truncate text-center" style="color:var(--ink)">${esc(m[2])}</span></button>`}).join('');
}

/* ---------- Colour handlers (called from index.html) ---------- */
function onComposerColor(k,v){draft[k]=v;if(k==='mc'&&draft.mood&&/^#[0-9a-f]{6}$/i.test(v)){MCOL[draft.mood]=v.toLowerCase();saveMcol()}pills();drawBadges(true)}
function resetComposerColor(k){draft[k]='';if(k==='mc'&&draft.mood&&MCOL[draft.mood]){delete MCOL[draft.mood];saveMcol()}pills();drawBadges()}

/* ---------- Manual Image Editor (Create Post + Add another post) ----------
   Photos are attached directly. The existing shared editor opens only when the pencil on a preview is clicked.
   Save → that one image is replaced by the edited file; Cancel → the original stays untouched. */
const editImgBtn=(k,i)=>`<button type="button" data-iedit="${k}:${i}" class="absolute bottom-1 right-1 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white" aria-label="${tr('Edit image')}" title="${tr('Edit image')}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>`;
let ieBusy=false;
document.addEventListener('click',async e=>{
  const b=e.target.closest&&e.target.closest('[data-iedit]');if(!b||ieBusy)return;
  const[k,i]=b.dataset.iedit.split(':'),get=()=>k==='main'?draft:miniGet(k),d=get(),m=d&&d.media[+i];
  if(!m||m.type!=='image')return;
  const note=t=>k==='main'?mediaNote(t):miniRefresh(k,t);
  if(m.blob.type==='image/gif')return note(tr('Animated GIFs can’t be edited.'));
  ieBusy=true;
  try{
    const r=await editImages([m.blob],{preset:'orig'}),f=r.files[0],cur=get(),j=cur?cur.media.indexOf(m):-1;
    if(!f||f===m.blob||j<0)return;                       /* Cancel (or the image was removed meanwhile) */
    cur.media[j]={type:'image',blob:f};                 /* new object: saved drafts keep their own copy */
    k==='main'?prev():miniRefresh(k);
  }finally{ieBusy=false}
});
