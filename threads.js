/* ---------- Threads (X / Bluesky style) ----------
   Data model: a post that belongs to a thread has  tid (thread id = id of the first post)  and  ord (0,1,2…).
   Posts without tid are ordinary standalone posts, so all existing data keeps working untouched. */
const MAX_THREAD=25;
const chatPlus=(px=20)=>`<svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M12 8v6M9 11h6"/></svg>`;
const dotsSvg='<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';
const newAdd=key=>({k:'add',key,open:false,text:'',media:[]});
const byOrd=(a,b)=>(a.ord||0)-(b.ord||0)||a.ts-b.ts;
const threadOf=p=>p.tid?posts.filter(x=>x.tid===p.tid).sort(byOrd):[p];
const autosize=t=>{t.style.height='auto';const h=t.scrollHeight;t.style.height=h?h+'px':''};
const focusMini=k=>{const t=document.querySelector(`[data-mt="${k}"]`);if(t){t.focus();t.setSelectionRange(t.value.length,t.value.length)}};

/* Group posts into threads (root first) for the feed / day list; groups keep the root's position */
function groupThreads(arr,asc){
  const by=new Map(),seen=new Set(),out=[];
  arr.forEach(p=>{if(p.tid){if(!by.has(p.tid))by.set(p.tid,[]);by.get(p.tid).push(p)}});
  by.forEach(g=>g.sort(byOrd));
  arr.forEach(p=>{if(!p.tid)out.push([p]);else if(!seen.has(p.tid)){seen.add(p.tid);out.push(by.get(p.tid))}});
  return out.sort((a,b)=>asc?a[0].ts-b[0].ts:b[0].ts-a[0].ts);
}

/* ---------- Three-dot menu ---------- */
let inPV=false;
const menuHtml=p=>`<div class="relative"><button type="button" class="mute p-1" data-menu="${p.id}" aria-haspopup="menu" aria-expanded="false" aria-label="${tr('More options')}">${dotsSvg}</button>
  <div class="pmenu card hidden absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border bl py-1 shadow-lg" role="menu">
  <button type="button" role="menuitem" data-edit="${p.id}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>${tr('Edit post')}</button>
  <button type="button" role="menuitem" class="danger" data-del="${p.id}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/></svg>${tr('Delete')}</button></div></div>`;
function closeMenus(){document.querySelectorAll('.pmenu:not(.hidden)').forEach(m=>{m.classList.add('hidden');m.style.top='';m.style.bottom='';const b=m.previousElementSibling;if(b)b.setAttribute('aria-expanded','false')})}
function toggleMenu(btn){
  const m=btn.nextElementSibling,was=!m.classList.contains('hidden');closeMenus();if(was)return;
  m.classList.remove('hidden');btn.setAttribute('aria-expanded','true');
  if(m.getBoundingClientRect().bottom>innerHeight-80){m.style.top='auto';m.style.bottom='100%'}
}

/* ---------- Confirmation dialog ---------- */
let dlgRes=null,dlgFocus=null;
function askConfirm({title,body,ok=tr('Delete'),danger=true}){
  return new Promise(res=>{
    if(dlgRes)closeDlg(false);
    dlgRes=res;dlgFocus=document.activeElement;const d=document.querySelector('#dlg');
    d.innerHTML=`<div class="card w-full max-w-sm rounded-2xl border bl p-5 shadow-xl" role="alertdialog" aria-modal="true" aria-labelledby="dlgt" aria-describedby="dlgb"><h2 id="dlgt" class="text-lg font-bold">${esc(title)}</h2><p id="dlgb" class="mute mt-1 text-sm">${esc(body)}</p><div class="mt-5 flex justify-end gap-2"><button type="button" class="btn gh" data-dlg="0">${esc(tr('Cancel'))}</button><button type="button" class="btn" style="background:${danger?'#ef4444':'var(--brand)'};color:#fff" data-dlg="1">${esc(ok)}</button></div></div>`;
    d.classList.replace('hidden','flex');d.querySelector('[data-dlg="0"]').focus();
  });
}
function closeDlg(v){
  const d=document.querySelector('#dlg');d.classList.replace('flex','hidden');d.innerHTML='';
  const r=dlgRes;dlgRes=null;if(dlgFocus&&dlgFocus.isConnected)try{dlgFocus.focus()}catch(e){}dlgFocus=null;if(r)r(v);
}
document.addEventListener('keydown',e=>{
  if(!dlgRes)return;
  if(e.key==='Escape'){e.stopImmediatePropagation();closeDlg(false)}
  else if(e.key==='Tab'){const bs=[...document.querySelectorAll('#dlg button')],i=bs.indexOf(document.activeElement);e.preventDefault();bs[(i+(e.shiftKey?-1:1)+bs.length)%bs.length].focus()}
},true);

