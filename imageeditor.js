/* ---------- Shared Image Editor ----------
   ONE component used by every place that lets the user pick an image
   (profile photo, banner, highlight cover + photos, mood icons, Create Post,
   Add another post, Edit post).

   API:  const r = await editImages(files, {preset, max, maxSide});
         r.files   → File[] ready to use (edited images; untouched videos/GIFs/etc. pass through)
         r.trimmed → number of selected files left out because of `max`
   - preset: '1:1' | '4:3' | '9:16' | 'orig' | 'free'  (starting crop shape)
   - Opens one editor per image. Save → a REAL new image file is rendered from the crop
     (canvas), the original File is never modified. Cancel → that image is skipped.
   - Animated GIFs skip the editor (re-encoding would flatten the animation). */
(function(){
const PAD=14,MINF=48,CAP=4000;
const PRESETS=[['1:1','1:1'],['4:3','4:3'],['9:16','9:16'],['orig','Original'],['free','Free']];
const RATIO={'1:1':1,'4:3':4/3,'9:16':9/16};
const clamp=(v,a,b)=>Math.min(Math.max(v,a),b);

if(!document.getElementById('ie-css')){
  const st=document.createElement('style');st.id='ie-css';
  st.textContent=`
  .ie-root{position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;background:#111;color:#fff;touch-action:manipulation;overscroll-behavior:contain;user-select:none;-webkit-user-select:none}
  .ie-head{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.6rem .75rem;padding-top:calc(.6rem + env(safe-area-inset-top,0px))}
  .ie-head b{font-size:.95rem;text-align:center;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ie-stage{position:relative;flex:1;min-height:0;overflow:hidden;touch-action:none;background:#1b1b1b;cursor:grab}
  .ie-stage.ie-drag{cursor:grabbing}
  .ie-img{position:absolute;left:0;top:0;max-width:none!important;max-height:none!important;transform-origin:0 0;pointer-events:none;will-change:transform;-webkit-user-drag:none}
  .ie-f{position:absolute;box-shadow:0 0 0 9999px rgba(0,0,0,.62);outline:1.5px solid #fff;outline-offset:-1px;pointer-events:none}
  .ie-f::before{content:"";position:absolute;inset:0;pointer-events:none;background:
    linear-gradient(to right,transparent calc(33.33% - .5px),rgba(255,255,255,.35) 0 calc(33.33% + .5px),transparent 0 calc(66.66% - .5px),rgba(255,255,255,.35) 0 calc(66.66% + .5px),transparent 0),
    linear-gradient(to bottom,transparent calc(33.33% - .5px),rgba(255,255,255,.35) 0 calc(33.33% + .5px),transparent 0 calc(66.66% - .5px),rgba(255,255,255,.35) 0 calc(66.66% + .5px),transparent 0)}
  .ie-h{position:absolute;width:44px;height:44px;transform:translate(-50%,-50%);pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center}
  .ie-h::after{content:"";background:#fff;border-radius:3px;box-shadow:0 0 0 1px rgba(0,0,0,.55)}
  .ie-h.c::after{width:14px;height:14px}
  .ie-h.n::after,.ie-h.s::after{width:28px;height:5px}
  .ie-h.e::after,.ie-h.w::after{width:5px;height:28px}
  .ie-lock .ie-h.n,.ie-lock .ie-h.e,.ie-lock .ie-h.s,.ie-lock .ie-h.w{display:none}
  .ie-foot{padding:.6rem .75rem;padding-bottom:calc(.6rem + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:.55rem;background:#111}
  .ie-row{display:flex;align-items:center;gap:.5rem}
  .ie-presets{display:flex;gap:.4rem;overflow-x:auto;justify-content:center;scrollbar-width:none}
  .ie-presets::-webkit-scrollbar{display:none}
  .ie-p{flex:none;padding:.35rem .8rem;border-radius:999px;border:1px solid rgba(255,255,255,.3);font-size:.85rem;font-weight:600;color:#fff;cursor:pointer;white-space:nowrap}
  .ie-p.on{background:var(--brand,#e07a5f);border-color:var(--brand,#e07a5f);color:var(--on-brand,#fff)}
  .ie-z{flex:none;width:40px;height:40px;border-radius:999px;border:1px solid rgba(255,255,255,.3);color:#fff;font-size:1.4rem;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer}
  .ie-z:disabled{opacity:.35;cursor:not-allowed}
  .ie-range{flex:1;min-width:0;accent-color:var(--brand,#e07a5f);height:32px}
  .ie-root .btn:disabled{opacity:.5}
  @media (min-width:640px){.ie-root{align-items:center;justify-content:center;background:rgba(0,0,0,.72)}
    .ie-win{display:flex;flex-direction:column;width:min(920px,94vw);height:min(760px,92vh);background:#111;border-radius:18px;overflow:hidden}
    .ie-head{padding-top:.6rem}.ie-foot{padding-bottom:.6rem}}
  @media (max-width:639px){.ie-win{display:flex;flex-direction:column;flex:1;min-height:0}}
  `;
  document.head.appendChild(st);
}

function loadImg(file){
  return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{(im.naturalWidth&&im.naturalHeight)?ok({im,u}):(URL.revokeObjectURL(u),no())};
    im.onerror=()=>{URL.revokeObjectURL(u);no()};im.src=u});
}

