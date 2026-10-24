import {modelControl} from './model-control.js';
import {codexMark} from './provider-illustration.js';
import {emptyArt} from './empty-art.js';
import {setupEvidence} from './research-evidence.js';
import {setupOutputPanel} from './output-panel.js';
import {savedWorkspace} from './workspace.js';
export const workflows=[
 ['Find proven formats','Inspect original references, compare evidence, and save reusable visual recipes.','Research content formats for our saved audience. Start with our existing sources and ask for source accounts or links if needed. Inspect the originals, record URLs and observation dates, distinguish formats from angles, and do not invent missing metrics. Return a short evidence-backed shortlist before producing content.'],
 ['Choose angles','Turn audience moments and sales questions into a concrete experiment.','Use our saved audience, offer and product proof to propose concrete content angles. Make the first-slide hooks understandable without prior brand context. Separate format, angle and topic. Explain what we would learn from each test.'],
 ['Produce a batch','Write complete stories and create consistent, editable assets.','Plan a batch for this workspace using approved format recipes and current audience knowledge. Show the angles and complete storyboards first. When producing approved concepts, preserve image continuity, render exact text separately, use faithful product screens, and keep editable assets and revision history.'],
 ['Review the details','Check crops, readability, image continuity, and product claims.','Review the current content at full size and in platform crops. Check hooks, story payoff, typography, image anatomy and continuity, product accuracy, CTA visibility, music and disclosures. Report concrete issues per post and fix authorized local issues without altering already scheduled versions.'],
 ['Prepare publishing','Prepare exact slots and destinations for approval.','Prepare a publishing plan using approved asset versions, chosen accounts, timezone, music, disclosures and the existing queue. Ask for missing settings. Respect the workspace cadence. Show the exact plan for approval; do not publish or schedule without explicit authorization.'],
 ['Learn from results','Compare formats and angles at matched observation ages.','Analyze available results by format and angle separately. Include likes, comments and shares with appropriate denominators and matched observation ages. Show sample sizes, keep unavailable metrics unknown, inspect what comments actually say, and recommend the next controlled tests.']
];
const icon=name=>['magnifying-glass','layout','flow-arrow','gear-six'].includes(name)?`<span class="icon nav-mask" style="--icon:url('/__studio/icons/${name}.svg')" aria-hidden="true"></span>`:`<svg class="icon" aria-hidden="true"><use href="/__studio/phosphor.svg#${name}"></use></svg>`;
export function setupDesk({navigate,compose,getWorkspace,notify}){
 document.body.classList.add('desk');
 const pageBar=document.createElement('div');pageBar.className='web-page-heading page-heading';pageBar.innerHTML='<span></span><strong></strong>';document.querySelector('main').prepend(pageBar);
 document.addEventListener('makepace-view',e=>{pageBar.children[0].textContent=e.detail.workspace;pageBar.children[1].textContent=e.detail.title;});
 const nav=document.querySelector('.sidebar'),bottom=nav.querySelector('.sidebar-bottom');
 const entries=[['chat','pencil-simple','Create'],['research','magnifying-glass','Research'],['batch','squares-four','Content'],['feed','device-mobile','Feed test'],['formats','layout','Format library'],['workflows','flow-arrow','Workflows'],['queue','calendar-blank','Publishing'],['settings','gear-six','Settings']];
 nav.querySelectorAll('.nav').forEach(el=>el.remove());
 const fresh=document.createElement('button');fresh.id='new-conversation';fresh.innerHTML=`New conversation ${icon('plus')}`;nav.querySelector('.workspace-card').after(fresh);
 for(const [view,name,label] of entries){const button=document.createElement('button');button.className='nav';button.dataset.view=view;button.setAttribute('aria-label',label);button.title=label;button.innerHTML=`${icon(name)}<span>${label}</span>`;nav.insertBefore(button,bottom);}
 const conversations=document.createElement('section');conversations.className='sidebar-conversations';conversations.hidden=true;
 conversations.innerHTML='<div class="conversations-heading"><span>Conversations</span><button id="conversation-search-toggle" aria-label="Search conversations" aria-expanded="false" aria-controls="conversation-search-wrap">'+icon('magnifying-glass')+'</button></div><div id="conversation-search-wrap" hidden><input id="conversation-search" type="search" placeholder="Search conversations…" aria-label="Search conversations" autocomplete="off"></div><div id="conversation-history"></div><p id="conversation-search-empty" hidden>No conversations found.</p>';
 nav.insertBefore(conversations,bottom);
 bottom.replaceChildren(nav.querySelector('[data-view="settings"]'));
 const search=conversations.querySelector('input'),toggle=conversations.querySelector('#conversation-search-toggle'),searchWrap=conversations.querySelector('#conversation-search-wrap');
 function filterHistory(){
  const rows=conversations.querySelectorAll('#conversation-history .conversation-row');
  conversations.hidden=rows.length===0;
  if(!rows.length){search.value='';searchWrap.hidden=true;toggle.setAttribute('aria-expanded','false');}
  const query=search.value.trim().toLocaleLowerCase();let visible=0;
  for(const row of rows){row.hidden=!!query&&!row.dataset.search.includes(query);if(!row.hidden)visible++;}
  conversations.querySelector('#conversation-search-empty').hidden=!query||visible>0;
 }
 search.addEventListener('input',filterHistory);
 toggle.onclick=()=>{const open=searchWrap.hidden;searchWrap.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)search.focus();else{search.value='';filterHistory();}};
 search.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();search.value='';searchWrap.hidden=true;toggle.setAttribute('aria-expanded','false');filterHistory();toggle.focus();}};
 document.addEventListener('makepace-history-updated',filterHistory);
 document.addEventListener('makepace-view',e=>{if(conversations.dataset.workspace!==e.detail.workspace){search.value='';conversations.dataset.workspace=e.detail.workspace;filterHistory();}});
 const chat=document.querySelector('.chat');chat.querySelector('.chat-head strong').id='conversation-title';chat.querySelector('.chat-head strong').textContent='New conversation';
 const heading=chat.querySelector('.chat-head');heading.firstElementChild.classList.add('conversation-heading','page-heading');
 heading.firstElementChild.prepend(chat.querySelector('.context'));
 heading.append(chat.querySelector('#connection'));
 const review=document.querySelector('#review'),dock=document.createElement('aside');dock.id='artifact-dock';dock.innerHTML='<div class="dock-empty"><span class="dock-kicker">WORKSPACE OUTPUT</span>'+emptyArt('output')+'<h2>Ideas become posts.</h2><p>Once you have a batch, open a post here to review slides and ask for changes.</p><button id="browse-output">Browse content ↗</button></div>';dock.append(review);document.body.append(dock);
 dock.querySelector('#browse-output').onclick=()=>navigate('batch');
 setupOutputPanel(getWorkspace);
 for(const id of ['research','workflows','settings']){const section=document.createElement('section');section.id=id+'-view';section.className='view';section.hidden=true;document.querySelector('main').append(section);}
 const workflowHost=document.querySelector('#workflows-view');workflowHost.innerHTML='<div class="desk-page-heading"><h1>Workflows</h1><p>Repeatable methods, adapted to the workspace you’re in.</p></div><div class="workflow-list"></div>';
 workflows.forEach(([name,description,prompt],i)=>{const button=document.createElement('button');button.className='workflow-card';button.innerHTML=`<span class="workflow-index">0${i+1} / WORKFLOW</span><h3>${name}</h3><p>${description}</p><footer>Use in a conversation ↗</footer>`;button.onclick=()=>compose(prompt);workflowHost.lastChild.append(button);});
 document.querySelector('#research-view').innerHTML='<div class="page-empty">'+emptyArt('research')+'<h2>Start with the evidence.</h2><p>Find the posts your audience responds to. Bring an account or a reference link, or let’s work out where to look together.</p><button id="research-workflow" class="primary">Find formats for my audience ↗</button><small>Opens a starting prompt in chat. You can edit it before sending.</small><button id="research-connections" class="quiet-action">Manage data connections</button></div>';
 document.querySelector('#research-workflow').onclick=()=>compose(workflows[0][2]);document.querySelector('#research-connections').onclick=()=>navigate('settings');
 setupEvidence(getWorkspace);
 const workflowButton=document.createElement('button');workflowButton.type='button';workflowButton.className='composer-workflow';workflowButton.innerHTML=icon('plus')+' Workflow';workflowButton.onclick=()=>navigate('workflows');document.querySelector('#composer>div').prepend(workflowButton);
 let tab='Connections',settingsWorkspace=null;
 const panels=new Map();
 async function settings(refresh=false){
  const host=document.querySelector('#settings-view');
  if(!host.querySelector('.settings-tabs')){
   host.innerHTML='<div class="desk-page-heading"><h1>Settings</h1><p>Your workspace and the tools it uses.</p></div><div class="settings-tabs" role="tablist" aria-label="Settings"></div><div id="settings-content"></div>';
   for(const name of ['Connections','Workspace','Agent']){
    const b=document.createElement('button');b.textContent=name;b.id='settings-tab-'+name;b.setAttribute('role','tab');b.setAttribute('aria-controls','settings-panel-'+name);
    b.onclick=()=>{tab=name;void settings().catch(e=>notify(e.message));};
    b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const buttons=[...b.parentElement.children],index=buttons.indexOf(b),next=e.key==='Home'?0:e.key==='End'?2:(index+(e.key==='ArrowRight'?1:2))%3;buttons[next].focus();buttons[next].click();};
    host.querySelector('.settings-tabs').append(b);
   }
  }
  if(settingsWorkspace!==getWorkspace()){panels.get('Workspace')?.remove();panels.delete('Workspace');settingsWorkspace=getWorkspace();}
  if(refresh){panels.get('Connections')?.remove();panels.delete('Connections');}
  if(!panels.has(tab)){
   const content=document.createElement('section');content.id='settings-panel-'+tab;content.setAttribute('role','tabpanel');content.setAttribute('aria-labelledby','settings-tab-'+tab);
   panels.set(tab,content);host.querySelector('#settings-content').append(content);
   if(tab==='Agent'){
    content.innerHTML='<h3>Model and speed</h3><p class="desk-description">Used across your conversations. MakePace chooses reasoning effort for the task.</p><div id="settings-model"></div><div class="desk-note">External publishing requires explicit approval. Credentials stay out of chat context.</div>';modelControl(content.querySelector('#settings-model'));
   }else if(tab==='Workspace'){
     const workspace=savedWorkspace(settingsWorkspace);
     content.innerHTML='<h3>Saved business knowledge</h3>';
     for(const [label,value] of Object.entries(workspace?{Name:workspace.name,Website:workspace.website,Offering:workspace.product,Audience:workspace.audience}:{Workspace:getWorkspace()==='hey-mom'?'Hey Mom':'Finish onboarding to save your workspace'})){
      const row=document.createElement('div');row.className='knowledge-setting';const title=document.createElement('strong'),description=document.createElement('p');title.textContent=label;description.textContent=value||'Not specified';row.append(title,description);content.append(row);
     }
     if(window.makepaceDesktop){const b=document.createElement('button');b.className='workspace-folder';b.textContent='Open workspace folder ↗';b.onclick=()=>window.makepaceDesktop.action('workspace',getWorkspace()).catch(e=>notify(e.message));content.append(b);}
   }else{
    content.innerHTML='<div class="connection-grid"></div>';
    for(const [name,description] of [['Codex','Use your local Codex sign-in. No API key needed.'],['OneUp','Connect your social publishing account.'],['Apify','Connect public-data collection for research.']]){
     const card=document.createElement('article');card.className='connection-card';card.dataset.service=name;
     const logo=name==='Codex'?'<span class="provider-codex">'+codexMark+'</span><h3>Codex</h3>':'<img class="provider-wordmark" src="/__studio/providers/'+name.toLowerCase()+'.svg" alt="'+name+'">';
     card.innerHTML='<div class="connection-service">'+logo+'</div><p>'+description+'</p><footer><span class="connection-state">Checking…</span><button class="connection-action" disabled>Connect</button></footer>';
     if(name!=='Codex'){const help=document.createElement('button');help.className='connection-help';help.textContent='How to connect?';help.onclick=()=>connectionGuide(name);card.append(help);}
     content.firstChild.append(card);
    }
    const note=document.createElement('p');note.className='desk-note';note.textContent='Keys are encrypted on this computer. Use Publishing to review a OneUp batch. Research can collect public posts through Apify with bounded runs.';content.append(note);
    void Promise.resolve(window.makepaceDesktop?.integrations?.('status')||{}).then(statuses=>{
     if(!content.isConnected)return;
     for(const card of content.querySelectorAll('.connection-card')){
      const name=card.dataset.service,status=name==='Codex'?document.documentElement.dataset.codexConnected==='true':statuses[name]?.connected;
      const button=card.querySelector('.connection-action');card.querySelector('.connection-state').textContent=status?(name==='Codex'?'Connected':'Saved securely'):'Not connected';
      button.hidden=name==='Codex'&&status;button.disabled=false;button.textContent=status?'Manage':'Connect';
      button.onclick=async()=>{if(name!=='Codex'){integrationForm(name,status);return;}document.querySelector('#connect').click();};
     }
    }).catch(e=>{notify(e.message);content.querySelectorAll('.connection-state').forEach(el=>el.textContent='Could not read connection');});
   }
  }
  panels.forEach((panel,name)=>panel.hidden=name!==tab);
  host.querySelectorAll('[role=tab]').forEach(b=>{const active=b.textContent===tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
 }
 document.addEventListener('makepace-connection',e=>{
  const card=panels.get('Connections')?.querySelector('[data-service=Codex]');if(!card)return;
  card.querySelector('.connection-state').textContent=e.detail.connected?'Connected':'Not connected';card.querySelector('.connection-action').hidden=Boolean(e.detail.connected);
 });
 function connectionGuide(service){
  const one=service==='OneUp',url=one?'https://www.oneupapp.io/api-access':'https://console.apify.com/settings/integrations';
  const steps=one?['Sign in to the OneUp account you want to connect.','Open API Access using the link below. Copy your API key, or generate one if you do not have one.','Return to MakePace, choose Connect on the OneUp card and paste the key.','Choose Verify and save. A successful check changes the status to Saved securely.']:['Sign in to Apify Console and select the account or organization you want to use.','Open Settings → API & Integrations. Under Personal API tokens, create a separate token named MakePace.','Copy the token, return to MakePace and choose Connect on the Apify card.','Paste it and choose Verify and save. Verification reads your account profile; no scraper is started.'];
  const dialog=document.createElement('dialog');dialog.className='integration-dialog connection-guide';dialog.innerHTML='<div class="dialog-heading"><h2>Connect '+service+'</h2><button aria-label="Close">×</button></div><ol>'+steps.map(s=>'<li>'+s+'</li>').join('')+'</ol><a class="guide-link" href="'+url+'" target="_blank" rel="noopener noreferrer">Open '+(one?'OneUp API Access':'Apify API & Integrations')+' ↗</a><p>Enter the key only in the connection dialog, never in chat. MakePace encrypts it locally.</p><a class="guide-source" target="_blank" rel="noopener noreferrer" href="'+(one?'https://docs.oneupapp.io/docs/overview/':'https://docs.apify.com/integrations/api')+'">Provider documentation ↗</a>';
  document.body.append(dialog);dialog.showModal();dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();
 }
 function integrationForm(service,connected){
  const dialog=document.createElement('dialog');dialog.className='integration-dialog';dialog.innerHTML=`<form><div class="dialog-heading"><h2>${service}</h2><button type="button" aria-label="Close">×</button></div><p>Encrypted on this computer. Used only to verify your connection with ${service}. Never included in chat.</p><label>${service==='OneUp'?'API key':'API token'}<input type="password" autocomplete="off" spellcheck="false" autocapitalize="off" required placeholder="Paste your ${service==='OneUp'?'API key':'API token'}"></label><p role="status"></p><div class="dialog-actions">${connected?'<button type="button" id="disconnect-integration">Disconnect</button>':''}<button type="submit" class="primary">Verify and save</button></div></form>`;document.body.append(dialog);dialog.showModal();dialog.querySelector('[aria-label=Close]').onclick=()=>dialog.close();dialog.onclose=()=>{dialog.querySelector('input').value='';dialog.remove();};
  dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const button=dialog.querySelector('[type=submit]'),status=dialog.querySelector('[role=status]');button.disabled=true;status.textContent='Verifying…';try{if(!window.makepaceDesktop?.integrations)throw Error('Open the desktop app to connect services securely.');await window.makepaceDesktop.integrations('save',service,dialog.querySelector('input').value);dialog.querySelector('input').value='';dialog.close();await settings(true);notify(service+' key verified and saved securely.');}catch(e){status.textContent=e.message;button.disabled=false;}};
  const remove=dialog.querySelector('#disconnect-integration');if(remove)remove.onclick=async()=>{try{await window.makepaceDesktop.integrations('remove',service);dialog.close();await settings(true);}catch(e){dialog.querySelector('[role=status]').textContent=e.message;}};
 }
 function welcome(){
  const box=document.querySelector('#messages');
  box.innerHTML=`<div class="welcome start-here"><span class="start-mark">${icon('sparkle')}</span><h2>Start with what works.</h2><p>Find the right formats for your audience.<br>Then turn them into your next batch.</p><div class="start-actions"><button data-start="0" class="start-primary"><span>${icon('sparkle')}<strong>Find formats for my audience</strong><small>A good place to start</small></span>${icon('arrow-up-right')}</button><button data-start="2"><span>${icon('squares-four')}<strong>I have an idea. Let’s make it.</strong></span>${icon('arrow-up-right')}</button></div><span class="start-hint">Or tell us what you have in mind below.</span></div>`;
  box.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>compose(workflows[Number(b.dataset.start)][2]));
 }
 return {settings,welcome};
}