/* ---------- Mini composer (extra thread posts + "add to thread") ---------- */
const miniGet=k=>k==='add'?adraft:tdraft.find(x=>x.k===k);
const miniRoot=k=>document.querySelector(`.mini[data-mk="${k}"]`);
function miniPrev(d){
  return d.media.map((m,i)=>{const rm=`<button type="button" data-mrm="${d.k}:${i}" class="absolute right-1 top-1 z-10 rounded-full bg-black/60 px-2 text-white" aria-label="${tr('Remove')}">×</button>`;
    return m.type==='audio'?`<div class="relative col-span-2 overflow-hidden rounded-xl border bl p-2 pr-8">${mediaTag(m)}${rm}</div>`:m.type==='video'?`<div class="relative col-span-2 overflow-hidden rounded-xl border bl"><div class="aspect-video">${mediaTag(m)}</div>${rm}</div>`:`<div class="relative aspect-square overflow-hidden rounded-xl border bl">${mediaTag(m)}${rm}${editImgBtn(d.k,i)}</div>`}).join('');
}
function miniHtml(d,o={}){
  const k=d.k;
  return `<div class="mini flex gap-3 pt-3" data-mk="${k}"><div class="tcol ${o.up?'up':''} ${o.dn?'dn':''} flex shrink-0 flex-col items-center">${avatarHtml()}</div><div class="min-w-0 flex-1">
  <textarea data-mt="${k}" rows="2" placeholder="${esc(tr(o.ph||'Add another post…'))}" class="w-full resize-none text-lg">${esc(d.text)}</textarea>
  <div class="mprev my-2 grid grid-cols-2 gap-2">${miniPrev(d)}</div><p class="mnote mute mb-1 text-xs" role="status" aria-live="polite"></p>
  <div class="flex items-center gap-1">
    <label class="cursor-pointer p-2" style="color:var(--brand)" title="${tr('Add photos')}"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><input type="file" multiple accept="image/*" data-mf="image" data-mk="${k}" class="hidden"></label>
    <label class="cursor-pointer p-2" style="color:var(--brand)" title="${tr('Add a video')}"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg><input type="file" accept="video/*" data-mf="video" data-mk="${k}" class="hidden"></label>
    <button type="button" class="p-2" style="color:var(--brand)" data-mrec="${k}" aria-label="${tr('Voice note')}" title="${tr('Voice note')}"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg></button>
    ${o.rem?`<button type="button" class="mute ml-auto p-2" data-tdel="${k}" aria-label="${tr('Remove this post')}" title="${tr('Remove this post')}"><i data-lucide="trash-2" class="h-4 w-4"></i></button>`:''}
  </div>${o.extra||''}</div></div>`;
}
function miniRefresh(k,err){
  const d=miniGet(k),r=miniRoot(k);if(!d||!r)return;
  r.querySelector('.mprev').innerHTML=miniPrev(d);
  const n=d.media.filter(m=>m.type==='image').length,v=d.media.filter(m=>m.type==='video').length,a=d.media.filter(m=>m.type==='audio').length,recNow=!!(mrec&&mrec.k===k),tot=n+v,offI=a>0||recNow||tot>=MAX_MEDIA,offV=offI;
  const li=r.querySelector('[data-mf="image"]'),lv=r.querySelector('[data-mf="video"]');
  li.disabled=offI;lv.disabled=offV;li.parentElement.classList.toggle('dis',offI);lv.parentElement.classList.toggle('dis',offV);
  const mb=r.querySelector('[data-mrec]');if(mb){const offM=(n>0||v>0)&&!recNow;mb.disabled=offM;mb.classList.toggle('dis',offM);mb.style.color=recNow?'#ef4444':'var(--brand)';mb.title=recNow?tr('Stop recording'):offM?tr('Remove photos and videos to record a voice note'):tr('Voice note')}
  r.querySelector('.mnote').innerHTML=err?`<span class="text-red-500">${esc(err)}</span>`:recNow?'<span class="text-red-500">'+tr('● Recording… tap the mic to stop')+'</span>':a?tr('Voice note attached · photos and videos are unavailable'):tot?`${tot}/${MAX_MEDIA}${tot>=MAX_MEDIA?' · '+tr('limit reached'):''} · ${tr('tap × to remove')}`:'';
  if(k==='add'){const b=document.querySelector('[data-addpost]');if(b)b.disabled=!(d.text.trim()||d.media.length)}else syncBtns();
}
function miniAddMedia(d,files,kind){
  let err='';const cn=t=>d.media.filter(m=>m.type===t).length;
  for(const f of files){
    if(cn('audio')||(mrec&&mrec.k===d.k)){err=tr('Remove the voice note to add photos or videos.');break}
    if(!f.type.startsWith(kind+'/')){err=tr('“{name}” is not a {kind}.',{name:f.name,kind:tr(kind==='image'?'photo':'video')});continue}
    if(mediaCount(d.media)>=MAX_MEDIA){err=tr('Maximum {n} photos and videos per post — extra files were skipped.',{n:MAX_MEDIA});break}
    d.media.push({type:kind,blob:f});
  }
  miniRefresh(d.k,err);
}
const miniAll=()=>document.querySelectorAll('.mini').forEach(r=>miniRefresh(r.dataset.mk));

