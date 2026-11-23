/* Optional: your own link-preview proxy (Cloudflare Worker, free tier). More reliable than a public API.
   Deploy, then set  LP_ENDPOINT  at the top of linkpreview.js to the worker URL.
   Returns {title,description,image,site,favicon,url} read from Open Graph / Twitter / <title> tags. */
const PRIVATE=/^(localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?|\[?f[cd])/i;
const CORS={'Access-Control-Allow-Origin':'*','Content-Type':'application/json','Cache-Control':'public, max-age=3600'};
export default {
  async fetch(req){
    const q=new URL(req.url).searchParams.get('url');let u;
    try{u=new URL(q)}catch(e){return new Response('{"error":"bad url"}',{status:400,headers:CORS})}
    if(!/^https?:$/.test(u.protocol)||PRIVATE.test(u.hostname))return new Response('{"error":"blocked"}',{status:400,headers:CORS});
    const r=await fetch(u.href,{redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)','Accept':'text/html'},cf:{cacheTtl:3600}});
    if(!(r.headers.get('content-type')||'').includes('html'))return new Response('{"error":"not html"}',{status:422,headers:CORS});
    const m={};let title='';
    await new HTMLRewriter()
      .on('meta',{element(e){const k=(e.getAttribute('property')||e.getAttribute('name')||'').toLowerCase(),v=e.getAttribute('content');if(k&&v&&!m[k])m[k]=v}})
      .on('title',{text(t){if(title.length<300)title+=t.text}})
      .on('link[rel~="icon"]',{element(e){if(!m.icon)m.icon=e.getAttribute('href')}})
      .transform(r).arrayBuffer();
    const abs=v=>{try{return v?new URL(v,r.url).href:''}catch(e){return''}};
    return new Response(JSON.stringify({
      title:m['og:title']||m['twitter:title']||title.trim(),
      description:m['og:description']||m['twitter:description']||m.description||'',
      image:abs(m['og:image']||m['twitter:image']),
      site:m['og:site_name']||u.hostname.replace(/^www\./,''),
      favicon:abs(m.icon||'/favicon.ico'),url:m['og:url']?abs(m['og:url']):r.url}),{headers:CORS});
  }
};
