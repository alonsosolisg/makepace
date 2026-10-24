import {safeURL} from './research.mjs';
const cache=new Map();
export async function savedFavicon(website){
 try{
  const {icons}=await favicon(website);
  for(const icon of icons){
   try{
    let url=await safeURL(icon);
    for(let hop=0;hop<5;hop++){
     const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(4000)});
     if(response.status>=300&&response.status<400&&response.headers.get('location')){await response.body?.cancel();url=await safeURL(new URL(response.headers.get('location'),url).href);continue;}
     const type=response.headers.get('content-type')?.split(';')[0];
     if(!response.ok||!['image/png','image/jpeg','image/webp','image/x-icon','image/vnd.microsoft.icon'].includes(type)){await response.body?.cancel();break;}
     const chunks=[];let size=0;
     for await(const chunk of response.body){size+=chunk.length;if(size>131072)throw Error('Icon too large');chunks.push(chunk);}
     if(size)return 'data:'+type+';base64,'+Buffer.concat(chunks).toString('base64');
     break;
    }
   }catch{}
  }
 }catch{}
 return null;
}
export function iconLinks(html,base){
 const icons=[];
 for(const tag of html.match(/<link\b[^>]*>/gi)||[]){
  const attrs={};for(const m of tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[m[1].toLowerCase()]=m[2]??m[3]??m[4];
  if(!/(?:^|\s)(?:icon|apple-touch-icon)(?:\s|$)/i.test(attrs.rel||'')||!attrs.href)continue;
  try{const u=new URL(attrs.href.replace(/&amp;/g,'&'),base);if(['https:','http:'].includes(u.protocol))icons.push(u.href);}catch{}
 }
 return [...new Set([...icons,new URL('/favicon.ico',base).href])].slice(0,6);
}
export async function favicon(website){
 let url=await safeURL(website);const key=url.href;
 const saved=cache.get(key);if(saved&&saved.until>Date.now())return saved.value;
 const signal=AbortSignal.timeout(6000);
 for(let i=0;i<5;i++){
  const response=await fetch(url,{redirect:'manual',signal,headers:{Accept:'text/html'}});
  if(response.status>=300&&response.status<400&&response.headers.get('location')){await response.body?.cancel();url=await safeURL(new URL(response.headers.get('location'),url).href);continue;}
  if(!response.ok)throw Error('Website unavailable');
  let html='',size=0;const reader=response.body.getReader(),decoder=new TextDecoder();
  try{while(size<200000){const {done,value}=await reader.read();if(done)break;size+=value.length;html+=decoder.decode(value,{stream:true});if(/<\/head>/i.test(html))break;}}finally{await reader.cancel();}
  const value={icons:iconLinks(html,url.href)};
  if(cache.size>=150)cache.delete(cache.keys().next().value);
  cache.set(key,{value,until:Date.now()+900000});return value;
 }
 throw Error('Too many redirects');
}
