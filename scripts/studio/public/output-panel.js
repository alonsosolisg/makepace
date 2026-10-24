import {markdown} from './chat-timeline.js';
import {researchDocument} from './research-document.js';
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
function structured(value,depth=0){
 const box=el('div',undefined,'output-data');
 if(depth>5){box.textContent=JSON.stringify(value);return box;}
 if(Array.isArray(value)){for(const item of value.slice(0,100)){const section=el('section');section.append(structured(item,depth+1));box.append(section);}return box;}
 if(value&&typeof value==='object'){for(const [key,item] of Object.entries(value).slice(0,100)){box.append(el('h4',key.replaceAll('_',' ')),structured(item,depth+1));}return box;}
 if(typeof value==='string'&&/^https?:\/\//i.test(value)){const a=el('a',value);a.href=value;a.target='_blank';a.rel='noopener noreferrer';box.append(a);}else box.textContent=value==null?'Not available':String(value);return box;
}
export function setupOutputPanel(getWorkspace){
 const dock=document.querySelector('#artifact-dock'),empty=dock.querySelector('.dock-empty');
 const divider=el('div',undefined,'output-resizer');divider.tabIndex=0;divider.setAttribute('role','separator');divider.setAttribute('aria-label','Resize output panel');divider.setAttribute('aria-orientation','vertical');divider.title='Drag to resize · Double-click to reset';document.body.append(divider);
 let preferredWidth=440;try{const saved=Number(localStorage.getItem('makepace-output-width'));if(saved>=280&&Number.isFinite(saved))preferredWidth=saved;}catch{}
 const limits=()=>({min:Math.min(280,innerWidth-40),max:innerWidth<=850?Math.max(280,innerWidth-60):Math.max(280,innerWidth-(innerWidth<=1100?180+330:204+380))});
 function resize(width,persist=false){const {min,max}=limits(),value=Math.round(Math.max(min,Math.min(max,width)));document.body.style.setProperty('--output-width',value+'px');divider.setAttribute('aria-valuemin',String(min));divider.setAttribute('aria-valuemax',String(max));divider.setAttribute('aria-valuenow',String(value));if(persist){preferredWidth=value;try{localStorage.setItem('makepace-output-width',String(value));}catch{}}}
 resize(preferredWidth);addEventListener('resize',()=>resize(preferredWidth));
 divider.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();divider.setPointerCapture(e.pointerId);document.body.classList.add('resizing-output');};
 divider.onpointermove=e=>{if(divider.hasPointerCapture(e.pointerId))resize(innerWidth-e.clientX);};
 divider.onpointerup=e=>{if(divider.hasPointerCapture(e.pointerId)){resize(Number(divider.getAttribute('aria-valuenow')),true);divider.releasePointerCapture(e.pointerId);}document.body.classList.remove('resizing-output');};
 divider.onlostpointercapture=()=>document.body.classList.remove('resizing-output');
 divider.onpointercancel=()=>{document.body.classList.remove('resizing-output');resize(preferredWidth);};
 divider.ondblclick=()=>{preferredWidth=440;resize(440,true);};
 divider.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const {min,max}=limits(),current=Number(divider.getAttribute('aria-valuenow'));resize(e.key==='Home'?min:e.key==='End'?max:current+(e.key==='ArrowLeft'?24:-24),true);};
 const header=el('div',undefined,'output-panel-head'),hide=el('button','×');hide.setAttribute('aria-label','Hide output panel');header.append(el('strong','Workspace output'),hide);dock.prepend(header);
 const list=el('div',undefined,'output-list'),body=el('section',undefined,'output-preview');empty.after(list,body);
 const toggle=el('button',undefined,'output-toggle');toggle.title='Workspace outputs';toggle.setAttribute('aria-label','Toggle output panel');toggle.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/></svg>';document.querySelector('.chat-head').append(toggle);
 let collapsed=false;try{collapsed=localStorage.getItem('makepace-outputs-collapsed')==='true';}catch{}
 const setHidden=value=>{collapsed=value;if(!value&&document.body.classList.contains('chat-expanded'))document.querySelector('#expand-chat')?.click();document.body.classList.toggle('outputs-collapsed',value);toggle.setAttribute('aria-expanded',String(!value));try{localStorage.setItem('makepace-outputs-collapsed',String(value));}catch{}};
 setHidden(collapsed);hide.onclick=()=>setHidden(true);toggle.onclick=()=>setHidden(!collapsed);
 let workspace=null,outputs=[],selected=null,revision=0,opening=0;const seen=new Map();
 async function open(id){
  const n=++opening,w=getWorkspace();selected=id;setHidden(false);document.querySelector('#review').hidden=true;body.hidden=false;list.hidden=false;body.replaceChildren(el('p','Opening output…'));empty.hidden=true;
  const output=outputs.find(o=>o.id===id);if(!output){body.replaceChildren(el('p','This output version is no longer available.'));return;}
  try{
   const url='/api/studio/output?workspaceId='+encodeURIComponent(w)+'&id='+encodeURIComponent(id);
   let content;if(output.type==='image'){content=el('img');content.src=url;content.alt=output.title;}
   else{const response=await fetch(url);if(!response.ok)throw Error('Could not open this output version.');const data=await response.json();if(n!==opening||w!==getWorkspace())return;
    if(output.type==='preview'){content=el('iframe');content.title=output.title;content.setAttribute('sandbox','');content.referrerPolicy='no-referrer';content.srcdoc='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; font-src data:;">'+data.text;}
    else if(output.type==='data'){const dataObject=JSON.parse(data.text);if(Array.isArray(dataObject.findings)){content=el('div');dataObject.findings.forEach(f=>content.append(researchDocument(f)));}else content=structured(dataObject);}else content=markdown(data.text);
   }
   body.replaceChildren(el('h3',output.title),el('small',output.path),content);
  }catch(e){if(n===opening)body.replaceChildren(el('p',e.message));}
 }
 async function refresh(preferred){
  const n=++revision,w=getWorkspace();if(w==='new')return;
  if(workspace!==w){workspace=w;selected=null;outputs=[];opening++;body.replaceChildren();list.replaceChildren();empty.hidden=false;}
  try{const response=await fetch('/api/studio/outputs?workspaceId='+encodeURIComponent(w));if(!response.ok)throw Error('Could not load workspace outputs.');const data=await response.json();if(n!==revision||w!==getWorkspace())return;outputs=data.outputs;
   list.replaceChildren(...outputs.map(o=>{const b=el('button',o.title);b.onclick=()=>void open(o.id);return b;}));empty.hidden=outputs.length>0||selected==='research-detail';
   if(preferred)await open(preferred);else if(outputs.length&&!selected&&!collapsed&&document.querySelector('#review').hidden)await open(outputs.at(-1).id);
  }catch(e){if(n===revision)body.replaceChildren(el('p',e.message));}
 }
 document.addEventListener('makepace-open-output',e=>{document.querySelector('.nav[data-view="chat"]').click();void refresh(e.detail.id);});
 document.addEventListener('makepace-open-research',e=>{document.querySelector('.nav[data-view="chat"]').click();opening++;selected='research-detail';setHidden(false);document.querySelector('#review').hidden=true;empty.hidden=true;list.hidden=false;body.hidden=false;body.replaceChildren(researchDocument(e.detail.finding));});
 document.addEventListener('makepace-view',e=>{if(e.detail.view==='chat')void refresh();});
 document.addEventListener('makepace-conversation-output',e=>{const {key,messages}=e.detail,latest=messages.filter(m=>m.role==='output').at(-1)?.output?.id;const previous=seen.get(key);seen.set(key,latest||null);if(previous!==undefined&&latest&&latest!==previous)void refresh(latest);});
 document.addEventListener('makepace-review-post',()=>{setHidden(false);body.hidden=true;list.hidden=true;});
 document.querySelector('#close-review').addEventListener('click',()=>{body.hidden=false;list.hidden=false;});
}
