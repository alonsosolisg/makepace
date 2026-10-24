import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {workspacePartnerContext} from '../scripts/studio/partner-context.mjs';

test('partner scopes conversations and files to the selected saved workspace',()=>{
 const workspaces={alpha:{name:'Alpha',website:'https://alpha.example',product:'Tea',audience:'Tea drinkers'},beta:{name:'Beta',website:'https://beta.example',product:'Bikes',audience:'Cyclists'}};
 const a=workspacePartnerContext(workspaces,'alpha','/content',{offering:'Loose-leaf tea',audience:'Tea drinkers'});
 const b=workspacePartnerContext(workspaces,'beta','/content');
 assert.equal(a.key,'workspace:alpha');assert.equal(b.key,'workspace:beta');
 assert.equal(a.cwd,path.join('/content','workspaces','alpha'));
 assert.match(a.context,/Loose-leaf tea/);assert.doesNotMatch(a.context,/Cyclists/);
 assert.match(b.context,/Cyclists/);assert.doesNotMatch(b.context,/Tea drinkers/);
 for(const id of ['../alpha','missing','__proto__'])assert.throws(()=>workspacePartnerContext(workspaces,id,'/content'),/Unknown workspace/);
});
