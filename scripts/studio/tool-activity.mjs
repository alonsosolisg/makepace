// Persist presentation metadata only: never tool arguments, credentials or raw output.
export function recordTool(messages,item,completed=false){
 const labels={commandExecution:['Workspace','Workspace command'],fileChange:['Files','Update workspace files'],mcpToolCall:['Tools','Connected tool'],dynamicToolCall:['Research','Inspect public evidence'],webSearch:['Research','Search public sources'],imageGeneration:['Images','Generate image']};
 if(!item?.id||!labels[item.type])return null;
 let [service,label]=labels[item.type];
 if(item.type==='dynamicToolCall'){service=item.tool==='makepace_inspect_page'?'Browser':'Apify';label=item.tool==='makepace_inspect_page'?'Inspect page and capture screenshot':item.tool==='makepace_collect_social'?'Collect public social posts':'Read collection results';}
 if(item.type==='mcpToolCall'){
  const identity=[item.server,item.tool].filter(Boolean).join(' ');
  if(/oneup/i.test(identity))service='OneUp';else if(/apify/i.test(identity))service='Apify';
  label=String(item.tool||'Connected tool').replace(/^mcp__[^_]+__/,'').replace(/[_/]+/g,' ').slice(0,100);
 }
 let row=messages.find(m=>m.role==='tool'&&m.id===item.id);
 if(!row){row={role:'tool',id:item.id,startedAt:Date.now()};messages.push(row);}
 Object.assign(row,{service,label,status:completed?(item.status==='failed'||item.success===false||item.error||(typeof item.exitCode==='number'&&item.exitCode!==0)?'failed':item.status==='declined'?'interrupted':'completed'):'running'});
 if(completed)row.finishedAt=Date.now();
 return row;
}
export function settleTools(messages){for(const m of messages)if(m.role==='tool'&&m.status==='running')m.status='interrupted';}
