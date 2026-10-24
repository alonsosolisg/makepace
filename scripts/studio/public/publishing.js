import {customSelect} from './select.js';
import {emptyArt} from './empty-art.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
export function publishingView({workspace,compose,settings}){
 const host=document.querySelector('#queue-view');host.replaceChildren();
 const intro=el('div',null,'desk-page-heading');intro.append(el('h1','Publishing'),el('p','Review the batch. Choose the account. Send the approved schedule to OneUp.'));host.append(intro);
 const bar=el('div',null,'publish-toolbar'),load=el('button','Load OneUp','primary'),planChat=el('button','Prepare a plan in chat ↗');bar.append(load,planChat);host.append(bar);
 planChat.onclick=()=>compose('Prepare publishing-plan.json using MAKEPACE-PUBLISHING.md in this workspace. Use publishing-context.json for the live accounts and queue. Confirm the target account timezone and cadence with me, use approved exports, choose appropriate music and explicit disclosures, and show the exact schedule for review. Do not submit it yourself.');
 const status=el('p',null,'publish-status');status.setAttribute('role','status');host.append(status);
 const controls=el('div',null,'publish-controls'),review=el('section',null,'publish-review'),queue=el('section',null,'publish-queue');host.append(controls,review,queue);
 const bridge=window.makepaceDesktop?.publishing;
 if(!bridge){status.textContent='Open MakePace desktop to use your encrypted OneUp connection.';queue.innerHTML=emptyArt('queue');load.disabled=true;return;}
 let category='',account='',plan=null,busy=false;
 const request=(action,data={})=>bridge(action,{workspaceId:workspace,...data});
 const renderQueue=rows=>{queue.replaceChildren(el('h3','Current OneUp queue'),el('p','All connected accounts · times as reported by OneUp','fine'));if(!rows.length)queue.append(el('p','No posts currently scheduled.'));for(const row of rows){const card=el('div',null,'publish-queue-row');card.append(el('time',row.time),el('strong',row.account),el('span',row.caption));queue.append(card);}};
 async function connect(){
  if(busy)return;busy=true;load.disabled=true;status.textContent='Reading accounts and queue…';
  try{
   const data=await request('overview',{categoryId:category||undefined});if(!host.isConnected)return;
   controls.replaceChildren();const label=el('label','Category'),select=el('select');select.id='publishing-category';select.append(new Option('Choose a category',''));data.categories.forEach(c=>select.append(new Option(c.name,c.id)));select.value=category;label.append(select);controls.append(label);customSelect(select);
   select.onchange=()=>{category=select.value;account='';plan=null;review.replaceChildren();void connect();};
   if(category){const accountLabel=el('label','Account'),accounts=el('select');accounts.id='publishing-account';accounts.append(new Option('Choose an account',''));data.accounts.filter(a=>['tiktok','instagram'].includes(a.platform)).forEach(a=>accounts.append(new Option(a.name+' · '+a.platform,a.id)));accounts.value=account;accountLabel.append(accounts);controls.append(accountLabel);customSelect(accounts);
    const prepare=el('button','Review schedule','primary');prepare.disabled=!account;controls.append(prepare);accounts.onchange=()=>{account=accounts.value;plan=null;review.replaceChildren();prepare.disabled=!account;};
    prepare.onclick=async()=>{prepare.disabled=true;status.textContent='Validating the plan and exported media…';try{plan=await request('prepare',{categoryId:category,accountId:account});renderPlan();status.textContent='Ready for review. Nothing has been uploaded or scheduled.';}catch(e){status.textContent=e.message.includes('ENOENT')?'No publishing-plan.json yet. Use “Prepare a plan in chat” to create it.':e.message;}finally{prepare.disabled=!account;}};
   }
   renderQueue(data.queue);status.textContent='Choose a category and account, then review the plan prepared in chat.';
  }catch(e){status.textContent=e.message;const button=el('button','Open connection settings');button.onclick=settings;controls.replaceChildren(button);}finally{busy=false;load.disabled=false;}
 }
 function renderPlan(){
  review.replaceChildren(el('h3',plan.items.length+' posts → '+plan.account.name),el('p','Timezone: '+plan.timezone+' · '+plan.account.platform));
  for(const item of plan.items){const row=el('article',null,'publish-plan-item');row.append(el('strong',item.time),el('p',item.caption),el('small',item.kind+' · '+item.media.length+' file(s) · AI: '+item.aiGenerated+' · Own brand: '+item.ownBrand+' · Paid partnership: '+item.paidPartnership),el('p',item.music?item.music.music_title+' — '+item.music.music_author:item.autoAddMusic?'Automatic TikTok music':'Embedded audio / no added music','fine'));
   const files=el('details');files.append(el('summary','Ordered exports'));item.media.forEach(m=>files.append(el('p',m.path+' · '+m.sha256.slice(0,12),'fine')));row.append(files);review.append(row);
   if(item.kind==='image'){const view=el('button','Preview slides'),strip=el('div',null,'publishing-slides');row.append(view,strip);view.onclick=async()=>{view.disabled=true;try{for(let index=0;index<item.media.length;index++){const image=el('img');image.alt='Slide '+(index+1);image.src=await request('preview',{id:plan.id,postId:item.id,index});strip.append(image);}view.remove();}catch(e){status.textContent=e.message;strip.replaceChildren();view.disabled=false;}};}
  }
  const receipt=el('p',null,'publish-status');review.append(receipt);
  const check=el('button','Check submission receipts');review.append(check);check.onclick=async()=>{check.disabled=true;try{const result=await request('reconcile',{id:plan.id});receipt.textContent=Object.values(result.receipts).filter(r=>r.state==='verified').length+' confirmed in the queue. Unresolved submissions remain blocked.';}catch(e){receipt.textContent=e.message.includes('ENOENT')?'No submissions recorded for this plan yet.':e.message;}finally{check.disabled=false;}};
  const confirm=el('label',null,'publish-confirm'),checkbox=el('input');checkbox.type='checkbox';confirm.append(checkbox,document.createTextNode('I reviewed these exports, captions, music and disclosures. This timezone matches the selected account in OneUp.'));review.append(confirm);
  const submit=el('button','Upload and schedule '+plan.items.length+' posts','primary');submit.disabled=true;checkbox.onchange=()=>submit.disabled=!checkbox.checked;review.append(submit);
  review.append(el('p','Uploads use OneUp hosting (requires an eligible OneUp plan). Submission verifies the queue; native music, labels and final publication still need checking.','fine'));
  submit.onclick=async()=>{submit.disabled=true;checkbox.disabled=true;load.disabled=true;controls.inert=true;receipt.textContent='Waiting for confirmation, then uploading and scheduling… Keep MakePace open.';try{const result=await request('execute',{id:plan.id});receipt.textContent=result.cancelled?'Cancelled. Nothing submitted.':Object.values(result.receipts).filter(r=>r.state==='verified').length+' posts verified in the OneUp queue.';if(!result.cancelled)renderQueue((await request('overview',{categoryId:category})).queue);}catch(e){receipt.textContent=e.message+' Completed submissions are retained; unresolved posts will not be blindly retried.';}finally{checkbox.disabled=false;submit.disabled=!checkbox.checked;load.disabled=false;controls.inert=false;}};
 }
 load.onclick=connect;
 const empty=el('div',null,'desk-note');empty.innerHTML=emptyArt('queue');empty.append(el('p','Load OneUp to see destinations and the current queue. Your agent can then prepare a batch using this live context.'));queue.append(empty);
}
