let current=null;
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
export function conversationMenu(anchor,{title,rename,remove}){
 current?.();
 const menu=el('div');menu.className='conversation-menu';menu.setAttribute('role','menu');
 function close(){menu.remove();document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',keys);window.removeEventListener('resize',close);if(current===close)current=null;}
 function outside(e){if(!menu.contains(e.target)&&!anchor.contains(e.target))close();}
 function keys(e){const items=[...menu.querySelectorAll('button')];if(e.key==='Escape'){e.preventDefault();close();anchor.focus();}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const i=items.indexOf(document.activeElement);items[(i+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus();}}
 async function edit(kind){
  close();const dialog=el('dialog');dialog.className='conversation-dialog';const form=el('form');form.method='dialog';
  const heading=el('h2',kind==='rename'?'Rename conversation':'Delete conversation?');heading.id='conversation-dialog-title';dialog.setAttribute('aria-labelledby',heading.id);form.append(heading);
  let input;if(kind==='rename'){input=el('input');input.value=title;input.maxLength=120;input.required=true;input.setAttribute('aria-label','Conversation name');form.append(input);}else form.append(el('p','This removes “'+title+'” from MakePace. Workspace files and the provider’s stored thread are kept.'));
  const error=el('p');error.className='conversation-error';error.setAttribute('role','alert');form.append(error);
  const actions=el('div');actions.className='conversation-dialog-actions';const cancel=el('button','Cancel');cancel.type='button';cancel.onclick=()=>dialog.close();const submit=el('button',kind==='rename'?'Save name':'Delete');submit.type='submit';submit.className=kind==='rename'?'primary':'danger';actions.append(cancel,submit);form.append(actions);dialog.append(form);document.body.append(dialog);
  dialog.addEventListener('close',()=>{dialog.remove();if(anchor.isConnected)anchor.focus();},{once:true});
  form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;cancel.disabled=true;try{if(kind==='rename')await rename(input.value);else await remove();dialog.close();}catch(e){error.textContent=e.message;}finally{submit.disabled=false;cancel.disabled=false;}};
  dialog.showModal();if(input){input.focus();input.select();}else cancel.focus();
 }
 for(const [label,kind] of [['Rename','rename'],['Delete','delete']]){const b=el('button',label);b.setAttribute('role','menuitem');if(kind==='delete')b.className='danger';b.onclick=()=>void edit(kind);menu.append(b);}
 document.body.append(menu);const rect=anchor.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(rect.right,innerWidth-172))+'px';menu.style.top=Math.max(8,Math.min(rect.top,innerHeight-menu.offsetHeight-8))+'px';
 document.addEventListener('pointerdown',outside);document.addEventListener('keydown',keys);window.addEventListener('resize',close);current=close;menu.firstChild.focus();
}
