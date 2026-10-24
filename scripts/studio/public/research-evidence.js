const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
export function setupEvidence(getWorkspace){
 const host=document.querySelector('#research-view'),shelf=el('section',null,'evidence-shelf');host.append(shelf);
 let revision=0,workspace=null,signature=null;const cache=new Map();
 const empty=host.querySelector('.page-empty'),notice=el('p',null,'research-notice');notice.setAttribute('role','status');shelf.before(notice);
 function render(data,saved){
  saved=saved.filter(o=>o.path!=='research/content-format-research.json');
  const next=JSON.stringify({data,saved});if(next===signature)return;signature=next;
  const fragment=document.createDocumentFragment(),findings=data.findings||[];
  empty.hidden=!!(findings.length||saved.length);
  if(findings.length){
   const head=el('div',null,'research-results-heading');head.append(el('h2','Formats to explore'),el('p',findings.length+' format'+(findings.length===1?'':'s')+' · Original examples, audience fit and what to test next.'));fragment.append(head);
   for(const finding of findings){const card=el('article',null,'evidence-card');
    card.append(el('span',finding.status==='observed'?'Original-post observations':'Hypothesis · needs validation','evidence-status'),el('h3',finding.title),el('p',finding.summary,'evidence-summary'));
    const footer=el('footer'),count=(finding.examples||[]).length,open=el('button','Open research ↗');footer.append(el('span',count+' source'+(count===1?'':'s')),open);open.onclick=()=>document.dispatchEvent(new CustomEvent('makepace-open-research',{detail:{finding}}));card.append(footer);
    fragment.append(card);
   }
  }
  if(saved.length){fragment.append(el('h3','Research documents'));const grid=el('div',null,'research-document-grid');for(const o of saved){const b=el('button',null,'research-document-card');b.append(el('small','SAVED RESEARCH'),el('strong',o.title+' ↗'),el('span',o.description||'Open the saved report to review its findings, source links and limitations.'),el('small',o.path));b.onclick=()=>document.dispatchEvent(new CustomEvent('makepace-open-output',{detail:{id:o.id}}));grid.append(b);}fragment.append(grid);}
  if(findings.length||saved.length){const more=el('button','Explore more formats ↗');more.onclick=()=>document.querySelector('#research-workflow').click();fragment.append(more);}
  shelf.replaceChildren(fragment);
 }
 async function refresh(){
  const n=++revision,id=getWorkspace();
  if(workspace!==id){workspace=id;signature=null;notice.textContent='';let cached=cache.get(id);if(!cached)try{cached=JSON.parse(sessionStorage.getItem('makepace-research-v2:'+id)||'null');}catch{}
   if(cached)render(cached.data,cached.saved);else{empty.hidden=true;shelf.replaceChildren();notice.textContent='Loading saved research…';}
  }
  if(id==='new'){render({findings:[]},[]);notice.textContent='';return;}
  try{
   const responses=await Promise.all([fetch('/api/studio/research-evidence?workspaceId='+encodeURIComponent(id)),fetch('/api/studio/outputs?workspaceId='+encodeURIComponent(id))]);if(responses.some(r=>!r.ok))throw Error('Could not refresh research. Your previous results are still available.');
   const [data,outputData]=await Promise.all(responses.map(r=>r.json()));if(n!==revision)return;
   const saved=outputData.outputs.filter(o=>o.kind==='research'&&o.path!=='research/content-format-research.json');render(data,saved);notice.textContent='';cache.set(id,{data,saved});try{sessionStorage.setItem('makepace-research-v2:'+id,JSON.stringify({data,saved}));}catch{}
  }catch(e){if(n===revision)notice.textContent=signature?e.message:'Could not load research. Try refreshing.';}
 }
 document.addEventListener('makepace-view',e=>{if(e.detail.view==='research')void refresh();});
 const button=el('button','Refresh research','quiet-action');button.onclick=refresh;host.append(button);
}