/* Open the editor for ONE image. Resolves to a new File (Save) or null (Cancel). */
async function editOne(file,o,idx,total){
  let L;
  try{L=await loadImg(file)}catch(e){alert(tr('This image can\u2019t be edited here, so it will be used as it is.'));return file}
  const im=L.im,iw=im.naturalWidth,ih=im.naturalHeight;
  return new Promise(done=>{
    const root=document.createElement('div');root.className='ie-root';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',tr('Edit image'));
    const hs=['n','e','s','w','nw','ne','se','sw'];
    root.innerHTML=`<div class="ie-win">
      <div class="ie-head"><button type="button" class="btn gh" data-ie="cancel" style="color:#fff;border-color:rgba(255,255,255,.3)">${tr('Cancel')}</button>
        <b>${tr('Edit image')}${total>1?' · '+tr('Image {i} of {n}',{i:idx,n:total}):''}</b>
        <button type="button" class="btn pri" data-ie="save">${tr('Save')}</button></div>
      <div class="ie-stage" data-ie="stage"><img class="ie-img" alt="" draggable="false" src="${L.u}" style="width:${iw}px;height:${ih}px">
        <div class="ie-f" data-ie="frame" aria-label="${tr('Crop area')}">${hs.map(h=>`<div class="ie-h ${h.length===2?'c':h}" data-h="${h}" style="left:${h.includes('w')?'0%':h.includes('e')?'100%':'50%'};top:${h.includes('n')?'0%':h.includes('s')?'100%':'50%'};cursor:${{n:'ns',s:'ns',e:'ew',w:'ew',nw:'nwse',se:'nwse',ne:'nesw',sw:'nesw'}[h]}-resize"></div>`).join('')}</div></div>
      <div class="ie-foot">
        <div class="ie-presets" role="group" aria-label="${tr('Aspect ratio')}">${PRESETS.map(([k,l])=>`<button type="button" class="ie-p" data-p="${k}" aria-pressed="false">${k.includes(':')?k:tr(l)}</button>`).join('')}</div>
        <div class="ie-row"><button type="button" class="btn gh" data-ie="reset" style="color:#fff;border-color:rgba(255,255,255,.3)">${tr('Reset')}</button>
          <button type="button" class="ie-z" data-ie="out" aria-label="${tr('Zoom out')}" title="${tr('Zoom out')}">\u2212</button>
          <input type="range" class="ie-range" min="0" max="1000" step="1" value="0" data-ie="range" aria-label="${tr('Zoom')}">
          <button type="button" class="ie-z" data-ie="in" aria-label="${tr('Zoom in')}" title="${tr('Zoom in')}">+</button></div>
      </div></div>`;
    const prevOv=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
    document.body.appendChild(root);
    const $q=s=>root.querySelector(s),stage=$q('[data-ie=stage]'),imgEl=$q('.ie-img'),frame=$q('[data-ie=frame]'),range=$q('[data-ie=range]'),saveB=$q('[data-ie=save]'),btnIn=$q('[data-ie=in]'),btnOut=$q('[data-ie=out]');

    let sw=stage.clientWidth,sh=stage.clientHeight;
    const fr={x:0,y:0,w:0,h:0};let s=1,tx=0,ty=0,s0=1,ratio=null,preset=o.preset&&PRESETS.some(p=>p[0]===o.preset)?o.preset:'orig',busy=false;

    const sMin=()=>Math.max(fr.w/iw,fr.h/ih),sMax=()=>Math.max(s0*8,sMin()*3);
    function clampView(){
      s=clamp(s,sMin(),Math.max(sMax(),sMin()));
      const lx=fr.x+fr.w-iw*s,ly=fr.y+fr.h-ih*s;
      tx=Math.min(Math.max(tx,lx),fr.x);ty=Math.min(Math.max(ty,ly),fr.y);
    }
    const bounds=()=>({l:Math.max(PAD,tx),t:Math.max(PAD,ty),r:Math.min(sw-PAD,tx+iw*s),b:Math.min(sh-PAD,ty+ih*s)});
    function render(){
      imgEl.style.transform=`translate(${tx}px,${ty}px) scale(${s})`;
      frame.style.left=fr.x+'px';frame.style.top=fr.y+'px';frame.style.width=fr.w+'px';frame.style.height=fr.h+'px';
      const mn=sMin(),mx=Math.max(sMax(),mn*1.0001);
      range.value=Math.round(1000*Math.log(s/mn)/Math.log(mx/mn))||0;
      btnOut.disabled=s<=mn*1.0005;btnIn.disabled=s>=mx*0.9995;
    }
    function ui(){
      root.querySelectorAll('.ie-p').forEach(b=>{const on=b.dataset.p===preset;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))});
      root.classList.toggle('ie-lock',ratio!==null);
    }
    function layout(key){
      preset=key;ratio=key==='free'?null:key==='orig'?iw/ih:RATIO[key];
      const aw=Math.max(1,sw-2*PAD),ah=Math.max(1,sh-2*PAD);s0=Math.min(aw/iw,ah/ih);
      if(ratio===null){fr.w=iw*s0;fr.h=ih*s0;s=s0}
      else{fr.w=Math.min(aw,ah*ratio);fr.h=fr.w/ratio;}
      fr.x=(sw-fr.w)/2;fr.y=(sh-fr.h)/2;
      if(ratio!==null)s=sMin();
      tx=sw/2-iw*s/2;ty=sh/2-ih*s/2;
      clampView();ui();render();
    }
    function choose(key){if(key==='free'){preset='free';ratio=null;ui();render()}else layout(key)}

    /* zoom keeping the point (px,py) fixed on screen */
    function zoomTo(ns,px,py){
      ns=clamp(ns,sMin(),Math.max(sMax(),sMin()));const k=ns/s;
      tx=px-(px-tx)*k;ty=py-(py-ty)*k;s=ns;clampView();render();
    }
    const fc=()=>[fr.x+fr.w/2,fr.y+fr.h/2];
    const zin=()=>{const[c,d]=fc();zoomTo(s*1.2,c,d)},zout=()=>{const[c,d]=fc();zoomTo(s/1.2,c,d)};
    btnIn.onclick=zin;btnOut.onclick=zout;
    range.oninput=()=>{const mn=sMin(),mx=Math.max(sMax(),mn*1.0001),[c,d]=fc();zoomTo(mn*Math.pow(mx/mn,range.value/1000),c,d)};

    /* pointer handling: drag = reposition, two fingers = pinch zoom, handles = resize crop frame */
    const pts=new Map();let mode=null;
    const pos=e=>{const r=stage.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
    const startPan=()=>{const p=[...pts.values()][0];mode={t:'pan',sx:p.x,sy:p.y,tx0:tx,ty0:ty}};
    const startPinch=()=>{
      const[a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y)||1,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
      mode={t:'pinch',d0:d,s0:s,ix:(mx-tx)/s,iy:(my-ty)/s};
    };
    stage.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;
      e.preventDefault();try{stage.setPointerCapture(e.pointerId)}catch(_){}
      pts.set(e.pointerId,pos(e));
      const h=e.target.closest&&e.target.closest('[data-h]');
      if(pts.size===1){
        if(h)mode={t:'rs',h:h.dataset.h,p0:pos(e),f0:{...fr}};
        else{startPan();stage.classList.add('ie-drag')}
      }else if(pts.size===2&&(!mode||mode.t==='pan'||mode.t==='pinch')){startPinch()}
    });
    stage.addEventListener('pointermove',e=>{
      if(!pts.has(e.pointerId))return;const p=pos(e);pts.set(e.pointerId,p);if(!mode)return;
      if(mode.t==='pan'){tx=mode.tx0+(p.x-mode.sx);ty=mode.ty0+(p.y-mode.sy);clampView();render()}
      else if(mode.t==='pinch'&&pts.size>=2){
        const[a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y)||1,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
        s=clamp(mode.s0*d/mode.d0,sMin(),Math.max(sMax(),sMin()));tx=mx-mode.ix*s;ty=my-mode.iy*s;clampView();render();
      }else if(mode.t==='rs')resize(p);
    });
    const end=e=>{
      if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);
      if(mode&&mode.t==='rs'){mode=null}
      else if(pts.size>=2)startPinch();
      else if(pts.size===1)startPan();
      else{mode=null;stage.classList.remove('ie-drag')}
    };
    stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
    stage.addEventListener('lostpointercapture',e=>{if(pts.has(e.pointerId))end(e)});
    stage.addEventListener('wheel',e=>{
      e.preventDefault();const p=pos(e),dy=e.deltaMode===1?e.deltaY*16:e.deltaY;zoomTo(s*Math.exp(-dy*0.0015),p.x,p.y);
    },{passive:false});

    function resize(p){
      const{h,p0,f0}=mode,dx=p.x-p0.x,dy=p.y-p0.y,B=bounds();
      if(ratio===null){
        let l=f0.x,t=f0.y,r=f0.x+f0.w,b=f0.y+f0.h;
        if(h.includes('w'))l=clamp(f0.x+dx,B.l,r-MINF);
        if(h.includes('e'))r=clamp(f0.x+f0.w+dx,l+MINF,B.r);
        if(h.includes('n'))t=clamp(f0.y+dy,B.t,b-MINF);
        if(h.includes('s'))b=clamp(f0.y+f0.h+dy,t+MINF,B.b);
        fr.x=l;fr.y=t;fr.w=r-l;fr.h=b-t;
      }else if(h.length===2){
        const sx=h.includes('e')?1:-1,sy=h.includes('s')?1:-1,ax=sx>0?f0.x:f0.x+f0.w,ay=sy>0?f0.y:f0.y+f0.h;
        const cx=(sx>0?f0.x+f0.w:f0.x)+dx,cy=(sy>0?f0.y+f0.h:f0.y)+dy;
        let w=Math.max(Math.max(0,(cx-ax)*sx),Math.max(0,(cy-ay)*sy)*ratio);
        const maxW=sx>0?B.r-ax:ax-B.l,maxH=sy>0?B.b-ay:ay-B.t;
        w=Math.min(w,maxW,maxH*ratio);w=Math.max(w,Math.max(MINF,MINF*ratio));
        fr.w=w;fr.h=w/ratio;fr.x=sx>0?ax:ax-w;fr.y=sy>0?ay:ay-fr.h;
      }
      clampView();render();
    }

    /* keep the edit when the window / phone orientation changes */
    function onResize(){
      const nw=stage.clientWidth,nh=stage.clientHeight;if(!nw||!nh||(nw===sw&&nh===sh))return;
      const k=Math.min(nw/sw,nh/sh),ox=(nw-sw*k)/2,oy=(nh-sh*k)/2;
      fr.x=fr.x*k+ox;fr.y=fr.y*k+oy;fr.w*=k;fr.h*=k;tx=tx*k+ox;ty=ty*k+oy;s*=k;s0=Math.min(Math.max(1,nw-2*PAD)/iw,Math.max(1,nh-2*PAD)/ih);
      sw=nw;sh=nh;clampView();render();
    }
    window.addEventListener('resize',onResize);

    function close(result){
      window.removeEventListener('resize',onResize);document.removeEventListener('keydown',onKey,true);
      root.remove();document.documentElement.style.overflow=prevOv;URL.revokeObjectURL(L.u);done(result);
    }
    function onKey(e){
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(!busy)close(null)}
      else if(e.key==='+'||e.key==='='){zin()}else if(e.key==='-'){zout()}
    }
    document.addEventListener('keydown',onKey,true);

    /* Save → render a real image file from the crop (the original File is never touched) */
    function save(){
      if(busy)return;busy=true;saveB.disabled=true;
      try{
        let sx=Math.max(0,(fr.x-tx)/s),sy=Math.max(0,(fr.y-ty)/s),sW=Math.min(iw-sx,fr.w/s),sH=Math.min(ih-sy,fr.h/s);
        let ow=Math.max(1,Math.round(sW)),oh=Math.max(1,Math.round(sH));
        const cap=Math.min(CAP,o.maxSide||CAP),m=Math.max(ow,oh);
        if(m>cap){const k=cap/m;ow=Math.max(1,Math.round(ow*k));oh=Math.max(1,Math.round(oh*k))}
        const cv=document.createElement('canvas');cv.width=ow;cv.height=oh;const cx=cv.getContext('2d');
        const png=file.type==='image/png',type=png?'image/png':'image/jpeg';
        if(!png){cx.fillStyle='#fff';cx.fillRect(0,0,ow,oh)}
        cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality='high';
        cx.drawImage(im,sx,sy,sW,sH,0,0,ow,oh);
        cv.toBlob(b=>{
          if(!b){busy=false;saveB.disabled=false;alert(tr('Could not save the edited image.'));return}
          const base=(file.name||'image').replace(/\.[^.]+$/,'')||'image';
          close(new File([b],base+(png?'.png':'.jpg'),{type,lastModified:Date.now()}));
        },type,0.92);
      }catch(err){busy=false;saveB.disabled=false;console.error(err);alert(tr('Could not save the edited image.'))}
    }
    saveB.onclick=save;
    $q('[data-ie=cancel]').onclick=()=>{if(!busy)close(null)};
    $q('[data-ie=reset]').onclick=()=>layout(o.preset&&PRESETS.some(p=>p[0]===o.preset)?o.preset:'orig');
    root.querySelector('.ie-presets').onclick=e=>{const b=e.target.closest('[data-p]');if(b)choose(b.dataset.p)};

    sw=stage.clientWidth;sh=stage.clientHeight;
    layout(preset);saveB.focus({preventScroll:true});
  });
}

/* Public entry point: edit a batch of selected files one by one. */
window.editImages=async function(files,opts={}){
  files=[...files||[]];let trimmed=0;
  if(opts.max!=null&&files.length>opts.max){trimmed=files.length-Math.max(0,opts.max);files=files.slice(0,Math.max(0,opts.max))}
  const editable=f=>f&&f.type&&f.type.startsWith('image/')&&f.type!=='image/gif';
  const total=files.filter(editable).length,out=[];let n=0;
  for(const f of files){
    if(!editable(f)){out.push(f);continue}
    const r=await editOne(f,opts,++n,total);
    if(r)out.push(r);
  }
  return{files:out,trimmed};
};
})();
