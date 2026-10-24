import {customSelect} from './select.js';
import './desktop-shell.js';
import {renderTimeline} from './chat-timeline.js';
import {conversationMenu} from './conversation-menu.js';
import {setupWorkspace,emptyWorkspace} from './workspace.js';
import {onboardingReady} from './onboarding.js';
import {modelControl,modelControlsReady} from './model-control.js';
import {setupInstall} from './install.js';
import {connectProvider} from './provider-connect.js';
import {setupDesk} from './desk.js';
import {publishingView} from './publishing.js';
let workspace='hey-mom';
const $=s=>document.querySelector(s);let batch='',posts=[],selected=null,state={reviews:{},conversations:{}},view='chat',loadVersion=0;
let conversationId='';
const conversationBase=()=>workspace==='hey-mom'?batch:'workspace:'+workspace;
const conversationKey=()=>conversationBase()+(conversationId?':'+conversationId:'');
const desk=setupDesk({navigate:showView,compose:text=>{void showView('chat');$('#prompt').value=text;$('#prompt').dispatchEvent(new Event('input'));$('#prompt').focus();},getWorkspace:()=>workspace,notify:toast});
// Keep one conversation mounted while changing its available working space.
const panel=$('.chat'),handle=document.createElement('div'),expand=document.createElement('button');
handle.className='chat-resizer';handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label','Resize conversation');
panel.prepend(handle);
expand.id='expand-chat';expand.type='button';expand.textContent='⤢';expand.setAttribute('aria-label','Expand conversation');expand.title='Expand conversation';expand.setAttribute('aria-expanded','false');
const chatTools=document.createElement('div');chatTools.className='chat-tools';$('#connect').before(chatTools);chatTools.append($('#connect'),expand);
const modelOptions=document.createElement('div');$('#composer>div').insertBefore(modelOptions,$('#stop'));modelControl(modelOptions);
$('#composer>div>small').remove();
$('#send').setAttribute('aria-label','Send message');$('#send span').hidden=true;
const sizePrompt=()=>{$('#prompt').style.height='auto';$('#prompt').style.height=Math.min(200,$('#prompt').scrollHeight)+'px';};
$('#prompt').addEventListener('input',sizePrompt);
$('#prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)&&!e.isComposing){e.preventDefault();$('#composer').requestSubmit();}});
let preferredWidth=350;
try{preferredWidth=Number(localStorage.getItem('makepace-chat-width'))||350;}catch{}
function resizeChat(width,persist=false){
 const max=Math.max(300,innerWidth-(innerWidth>1100?218:65)-350);
 const value=Math.round(Math.max(300,Math.min(max,width)));
 document.body.style.setProperty('--chat-width',value+'px');
 handle.setAttribute('aria-valuemin','300');handle.setAttribute('aria-valuemax',String(max));handle.setAttribute('aria-valuenow',String(value));
 if(persist){preferredWidth=value;try{localStorage.setItem('makepace-chat-width',String(value));}catch{}}
}
resizeChat(preferredWidth);addEventListener('resize',()=>resizeChat(preferredWidth));
handle.onpointerdown=e=>{if(e.button!==0)return;handle.setPointerCapture(e.pointerId);document.body.classList.add('resizing-chat');};
handle.onpointermove=e=>{if(handle.hasPointerCapture(e.pointerId))resizeChat(innerWidth-e.clientX,true);};
const finishResize=()=>document.body.classList.remove('resizing-chat');
handle.onpointerup=e=>{if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);finishResize();};handle.onpointercancel=finishResize;handle.onlostpointercapture=finishResize;
handle.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const current=Number(handle.getAttribute('aria-valuenow'));resizeChat(e.key==='Home'?300:e.key==='End'?innerWidth:current+(e.key==='ArrowLeft'?24:-24),true);};
function expandChat(full){document.body.classList.toggle('chat-expanded',full);expand.textContent=full?'⤡':'⤢';expand.title=full?'Restore panel':'Expand conversation';expand.setAttribute('aria-label',expand.title);expand.setAttribute('aria-expanded',String(full));document.querySelector('.sidebar').inert=full;document.querySelector('main').inert=full;}
expand.onclick=()=>expandChat(!document.body.classList.contains('chat-expanded'));
addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('chat-expanded')){expandChat(false);expand.focus();}});
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
async function api(endpoint,data){const r=await fetch('/api/studio/'+endpoint,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw Error(j.error||'Request failed');return j;}
function toast(text){$('#toast').textContent=text;$('#toast').style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>$('#toast').style.display='none',5000);}
const asset=p=>new URL(p,location.origin+`/batches/${batch}/`).href;
let gridSignature='';
function grid(){if(workspace!=='hey-mom')return;const signature=JSON.stringify([batch,posts,state.reviews]);if(signature===gridSignature)return;gridSignature=signature;const fragment=document.createDocumentFragment();let approved=0;for(const p of posts){const review=state.reviews[batch+':'+p.id];if(review?.status==='approved')approved++;const c=node('button',undefined,'card');const t=node('div',undefined,'thumb'),img=new Image();img.src=asset(p.images?.[0]||'');img.alt=p.title||p.id;img.loading='lazy';t.append(img,node('span',review?.status==='approved'?'✓ Approved':review?.status==='revise'?'Revision':`${p.images?.length||1} ${p.videoFile?'video':'slides'}`,'badge'));c.append(t,node('strong',`${p.id} · ${p.title||p.slug}`),node('small',p.format));c.onclick=()=>reviewPost(p.id);fragment.append(c);}$('#grid').replaceChildren(fragment);$('#review-count').textContent=`${approved} / ${posts.length} reviewed`;}
async function loadBatch(id){const version=++loadVersion;batch=id;$('#review').hidden=true;selected=null;const r=await fetch(`/batches/${id}/manifest.json`);if(!r.ok)throw Error('Batch unavailable');const m=await r.json();if(version!==loadVersion||workspace!=='hey-mom')return;posts=m.posts;$('#count').textContent=posts.length+' posts';$('#context').textContent=id;grid();chat();if(view==='feed')feed();}
function reviewPost(id){void showView('chat');document.dispatchEvent(new Event('makepace-review-post'));selected=posts.find(p=>p.id===id);$('#review').hidden=false;$('#review-title').textContent=`${selected.id} · ${selected.title}`;$('#slides').replaceChildren(...(selected.images||[]).map(src=>{const i=new Image();i.src=asset(src);i.alt='Slide';return i;}));$('#note').value=state.reviews[batch+':'+id]?.note||'';$('#context').textContent=`Post ${id} · ${selected.title}`;}
function feed(){const p=selected?`#post-${selected.id}`:'';$('#feed').src=`/feed?batch=${batch}&embed=1${p}`;}
async function showView(name){
 view=name;document.body.classList.toggle('desk-chat',name==='chat'&&workspace!=='new');
 document.body.dataset.pageView=name;
 const pageTitle={chat:'Create',batch:'Content',research:'Research',feed:'Feed test',formats:'Format library',workflows:'Workflows',queue:'Publishing',settings:'Settings'}[name]||'Workspace';
 document.dispatchEvent(new CustomEvent('makepace-view',{detail:{title:pageTitle,workspace:$('#workspace')?.selectedOptions[0]?.textContent||'Workspace',view:name}}));
 $('#review').hidden=true;$('#feed').src='about:blank';
 document.querySelectorAll('.view').forEach(x=>x.hidden=workspace==='new'||x.id!==name+'-view');
 if($('#empty-workspace'))$('#empty-workspace').hidden=true;
 document.querySelector('main>header').hidden=true;
 $('.batchbar').hidden=workspace!=='hey-mom'||name!=='batch';
 document.querySelectorAll('.nav').forEach(x=>{x.classList.toggle('active',x.dataset.view===name);if(x.dataset.view===name)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');});
 if(workspace==='new'){await emptyWorkspace('batch');return;}
 if(name==='queue'){publishingView({workspace,compose:text=>document.dispatchEvent(new CustomEvent('makepace-compose',{detail:text})),settings:()=>showView('settings')});return;}
 if(name==='settings'){await desk.settings();return;}
 if(['chat','research','workflows'].includes(name))return;
 if(workspace!=='hey-mom'){document.querySelectorAll('.view').forEach(x=>x.hidden=true);await emptyWorkspace(name);return;}
 if(name==='feed')feed();if(name==='formats')await formats();if(name==='queue')await queue();
}
async function formats(){const f=await api('formats');$('#formats').replaceChildren(...f.families.map(x=>{const a=node('article',undefined,'format');a.append(node('h3',x.name),node('p',x.pattern||x.description||''));return a;}));}
async function queue(){$('#queue').textContent='Reading OneUp…';try{const rows=await api('queue');const out=document.createDocumentFragment();let last='';for(const r of rows.sort((a,b)=>a.time.localeCompare(b.time))){const day=r.time.slice(0,10);if(day!==last){out.append(node('h3',day,'queue-day'));last=day;}const row=node('div',undefined,'queue-row');row.append(node('time',r.time.slice(11,16)),node('span',r.caption));out.append(row);}$('#queue').replaceChildren(out);if(!rows.length)$('#queue').textContent='No queued TikTok posts.';}catch(e){$('#queue').textContent=e.message;}}
function chat(){
 document.documentElement.dataset.codexConnected=String(Boolean(state.connected));
 document.dispatchEvent(new CustomEvent('makepace-connection',{detail:{connected:state.connected,status:state.connectionStatus}}));
 $('#connection').textContent=state.connected?`Codex · ${state.accountType==='chatgpt'?'ChatGPT connected':'connected'}`:state.connectionStatus==='reconnecting'?'Codex · reconnecting…':state.connectionStatus==='sign-in-required'?'Codex · sign-in required':'Codex · not connected';$('#connect').textContent=state.connected?'Connected':'Connect';$('#connect').disabled=Boolean(state.connected);$('#connect').hidden=Boolean(state.connected);
 if(workspace==='new'){$('#messages').innerHTML='<div class="welcome"><h2>Let’s start with you.</h2><p>Finish setting up your workspace to start creating together.</p></div>';$('#send').disabled=true;$('#prompt').disabled=true;$('#stop').hidden=true;$('#requests').replaceChildren();return;}
 const key=conversationKey();
 const history=$('#conversation-history');history.replaceChildren();
 for(const [id,c] of Object.entries(state.conversations).filter(([id])=>id===conversationBase()||id.startsWith(conversationBase()+':')).reverse()){
  const title=c.title||c.messages?.find(m=>m.role==='user')?.text||'Conversation';const row=node('div',undefined,'conversation-row');row.dataset.search=(title+'\n'+(c.messages||[]).filter(m=>['user','assistant'].includes(m.role)).map(m=>m.text||'').join('\n')).toLocaleLowerCase();
  const b=node('button',title.slice(0,48));b.title=title;b.className='conversation-open';b.classList.toggle('active',id===key);b.onclick=()=>{conversationId=id===conversationBase()?'':id.slice(conversationBase().length+1);chat();void showView('chat');};
  const more=node('button','⋯','conversation-more');more.setAttribute('aria-label','Options for '+title);more.setAttribute('aria-haspopup','menu');
  const scope=workspace==='hey-mom'?{batch}:{workspaceId:workspace};
  const options=()=>conversationMenu(more,{title,rename:async title=>{await api('conversation-edit',{...scope,id,action:'rename',title});if(state.conversations[id])state.conversations[id].title=title.trim();chat();},remove:async()=>{await api('conversation-edit',{...scope,id,action:'delete'});delete state.conversations[id];if(id===conversationKey())conversationId=crypto.randomUUID();chat();}});
  more.onclick=options;row.oncontextmenu=e=>{e.preventDefault();options();};row.append(b,more);history.append(row);
 }
 document.dispatchEvent(new Event('makepace-history-updated'));
 $('#conversation-title').textContent=state.conversations[key]?.title||state.conversations[key]?.messages?.find(m=>m.role==='user')?.text.slice(0,52)||'New conversation';
 if(workspace!=='hey-mom')$('#context').textContent=$('#workspace').selectedOptions[0].textContent;
 $('#prompt').disabled=false;$('#prompt').placeholder='What should we make or improve?';
 const messages=state.conversations[key]?.messages||[];if(messages.length)renderTimeline($('#messages'),messages,state.active?.batch===key?state.active:null,key);else{desk.welcome();document.querySelector('.jump-latest')?.remove();}
 document.dispatchEvent(new CustomEvent('makepace-conversation-output',{detail:{key,messages}}));
 $('#activity').textContent=state.active&&state.active.batch!==key?'Working in another conversation…':'';$('#send').disabled=Boolean(state.active)||!state.connected;$('#stop').hidden=!state.active;
 $('#requests').replaceChildren(...(state.requests||[]).map(r=>{const e=node('section',undefined,'request');e.append(node('strong',r.reason||'Codex needs your input'));if(r.command)e.append(node('pre',r.command));if(r.questions){const inputs={};for(const q of r.questions){e.append(node('p',q.question));const input=node('input');input.placeholder=(q.options||[]).map(x=>x.label).join(' / ');e.append(input);inputs[q.id]=input;}const b=node('button','Send answer');b.onclick=()=>api('answer',{id:r.id,answers:Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.value]))}).catch(x=>toast(x.message));e.append(b);}else for(const decision of ['accept','decline']){const b=node('button',decision==='accept'?'Approve once':'Decline');b.onclick=()=>api('answer',{id:r.id,decision}).catch(x=>toast(x.message));e.append(b);}return e;}));
}
async function send(text){if(workspace==='new')throw Error('Finish setting up your workspace first.');await api('message',workspace==='hey-mom'?{batch,postId:selected?.id,text,conversationId}:{workspaceId:workspace,text,conversationId});$('#prompt').value='';}
$('#new-conversation').onclick=()=>{conversationId=crypto.randomUUID();selected=null;$('#prompt').value='';chat();void showView('chat');};
document.addEventListener('makepace-compose',e=>{void showView('chat');$('#prompt').value=e.detail;$('#prompt').dispatchEvent(new Event('input'));$('#prompt').focus();});
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>showView(b.dataset.view).catch(e=>toast(e.message)));
$('#batch').onchange=e=>loadBatch(e.target.value).catch(e=>toast(e.message));$('#close-review').onclick=()=>$('#review').hidden=true;
for(const [id,status] of [['approve','approved'],['revise','revise']])$('#'+id).onclick=async()=>{try{await api('review',{batch,postId:selected.id,status,note:$('#note').value});toast('Creative review saved');}catch(e){toast(e.message);}};
$('#ask-revision').onclick=()=>{if(!$('#note').value.trim()){toast('Add a revision note first');return;}$('#prompt').value=`Revise post ${selected.id}: ${$('#note').value}. Render the changed slides and keep the scheduled version unchanged.`;$('#review').hidden=true;$('#prompt').focus();};
$('#new-batch').onclick=()=>{void showView('workflows');};
$('#connect').onclick=async()=>{try{$('#connect').disabled=true;$('#connect').textContent='Connecting…';$('#connection').textContent='Connecting to Codex…';$('#connection').removeAttribute('title');const result=await connectProvider();state={...state,...result};chat();}catch(e){$('#connect').disabled=false;$('#connect').textContent='Retry connection';$('#connection').textContent=e.message;$('#connection').title=e.message;toast(e.message);}};
$('#composer').onsubmit=async e=>{e.preventDefault();const text=$('#prompt').value.trim();if(!text)return;try{$('#send').disabled=true;await send(text);}catch(e){toast(e.message);chat();}};
$('#stop').onclick=()=>api('stop',{}).catch(e=>toast(e.message));
$('#refresh').onclick=()=>{if(view==='queue')queue();else loadBatch(batch).catch(e=>toast(e.message));};
addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==$('#feed').contentWindow||e.data?.type!=='studio-post')return;selected=posts.find(p=>p.id===e.data.postId);if(selected)$('#context').textContent=`Post ${selected.id} · ${selected.title}`;});
async function switchWorkspace(id){workspace=id;conversationId='';loadVersion++;selected=null;$('#review').hidden=true;$('#prompt').value='';const name=$('#workspace').selectedOptions[0]?.textContent||'Workspace';document.title='MakePace · '+name;$('.eyebrow').textContent=id==='new'?'NEW WORKSPACE / GETTING STARTED':name.toUpperCase()+' / CONTENT WORKSPACE';$('#title').textContent=id==='new'?'Your next good batch starts here.':'Ahead looks good.';$('.batchbar').hidden=id!=='hey-mom';$('#refresh').hidden=id!=='hey-mom';if($('#empty-workspace'))$('#empty-workspace').hidden=id==='hey-mom';chat();if(id==='hey-mom')await loadBatch($('#batch').value);await showView(id==='new'?'batch':'chat');}
try{
 const [d,initialState]=await Promise.all([fetch('/__batches').then(r=>{if(!r.ok)throw Error('Could not load workspaces');return r.json();}),api('state')]);
 state=initialState;
 $('#batch').replaceChildren(...d.batches.map(b=>new Option(b.id.replace(/^hm-/,'').replace(/-2026-.*/,''),b.id)));
 const restored=window.studioRestoreState;
 $('#batch').value=d.batches.some(b=>b.id===restored?.batch)?restored.batch:d.current;
 document.querySelectorAll('select').forEach(customSelect);
 await setupWorkspace(switchWorkspace,d.batches.length>0);
 await onboardingReady;
 if(restored){
  if(restored.postId)selected=posts.find(post=>post.id===restored.postId)||null;
  conversationId=restored.conversationId||'';chat();
  if(['chat','batch','research','workflows','settings','feed','formats','queue'].includes(restored.view))await showView(restored.view);
  if(restored.reviewOpen&&posts.some(post=>post.id===restored.postId))reviewPost(restored.postId);
  if(restored.expanded)expandChat(true);
  for(const [selector,value] of Object.entries(restored.fields||{})){
   const input=document.querySelector(selector);if(input&&typeof value==='string')input.value=value;
  }
  for(const [selector,top] of Object.entries(restored.scrolls||{})){const element=document.querySelector(selector);if(element)element.scrollTop=top;}
  window.scrollTo(0,restored.scrollY||0);
  if(restored.openSelect)document.querySelector('[aria-controls="'+CSS.escape(restored.openSelect)+'"]')?.click();
 }
 // Hold the first paint until the selected workspace and its visible assets settle.
 const visibleImages=[...document.images].filter(image=>{
  const rect=image.getBoundingClientRect();
  return rect.width>0&&rect.height>0&&rect.top<innerHeight&&rect.bottom>0;
 });
 for(const image of visibleImages)image.loading='eager';
 await Promise.race([
  Promise.allSettled([
   ...[400,500,600,700,750].map(weight=>document.fonts.load(weight+' 13px Manrope')),
   ...visibleImages.map(image=>image.decode()),
   ...modelControlsReady
  ]),
  new Promise(resolve=>setTimeout(resolve,5000))
 ]);
 const events=new EventSource('/api/studio/events');
 events.onmessage=e=>{const next=JSON.parse(e.data);if(JSON.stringify(next)===JSON.stringify(state))return;state=next;chat();grid();};
 events.onerror=()=>{$('#connection').textContent='Reconnecting to MakePace…';};
 setupInstall();
 document.documentElement.classList.add('app-ready');
 window.releaseStudioFrame?.();
 performance.mark('studio-ready');
 window.captureStudioState=()=>({
  batch,view,conversationId,postId:selected?.id,reviewOpen:!$('#review').hidden,
  expanded:document.body.classList.contains('chat-expanded'),
  knowledgeReview:!!document.querySelector('#knowledge-form'),
  openSelect:document.querySelector('.select-trigger[aria-expanded=true]')?.getAttribute('aria-controls'),
  fields:Object.fromEntries(['#prompt','#note','#knowledge-form [name=name]','#knowledge-form [name=offering]','#knowledge-form [name=audience]','#knowledge-form [name=positioning]','#knowledge-form [name=socials]'].map(selector=>[selector,document.querySelector(selector)?.value]).filter(([,value])=>value!==undefined)),
  scrolls:Object.fromEntries(['main','#messages','#slides','#review','.sidebar'].map(selector=>[selector,document.querySelector(selector)?.scrollTop||0])),
  scrollY
 });
}catch(e){
 window.releaseStudioFrame?.();
 document.documentElement.classList.add('app-failed');
 $('#startup-status').textContent='Could not open MakePace. '+e.message;
 $('#startup-retry').hidden=false;
}