/* ---------- Composer: extra posts + "Add another post" ---------- */
const canPost=()=>hasContent()&&tdraft.every(d=>d.text.trim()||d.media.length);
function renderThreadX(){
  const el=$('#threadx');if(!el)return;const cav=$('#cav');if(cav)cav.classList.toggle('dn',tdraft.length>0);
  el.innerHTML=tdraft.map((d,i)=>miniHtml(d,{up:true,dn:i<tdraft.length-1,rem:true})).join('')
    +`<div class="flex items-center gap-2 pt-3" style="padding-left:3.5rem"><button type="button" data-tadd class="btn gh" aria-label="${tr('Add another post')}" title="${tr('Add another post')}">${chatPlus(18)}<span>${tr('Add another post')}</span></button>${tdraft.length?`<span class="mute text-xs">${tdraft.length+1}/${MAX_THREAD}</span>`:''}</div>`;
  el.querySelectorAll('[data-mt]').forEach(autosize);icons();miniAll();syncBtns();
}
function addExtra(){
  if(!canPost()||tdraft.length>=MAX_THREAD-1)return;
  const d={k:uid(),text:'',media:[]};tdraft.push(d);renderThreadX();focusMini(d.k);
  const r=miniRoot(d.k);if(r)r.scrollIntoView({block:'nearest',behavior:'smooth'});
}
const delExtra=k=>{tdraft=tdraft.filter(x=>x.k!==k);renderThreadX()};

