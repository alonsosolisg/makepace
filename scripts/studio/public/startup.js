// A per-tab visual snapshot: no network round trip before restoring the last view.
// It is inert while the real app reconnects. Never use it as authoritative data.
(()=>{
 const KEY='makepace-studio-frame-desk-v2';
 let frame=null;
 try{
  const saved=JSON.parse(sessionStorage.getItem(KEY)||'null');
  const researchId=JSON.parse(localStorage.getItem('makepace-new-workspace-brief')||'{}').researchId||null;
  if(saved&&saved.researchId===researchId&&saved.workspace===localStorage.getItem('makepace-workspace')&&
   Date.now()-saved.at<30*60*1000&&saved.width===innerWidth&&saved.height===innerHeight)frame=saved;
 }catch{}
 window.studioRestoreState=frame?.state||null;
 window.restoreStudioFrame=()=>{
  if(!frame)return;
  const host=document.createElement('div');host.id='studio-frame';host.inert=true;host.setAttribute('aria-hidden','true');
  host.style.cssText='position:fixed;inset:0;z-index:10001;overflow:hidden;background:#F5F2EB;pointer-events:none';
  const shadow=host.attachShadow({mode:'closed'});
  const style=document.createElement('style');style.textContent=frame.css;
  const html=document.createElement('html');html.className=frame.htmlClass;
  // DOMParser keeps cached markup inert; scripts and event attributes were stripped.
  const parsed=new DOMParser().parseFromString(frame.body,'text/html');
  const body=document.importNode(parsed.body,true);html.append(body);shadow.append(style,html);document.body.append(host);
  for(const element of shadow.querySelectorAll('[data-frame-scroll]')){
   const [left,top]=element.dataset.frameScroll.split(',').map(Number);
   element.scrollLeft=left;element.scrollTop=top;
  }
  html.style.cssText='display:block;height:100vh;overflow:auto';
  body.scrollTop=frame.scrollY;
  if(body.scrollTop!==frame.scrollY)html.scrollTop=frame.scrollY;
  document.documentElement.classList.add('has-studio-frame');
  performance.mark('studio-frame-restored');
 };
 window.releaseStudioFrame=()=>{
  document.getElementById('studio-frame')?.remove();
  document.documentElement.classList.remove('has-studio-frame');
 };
 function clean(root){
  root.querySelectorAll('script,#startup,#studio-frame').forEach(node=>node.remove());
  for(const node of root.querySelectorAll('*')){
   for(const attr of [...node.attributes])if(/^on/i.test(attr.name))node.removeAttribute(attr.name);
   if(node.tagName==='INPUT'&&node.type==='password')node.removeAttribute('value');
   if(node.tagName==='VIDEO'||node.tagName==='AUDIO')node.removeAttribute('autoplay');
  }
 }
 function capture(){
  if(!document.documentElement.classList.contains('app-ready'))return;
  try{
   const body=document.body.cloneNode(true);
   const original=[...document.body.querySelectorAll('*')],copies=[...body.querySelectorAll('*')];
   original.forEach((node,i)=>{
    const copy=copies[i];
    if(node.scrollTop||node.scrollLeft)copy.dataset.frameScroll=node.scrollLeft+','+node.scrollTop;
    if(node.tagName==='TEXTAREA')copy.textContent=node.value;
    if(node.tagName==='INPUT'&&node.type!=='password'){copy.setAttribute('value',node.value);copy.toggleAttribute('checked',node.checked);}
    if(node.tagName==='SELECT')[...copy.options].forEach((option,j)=>option.toggleAttribute('selected',node.options[j].selected));
    if(node.tagName==='IFRAME'){
     try{const child=node.contentDocument.documentElement.cloneNode(true);clean(child);copy.removeAttribute('src');copy.setAttribute('sandbox','');copy.srcdoc=child.outerHTML;}catch{copy.removeAttribute('src');}
    }
    if(node.tagName==='DIALOG'&&node.open){copy.style.cssText+=';position:fixed;inset:0;margin:auto;z-index:10002';}
   });
   if(document.querySelector('dialog[open]')){const backdrop=document.createElement('div');backdrop.style.cssText='position:fixed;inset:0;background:#233d3b38;z-index:10001';body.append(backdrop);}
   clean(body);
   const css=[...document.styleSheets].map(sheet=>{try{return [...sheet.cssRules].map(rule=>rule.cssText).join('\n');}catch{return '';}}).join('\n');
   sessionStorage.setItem(KEY,JSON.stringify({researchId:JSON.parse(localStorage.getItem('makepace-new-workspace-brief')||'{}').researchId||null,at:Date.now(),width:innerWidth,height:innerHeight,workspace:localStorage.getItem('makepace-workspace'),htmlClass:document.documentElement.className,body:body.outerHTML,css,scrollY,state:window.captureStudioState?.()}));
  }catch{/* Storage limits or disabled storage must never block the app. */}
 }
 addEventListener('pagehide',capture);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)capture();});
})();
