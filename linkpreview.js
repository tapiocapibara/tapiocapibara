/* ---------- Link Preview ----------
   Paste a URL into a post → the page's title, description, image and site name are fetched and shown as a
   Facebook-style card (image on top, grey info bar below). The card is saved with the post (p.link), so it
   still shows offline and in backups.

   A browser cannot read other websites' HTML (CORS), so metadata comes from a service:
     1. LP_ENDPOINT  – your own proxy (see link-preview-worker.js). Called as  LP_ENDPOINT + '?url=' + encodeURIComponent(url)
                       and must return JSON {title,description,image,site,favicon,url}.
     2. Microlink    – free, CORS-enabled fallback used when LP_ENDPOINT is empty or fails (rate-limited free tier).
   Only http(s) URLs are ever used for links and images. */
const LP_ENDPOINT='';            /* e.g. 'https://link-preview.yourname.workers.dev/' */
const LP_TIMEOUT=9000;
const LP_URL_RE=/https?:\/\/[^\s<>"'`]+/gi;
const lpClean=u=>u.replace(/[.,;:!?'”’)\]}]+$/,'');
const lpHttp=u=>{try{const x=new URL(u);return(x.protocol==='http:'||x.protocol==='https:')?x.href:''}catch(e){return''}};
const lpHost=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return''}};
function lpFind(text){const m=String(text||'').match(LP_URL_RE);if(!m)return '';for(const r of m){const u=lpHttp(lpClean(r));if(u)return u}return ''}
function lpNorm(o,url){
  if(!o)return null;const s=(v,n)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,n):'';
  const r={url:lpHttp(o.url)||url,title:s(o.title,200),description:s(o.description,400),image:lpHttp(typeof o.image==='object'&&o.image?o.image.url:o.image),
    site:s(o.site||o.publisher,80),favicon:lpHttp(typeof o.logo==='object'&&o.logo?o.logo.url:(o.favicon||o.logo))};
  if(!r.site)r.site=lpHost(r.url);
  return(r.title||r.description||r.image)?r:null;
}
const lpCache=new Map();
async function lpFetch(url){
  if(lpCache.has(url))return lpCache.get(url);
  const ask=async api=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),LP_TIMEOUT);
    try{const r=await fetch(api,{signal:c.signal});if(!r.ok)return null;return await r.json()}catch(e){return null}finally{clearTimeout(t)}};
  let out=null;
  if(LP_ENDPOINT)out=lpNorm(await ask(LP_ENDPOINT+(LP_ENDPOINT.includes('?')?'&':'?')+'url='+encodeURIComponent(url)),url);
  if(!out){const j=await ask('https://api.microlink.io/?url='+encodeURIComponent(url));if(j&&j.status==='success')out=lpNorm({...j.data,site:j.data.publisher},url)}
  if(out)lpCache.set(url,out);
  return out;
}

/* Facebook-style card. `rm` adds a remove (×) button (composer / edit mode). */
function linkCard(l,rm){
  if(!l||!lpHttp(l.url))return '';
  const host=esc(lpHost(l.url)),site=esc(l.site||lpHost(l.url)).toUpperCase();
  const img=l.image?`<div class="lp-img"><img src="${esc(l.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></div>`:'';
  const x=rm?`<button type="button" class="lp-x" data-lprm="${rm}" aria-label="${esc(tr('Remove link preview'))}" title="${esc(tr('Remove link preview'))}">×</button>`:'';
  return `<div class="lp-wrap mt-2">${x}<a class="lp" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer nofollow">${img}<div class="lp-info"><div class="lp-site">${site}</div>${l.title?`<div class="lp-title">${esc(l.title)}</div>`:''}${l.description?`<div class="lp-desc">${esc(l.description)}</div>`:''}</div></a></div>`;
}
const lpLoading=()=>`<div class="lp-wrap mt-2"><div class="lp lp-load" role="status"><div class="lp-img"></div><div class="lp-info"><div class="lp-site">${esc(tr('Loading preview…'))}</div></div></div></div>`;

/* Make URLs in post text clickable (mentions still work in the text around them) */
function lpRich(text,plain){
  let out='',last=0,m;LP_URL_RE.lastIndex=0;
  while((m=LP_URL_RE.exec(text))){
    const raw=lpClean(m[0]),u=lpHttp(raw);if(!u)continue;
    out+=plain(text.slice(last,m.index))+`<a class="lp-link" href="${esc(u)}" target="_blank" rel="noopener noreferrer nofollow">${esc(raw)}</a>`;
    last=m.index+raw.length;LP_URL_RE.lastIndex=last;
  }
  return out+plain(text.slice(last));
}

/* Composer: detect a pasted/typed URL, fetch, show the card under the text box */
let lpTimer=0,lpSeq=0;
function lpDraw(loading){const el=document.querySelector('#lprev');if(el)el.innerHTML=loading?lpLoading():linkCard(draft.link,'main')}
function lpWatch(){clearTimeout(lpTimer);lpTimer=setTimeout(lpCheck,450)}
async function lpCheck(){
  const t=document.querySelector('#txt');if(!t)return;
  const u=lpFind(t.value),seq=++lpSeq;
  if(!u){draft.link=null;draft.lpOff='';lpDraw();return}
  if(draft.lpOff===u){draft.link=null;lpDraw();return}
  if(draft.link&&draft.link.url===u){lpDraw();return}
  draft.link=null;lpDraw(true);
  const l=await lpFetch(u);
  if(seq!==lpSeq)return;                         /* text changed meanwhile */
  draft.link=l;lpDraw();
}
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-lprm]');if(!b)return;
  e.preventDefault();e.stopPropagation();
  if(b.dataset.lprm==='main'){draft.lpOff=draft.link?draft.link.url:lpFind(document.querySelector('#txt').value);draft.link=null;lpSeq++;lpDraw()}
  else if(typeof ed!=='undefined'&&ed){ed.link=null;renderAll()}
},true);

/* Styles (theme-aware through the app's CSS variables) */
(()=>{const s=document.createElement('style');s.textContent=`
.lp-wrap{position:relative;max-width:560px}
.lp{display:block;overflow:hidden;border:1px solid var(--line);border-radius:14px;background:var(--card);color:var(--ink);text-decoration:none}
a.lp:hover .lp-info{background:rgba(var(--brand-rgb),.08)}
.lp-img{aspect-ratio:1.91/1;background:rgba(127,127,127,.15);overflow:hidden}
.lp-img img{display:block;width:100%;height:100%;object-fit:cover}
.lp-info{padding:.55rem .8rem .7rem;border-top:1px solid var(--line);background:rgba(127,127,127,.08);min-width:0}
.lp-img:empty+.lp-info,.lp>.lp-info:first-child{border-top:0}
.lp-site{font-size:.72rem;letter-spacing:.02em;color:var(--mute);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lp-title{margin-top:.1rem;font-weight:700;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.lp-desc{margin-top:.1rem;font-size:.88rem;color:var(--mute);line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.lp-x{position:absolute;right:.45rem;top:.45rem;z-index:2;width:28px;height:28px;border-radius:999px;background:rgba(0,0,0,.65);color:#fff;font-size:1.2rem;line-height:1}
.lp-load .lp-img{animation:lpp 1.2s ease-in-out infinite}@keyframes lpp{50%{opacity:.5}}
@media (prefers-reduced-motion:reduce){.lp-load .lp-img{animation:none}}
.lp-link{color:var(--brand);text-decoration:underline;overflow-wrap:anywhere}
`;document.head.appendChild(s)})();
