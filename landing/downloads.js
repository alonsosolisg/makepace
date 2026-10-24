import {osIcons} from './os-icons.js';
const dialog=document.querySelector('#download-dialog'),status=dialog.querySelector('[role=status]'),openButton=document.querySelector('#download-open');
const platform=navigator.userAgentData?.platform||navigator.platform||navigator.userAgent;
const detected=/Win/i.test(platform)?'windows':/Mac/i.test(platform)?'macos':/Linux/i.test(platform)&&!/Android/i.test(navigator.userAgent)?'linux':null;
for(const card of dialog.querySelectorAll('.os-card')){card.querySelector('.os-logo').innerHTML=osIcons[card.dataset.os];card.querySelector('.os-logo').setAttribute('aria-hidden','true');card.classList.toggle('detected',card.dataset.os===detected);}
let loaded=false,opening=false,closing=false;
// Resolve availability before opening, without rebuilding cards mid-animation.
let ready=load();
openButton.onclick=async()=>{
 if(opening||dialog.open)return;opening=true;openButton.setAttribute('aria-busy','true');
 await ready;await document.fonts.ready;
 dialog.classList.remove('closing');dialog.showModal();dialog.querySelector('h2').focus({preventScroll:true});
 opening=false;openButton.removeAttribute('aria-busy');
};
function close(){
 if(closing)return;closing=true;dialog.classList.add('closing');
 setTimeout(()=>{dialog.close();dialog.classList.remove('closing');closing=false;if(!loaded)ready=load();},matchMedia('(prefers-reduced-motion: reduce)').matches?0:160);
}
dialog.querySelector('.dialog-close').onclick=close;
dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}};
if(['localhost','127.0.0.1','[::1]'].includes(location.hostname))document.querySelector('#local-studio').hidden=false;
async function load(){
 let release;
 try{const response=await fetch('/landing/releases.json',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error();release=await response.json();loaded=true;}catch{status.hidden=false;status.textContent='Downloads unavailable. Try again shortly.';return;}
 let available=0;
 for(const link of dialog.querySelectorAll('[data-download]')){
  const candidate=release.downloads?.[link.dataset.download];let url;
  try{if(typeof candidate==='string'&&candidate){const parsed=new URL(candidate,location.origin);if((parsed.protocol==='https:'||parsed.origin===location.origin)&&!parsed.username&&!parsed.password)url=parsed.href;}}catch{}
  if(url){link.href=url;link.removeAttribute('aria-disabled');available++;}
  else{link.removeAttribute('href');link.setAttribute('aria-disabled','true');link.title='Coming soon';}
 }
 status.hidden=available>0;status.textContent=available?'':'Coming soon.';
}
