import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('desktop backend requires its token for both pages and API access',async t=>{
 const data=await mkdtemp(path.join(tmpdir(),'makepace-desktop-'));
 await writeFile(path.join(data,'state.json'),JSON.stringify({conversations:{},reviews:{},workspaces:{alpha:{name:'Alpha',website:'https://example.com',product:'Tea',audience:'Tea drinkers'}}}));
 const child=spawn(process.execPath,['scripts/serve-community-preview.mjs'],{env:{...process.env,MAKEPACE_AUTO_CONNECT:'0',COMMUNITY_PREVIEW_PORT:'0',MAKEPACE_DATA_ROOT:data,MAKEPACE_WORKSPACE_ROOT:data,MAKEPACE_DESKTOP_TOKEN:'test-private-token'},stdio:['ignore','pipe','pipe']});
 t.after(async()=>{const exited=once(child,'exit');child.kill();await exited;await rm(data,{recursive:true,force:true});});
 const [output]=await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Backend startup timeout')),5000).unref())]);
 const base='http://127.0.0.1:'+String(output).match(/localhost:(\d+)/)[1];
 for(const route of ['/studio','/api/studio/state']){
  assert.equal((await fetch(base+route)).status,403);
  assert.equal((await fetch(base+route,{headers:{'X-MakePace-Desktop':'wrong'}})).status,403);
  assert.equal((await fetch(base+route,{headers:{'X-MakePace-Desktop':'test-private-token'}})).status,200);
 }
 const response=await fetch(base+'/api/studio/state',{headers:{'X-MakePace-Desktop':'test-private-token'}});
 assert.equal((await response.json()).connected,false);
 const folder=await fetch(base+'/api/studio/workspace-folder',{method:'POST',headers:{'Content-Type':'application/json','X-MakePace-Desktop':'test-private-token'},body:JSON.stringify({workspaceId:'alpha'})});
 assert.equal(folder.status,200);
 assert.equal((await folder.json()).path,path.join(data,'workspaces','alpha'));
 const brief=JSON.parse(await readFile(path.join(data,'workspaces','alpha','workspace-knowledge.json'),'utf8'));
 assert.equal(brief.name,'Alpha');assert.equal(brief.knowledge.audience,'Tea drinkers');
 const invalid=await fetch(base+'/api/studio/workspace-folder',{method:'POST',headers:{'Content-Type':'application/json','X-MakePace-Desktop':'test-private-token'},body:JSON.stringify({workspaceId:'../elsewhere'})});
 assert.equal(invalid.status,400);
});
