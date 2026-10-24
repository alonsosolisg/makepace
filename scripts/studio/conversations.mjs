export function editConversation(conversations,{id,base,action,title},activeKey){
 if(typeof id!=='string'||typeof base!=='string'||!(id===base||id.startsWith(base+':'))||!Object.hasOwn(conversations,id))throw Error('Conversation not found in this workspace.');
 if(action==='rename'){
  if(typeof title!=='string'||!title.trim()||title.trim().length>120)throw Error('Use a name between 1 and 120 characters.');
  conversations[id].title=title.trim();
 }else if(action==='delete'){
  if(activeKey===id)throw Error('Stop this conversation before deleting it.');
  delete conversations[id];
 }else throw Error('Unknown conversation action.');
}