/* ---------- Dedicated post page (#post/<id>) ---------- */
function addAreaHtml(){
  if(!adraft.open)return '';
  const extra=`<div class="mt-2 flex justify-end gap-2"><button type="button" class="btn gh" data-addcancel>${tr('Cancel')}</button><button type="button" class="btn pri" data-addpost ${adraft.text.trim()||adraft.media.length?'':'disabled'}>${tr('Post')}</button></div>`;
  return `<div class="border-b bl px-4 pb-3">${miniHtml(adraft,{ph:'Add another post…',up:true,extra})}</div>`;
}
function renderPostView(){
  const p=posts.find(x=>x.id===pview);if(!p)return;
  const th=threadOf(p),n=th.length,add=adraft.open;
  
  const pv=$('#pv');inPV=true;try{pv.innerHTML=th.map((x,i)=>card(x,i>0,i<n-1||add,x.id===p.id)).join('')+addAreaHtml()}finally{inPV=false}pv.onclick=postClick;
  pv.querySelectorAll('[data-mt]').forEach(autosize);icons();miniAll();
}
function route(){
  const m=/^#post\/(.+)$/.exec(location.hash);let id=null;if(m){try{id=decodeURIComponent(m[1])}catch(e){}}
  const p=id&&posts.find(x=>x.id===id);
  if(p){
    pview=id;document.body.classList.add('pv');$('#view-timeline').classList.add('hidden');$('#view-calendar').classList.add('hidden');$('#view-post').classList.remove('hidden');
    const key=p.tid||p.id;if(adraft.key!==key)adraft=newAdd(key);
    closeMenus();renderPostView();window.scrollTo(0,0);
  }else{
    if(m){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}}
    document.body.classList.remove('pv');
    if(pview!==null){showTab(tab);window.scrollTo(0,lastY)}
  }
}
function openPost(id,add){
  closeMenus();if(pview===null)lastY=window.scrollY;
  const h='#post/'+encodeURIComponent(id);let ok=true;
  try{history.pushState({itsme:1},'',h)}catch(e){ok=false}
  if(ok)route();else location.hash=h;
  if(add&&pview===id)startAdd(id);
}
function startAdd(id){if(pview!==id)return openPost(id,true);adraft.open=true;renderPostView();focusMini('add')}
function goBack(){
  if(history.state&&history.state.itsme)return history.back();
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){location.hash=''}route();
}
async function addToThread(){
  const d=adraft,text=d.text.trim();if(!text&&!d.media.length)return;
  const err=mediaError(d.media);if(err)return miniRefresh('add',err);
  const p=posts.find(x=>x.id===pview);if(!p)return;
  const btn=document.querySelector('[data-addpost]');if(btn)btn.disabled=true;
  try{
    if(!p.tid){p.tid=p.id;p.ord=0;await putPost(p)}   /* a standalone post becomes the first post of a thread */
    const ord=Math.max(0,...threadOf(p).map(x=>x.ord||0))+1;
    const np={id:uid(),ts:Date.now(),text,mood:'',tags:[],media:d.media,mc:'',tc:'',tid:p.tid,ord};
    await putPost(np);posts=[...posts,np].sort((a,b)=>b.ts-a.ts);adraft=newAdd(p.tid);adraft.open=true;renderAll();focusMini('add');
    const el=document.querySelector(`#pv [data-open="${np.id}"]`);if(el)el.scrollIntoView({block:'nearest',behavior:'smooth'});
  }catch(e){console.error(e);alert(tr('Could not save the post. Please try again.'));if(btn)btn.disabled=false}
}

