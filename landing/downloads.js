const dialog=document.querySelector('#download-dialog'),host=document.querySelector('#download-options'),status=dialog.querySelector('[role=status]');
const platform=navigator.userAgentData?.platform||navigator.platform||navigator.userAgent;
const detected=/Win/i.test(platform)?'windows':/Mac/i.test(platform)?'macos':/Linux/i.test(platform)&&!/Android/i.test(navigator.userAgent)?'linux':null;
const variants=[['windows-x64','Windows','64-bit installer','windows'],['macos-arm64','macOS','Apple Silicon · M1 or newer','macos'],['macos-x64','macOS','Intel processor','macos'],['linux-x64','Linux','64-bit AppImage','linux']];
let loaded=false;
document.querySelector('#download-open').onclick=()=>{dialog.showModal();if(!loaded)void load();};
dialog.querySelector('.dialog-close').onclick=()=>dialog.close();
dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}};
if(['localhost','127.0.0.1','[::1]'].includes(location.hostname))document.querySelector('#local-studio').hidden=false;
async function load(){
 let release;try{const response=await fetch('/landing/releases.json',{cache:'no-store'});if(!response.ok)throw Error();release=await response.json();}catch{status.textContent='Could not check installers. Close and reopen to retry.';return;}
 host.replaceChildren();let available=0;
 for(const [id,name,detail,os] of [...variants].sort((a,b)=>Number(b[3]===detected)-Number(a[3]===detected))){
  const candidate=release.downloads?.[id];let url;try{if(typeof candidate==='string'&&candidate){const parsed=new URL(candidate,location.origin);if((parsed.protocol==='https:'||parsed.origin===location.origin)&&!parsed.username&&!parsed.password)url=parsed.href;}}catch{}
  const row=document.createElement(url?'a':'div');row.className='download-option';
  if(url){row.href=url;row.rel='noopener';available++;}else row.setAttribute('aria-disabled','true');
  const title=document.createElement('strong');title.textContent=name;
  const sub=document.createElement('small');sub.textContent=detail;
  const label=document.createElement('span');label.append(title,sub);
  const action=document.createElement('span');action.className='download-action';action.textContent=url?'Download ↗':'Coming soon';
  row.append(label,action);if(os===detected){row.classList.add('detected');const badge=document.createElement('em');badge.textContent='Your OS';title.append(badge);}
  host.append(row);
 }
 status.textContent=available?'Version '+release.version+' · Choose the processor that matches your computer.':'Installers are being prepared. Downloads will appear here once published.';loaded=true;
}
