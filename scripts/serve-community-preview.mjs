import {createServer} from 'node:http';
import {createReadStream,watchFile} from 'node:fs';
import {stat,readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {studioAPI} from './studio/api.mjs';
import {closeCodexConnections} from './studio/codex.mjs';
import {appRoot,workspaceRoot,outputRoot} from './studio/paths.mjs';
const root=path.resolve(workspaceRoot,process.env.COMMUNITY_PREVIEW_ROOT||'social/carousels/output/hm-organizer-30-2026-10-23');
const port=Number(process.env.COMMUNITY_PREVIEW_PORT||4885),clients=new Set();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.pdf':'application/pdf','.mp4':'video/mp4','.m4a':'audio/mp4','.mp3':'audio/mpeg','.txt':'text/plain; charset=utf-8'};
const receipt=path.join(root,'render-receipt.json');let revision='initial';
const output=outputRoot,feed=path.join(appRoot,'scripts/feed-preview');
types['.css']='text/css; charset=utf-8';
types['.svg']='image/svg+xml';
types['.ttf']='font/ttf';
types['.webp']='image/webp';
types['.webmanifest']='application/manifest+json';
watchFile(receipt,{interval:700},s=>{revision=String(s.mtimeMs);for(const r of clients)r.write('event: revision\ndata: '+JSON.stringify({revision})+'\n\n')});
const server=createServer(async(req,res)=>{
 if(process.env.MAKEPACE_DESKTOP_TOKEN&&req.headers['x-makepace-desktop']!==process.env.MAKEPACE_DESKTOP_TOKEN){res.writeHead(403).end('Open MakePace desktop');return;}
 res.setHeader('Cache-Control','no-store');
 try{
  const url=new URL(req.url,'http://localhost');
  if(await studioAPI(req,res,url))return;
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  if(url.pathname==='/__batches'){
   const batches=[];
   for(const entry of await readdir(output,{withFileTypes:true}).catch(e=>{if(e.code==='ENOENT')return [];throw e;})){
    if(!entry.isDirectory())continue;
    try{const m=JSON.parse(await readFile(path.join(output,entry.name,'manifest.json')));if(Array.isArray(m.posts)&&m.posts.every(p=>p.images?.length||p.videoFile))batches.push({id:entry.name,count:m.posts.length});}catch{}
   }
   res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({current:path.basename(root),batches}));return;
  }
  if(url.pathname==='/__preview/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive'});clients.add(res);res.write('event: revision\ndata: '+JSON.stringify({revision})+'\n\n');req.on('close',()=>clients.delete(res));return;}
  let base=root,pathname=url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname);
  if(url.pathname==='/'||url.pathname.startsWith('/landing/')){base=path.join(appRoot,'landing');pathname=url.pathname==='/'?'/index.html':url.pathname.slice(8);}
  else if(pathname==='/feed'||pathname==='/feed/') {base=feed;pathname='/index.html';}
  else if(pathname==='/batch-preview'){pathname='/index.html';}
  else if(pathname==='/studio-sw.js'){base=path.join(appRoot,'scripts/studio/public');pathname='/studio-sw.js';res.setHeader('Service-Worker-Allowed','/studio');}
  else if(pathname==='/studio'||pathname==='/studio/'){base=path.join(appRoot,'scripts/studio/public');pathname='/index.html';}
  else if(pathname.startsWith('/__studio/')){base=path.join(appRoot,'scripts/studio/public');pathname=pathname.slice(9);}
  else if(pathname.startsWith('/__feed/')){base=feed;pathname=pathname.slice(7);}
  else if(pathname.startsWith('/batches/')){base=output;pathname=pathname.slice(8);}
  const file=path.resolve(base,'.'+pathname),relative=path.relative(base,file);
  if(relative.startsWith('..')||path.isAbsolute(relative)||!types[path.extname(file)]){res.writeHead(404).end();return;}
  const info=await stat(file);if(!info.isFile()){res.writeHead(404).end();return;}
  // Cache public landing assets; keep private state and campaign previews fresh.
  const landingAsset=(base===path.join(appRoot,'landing')&&path.extname(file)!=='.html')||
   (base===path.join(appRoot,'scripts/studio/public')&&['.ttf','.svg','.js','.css'].includes(path.extname(file)));
  if(landingAsset){
   const etag='"'+info.size.toString(16)+'-'+Math.trunc(info.mtimeMs).toString(16)+'"';
   res.setHeader('ETag',etag);
   res.setHeader('Cache-Control',['.css','.js'].includes(path.extname(file))?'public, no-cache':'public, max-age=3600');
   if(req.headers['if-none-match']===etag&&!req.headers.range){res.writeHead(304).end();return;}
  }
  const range=req.headers.range;let start=0,end=info.size-1,status=200;
  if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}if(m[1]){start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end;}else{start=Math.max(0,info.size-Number(m[2]));}if(start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);}
  res.writeHead(status,{'Content-Type':types[path.extname(file)],'Content-Length':end-start+1,'Accept-Ranges':'bytes'});if(req.method==='HEAD'){res.end();return;}createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
 }catch(e){res.writeHead(e.code==='ENOENT'?404:400).end('Not found');}
}).listen(port,'127.0.0.1',()=>{
 const actual=server.address().port;
 console.log(`Studio: http://localhost:${actual}/studio · Feed: http://localhost:${actual}/feed`);
 process.parentPort?.postMessage({type:'ready',port:actual});
});
function shutdown(){closeCodexConnections();server.close();setTimeout(()=>process.exit(0),200).unref();}
process.parentPort?.on('message',event=>{if(event.data?.type==='shutdown')shutdown();});
process.once('SIGTERM',shutdown);