/* ---------- Events ---------- */
document.addEventListener('click',e=>{
  const t=e.target;
  if(t.id==='dlg')return closeDlg(false);
  if(!t.closest('[data-menu],.pmenu'))closeMenus();
  const b=t.closest('button');if(!b)return;const d=b.dataset;
  if(d.dlg!==undefined)closeDlg(d.dlg==='1');
  else if(d.menu)toggleMenu(b);
  else if(d.view)openPost(d.view);
  else if(d.addthread)startAdd(d.addthread);
  else if('pback' in d)goBack();
  else if('tadd' in d)addExtra();
  else if(d.tdel)delExtra(d.tdel);
  else if(d.mrm){const[k,i]=d.mrm.split(':'),m=miniGet(k);if(m){m.media.splice(+i,1);miniRefresh(k)}}
  else if(d.mrec)miniToggleRec(d.mrec)
  else if('addopen' in d){adraft.open=true;renderPostView();focusMini('add')}
  else if('addcancel' in d){adraft=newAdd(adraft.key);renderPostView()}
  else if('addpost' in d)addToThread();
  if(b.closest('.pmenu'))closeMenus();
});
document.addEventListener('input',e=>{
  const i=e.target,k=i.dataset&&i.dataset.mt;if(k===undefined)return;
  const d=miniGet(k);if(!d)return;d.text=i.value;autosize(i);
  if(k==='add'){const b=document.querySelector('[data-addpost]');if(b)b.disabled=!(d.text.trim()||d.media.length)}else syncBtns();
});
document.addEventListener('change',e=>{
  const i=e.target,kind=i.dataset&&i.dataset.mf;if(!kind)return;
  const d=miniGet(i.dataset.mk),fs=[...i.files];i.value='';if(d)miniAddMedia(d,fs,kind);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenus()});

/* ---------- Edit post: add / remove photos + video ---------- */
function editAddMedia(files,kind){
  if(!ed)return;let err='';const cn=t=>ed.media.filter(m=>m.type===t).length;
  for(const f of files){
    if(!f.type.startsWith(kind+'/')){err=tr('“{name}” is not a {kind}.',{name:f.name,kind:tr(kind==='image'?'photo':'video')});continue}
    if(mediaCount(ed.media)>=MAX_MEDIA){err=tr('Maximum {n} photos and videos per post — extra files were skipped.',{n:MAX_MEDIA});break}
    ed.media.push({type:kind,blob:f});
  }
  ed.err=err;renderAll();
}
/* Edit post: photos go through the shared Image Editor first */
async function editAddImagesEdited(files){
  if(!ed)return;const room=Math.max(0,MAX_MEDIA-mediaCount(ed.media));
  if(!files.length||!room)return editAddMedia(files,'image');
  const r=await editImages(files,{preset:'orig',max:room});
  if(!ed)return;editAddMedia(r.files,'image');
  if(r.trimmed&&ed){ed.err=tr('Maximum {n} photos and videos per post — extra files were skipped.',{n:MAX_MEDIA});renderAll()}
}
document.addEventListener('change',e=>{
  const i=e.target,kind=i.dataset&&i.dataset.ef;if(!kind)return;
  const fs=[...i.files];i.value='';kind==='image'?editAddImagesEdited(fs):editAddMedia(fs,kind);
});

/* ---------- Add another post: voice recording ---------- */
let mrec=null;
async function miniToggleRec(k){
  if(mrec){const r=mrec;if(r.rec.state!=='inactive')r.rec.stop();return}
  const d=miniGet(k);if(!d)return;
  if(d.media.some(m=>m.type==='image'||m.type==='video'))return miniRefresh(k,tr('Remove photos and videos to record a voice note.'));
  try{
    const s=await navigator.mediaDevices.getUserMedia({audio:true}),chunks=[],rec=new MediaRecorder(s);
    mrec={k,rec};
    rec.ondataavailable=e=>chunks.push(e.data);
    rec.onstop=()=>{s.getTracks().forEach(x=>x.stop());mrec=null;const dd=miniGet(k);if(dd&&chunks.length)dd.media.push({type:'audio',blob:new Blob(chunks,{type:rec.mimeType||'audio/webm'})});miniRefresh(k)};
    rec.start();miniRefresh(k);
  }catch(e){mrec=null;alert(tr('Microphone access was denied or is unavailable.'))}
}
