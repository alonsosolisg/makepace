import {customSelect} from './select.js';
import {onboarding} from './onboarding.js';
import {emptyArt} from './empty-art.js';

let workspaceRecords=new Map();
export const savedWorkspace=id=>workspaceRecords.get(id);

// A separate local onboarding draft; it never uses Hey Mom's chat or publishing API.
export async function setupWorkspace(onSwitch,hasCampaign=true) {
  const response=await fetch('/api/studio/workspaces');if(!response.ok)throw Error('Could not load workspaces');
  const records=await response.json(),workspaces=new Map(records.map(w=>[w.id,w]));
  workspaceRecords=workspaces;
  const card=document.querySelector('.workspace-card');
  card.innerHTML='<select id="workspace" aria-label="Workspace">'+(hasCampaign?'<option value="hey-mom">Hey Mom</option>':'')+'<option value="new">New workspace</option></select>';
  const select=card.querySelector('select');
  for(const w of records)select.add(new Option(w.name,w.id),select.options[select.options.length-1]);
  let saved='hey-mom';try{saved=localStorage.getItem('makepace-workspace')||saved;}catch{}
  select.value=[...select.options].some(o=>o.value===saved)?saved:(records[0]?.id|| (hasCampaign?'hey-mom':'new'));
  const workspaceAvatar=option=>{
    const icon=option?.value==='hey-mom'?'/__studio/hey-mom-icon.svg':workspaces.get(option?.value)?.favicon;
    const avatar=document.createElement(icon?'img':'span');
    avatar.className='workspace-avatar';
    if(avatar.tagName==='IMG'){avatar.src=icon;avatar.alt='';avatar.style.objectFit='contain';}
    else{avatar.textContent=option?.value==='new'?'+':(option?.textContent||'W').slice(0,1).toUpperCase();avatar.setAttribute('aria-hidden','true');}
    return avatar;
  };
  customSelect(select, (trigger, option)=>{
    const avatar=workspaceAvatar(option);
    const text=document.createElement('span');text.className='workspace-trigger-text';
    const label=document.createElement('small');label.textContent='Workspace';
    const name=document.createElement('span');name.textContent=option?.textContent||'Choose workspace';
    text.append(label,name);trigger.replaceChildren(avatar,text);
  },(item,option)=>{
    const label=document.createElement('span');label.className='workspace-option-label';label.textContent=option.textContent;
    item.append(workspaceAvatar(option),label);
  });
  let switching;
  select.onchange=()=>{
    document.body.classList.remove('onboarding-active');
    if(workspaces.has(select.value))localStorage.setItem('makepace-new-workspace-brief',JSON.stringify(workspaces.get(select.value)));
    else if(select.value==='new'){
      try{const draft=JSON.parse(localStorage.getItem('makepace-new-workspace-brief')||'{}');if(draft.onboardingComplete)localStorage.setItem('makepace-new-workspace-brief','{}');}catch{}
    }
    try{localStorage.setItem('makepace-workspace',select.value);}catch{}
    document.querySelector('[data-view="batch"] span').textContent='Content';
    document.querySelector('[data-view="batch"]').setAttribute('aria-label','Content');
    document.querySelector('#connect').hidden=select.value==='new';
    if(select.value==='new')document.querySelector('#connection').textContent='Starting brief · Local preview';
    switching=Promise.resolve(onSwitch(select.value));
    switching.catch(error=>{document.querySelector('#toast').textContent=error.message;document.querySelector('#toast').style.display='block';});
  };
  document.addEventListener('makepace-workspace-created',e=>{
    const w=e.detail;workspaces.set(w.id,w);
    let option=[...select.options].find(o=>o.value===w.id);
    if(!option){option=new Option(w.name,w.id);select.add(option,select.options[select.options.length-1]);}else option.textContent=w.name;
    select.value=w.id;select.dispatchEvent(new Event('change'));
  });
  select.dispatchEvent(new Event('change'));
  return switching;
}

export function emptyWorkspace(view) {
  let section=document.querySelector('#empty-workspace');
  if(!section){section=document.createElement('section');section.id='empty-workspace';document.querySelector('main').append(section);}
  section.hidden=false;
  const isNew=document.querySelector('#workspace').value==='new';
  if(isNew&&view==='batch'&&onboarding(section,()=>emptyWorkspace('batch')))return;
  const copy={
    batch:['Your next batch starts here.','Turn an idea into a set of posts. Start with a brief, then refine the copy and visuals together.'],
    formats:['Find your kind of content.','Research what works for your audience and keep the formats worth testing again.'],
    feed:['See it before they do.','Preview a finished batch in a feed. Start by planning the posts you want to test.'],
    queue:['Give your content a rhythm.','Build a posting plan around approved content. You review the dates and accounts before anything goes out.']
  };
  const [title,description]=copy[view]||copy.batch;
  section.innerHTML='<div class="page-empty">'+emptyArt(view)+'<h2></h2><p></p></div>';
  section.querySelector('h2').textContent=title;
  section.querySelector('p').textContent=description;
  const next={batch:['Plan my first batch','Help me plan my first content batch using this workspace’s audience and offering. Start with a brief and a few concrete angles for me to review.'],formats:['Find formats for my audience','Research proven content formats for our audience. Inspect original examples, save source links and separate observed performance from assumptions. Start with a shortlist for review.'],feed:['Create a batch to preview','Help me create a batch we can test in a social feed. Start with the audience, format choices and complete storyboards for review.'],queue:['Plan my publishing','Help me prepare a publishing plan. Check what content is approved and ask for the accounts, timezone and cadence that are missing. Do not schedule until I approve the exact plan.']}[view];
  const action=document.createElement('button');action.className='primary';action.textContent=next[0]+' ↗';action.onclick=()=>document.dispatchEvent(new CustomEvent('makepace-compose',{detail:next[1]}));section.firstChild.append(action);
  const hint=document.createElement('small');hint.textContent='Opens a starting prompt in chat. You can edit it before sending.';section.firstChild.append(hint);
}
