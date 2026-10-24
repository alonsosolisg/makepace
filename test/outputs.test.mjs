import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {collectOutputs,registerOutputs,readOutput} from '../scripts/studio/outputs.mjs';
import {classifyEvidence} from '../scripts/studio/research-evidence.mjs';
test('outputs register new revisions once and reject unsafe paths',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'makepace-output-'));
 try{
  await fs.writeFile(path.join(root,'makepace-outputs.json'),JSON.stringify({outputs:[{path:'story.md',title:'Story'}]}));await fs.writeFile(path.join(root,'story.md'),'First version');
  const c={messages:[]};await registerOutputs(c,root);await registerOutputs(c,root);assert.equal(c.messages.length,1);
  await fs.mkdir(path.join(root,'research'));await fs.writeFile(path.join(root,'research/content-format-research.json'),'{}');assert.ok(!(await collectOutputs(root)).some(o=>o.path==='research/content-format-research.json'));
  const before=await collectOutputs(root);await fs.writeFile(path.join(root,'story.md'),'Second version');await registerOutputs(c,root,before);assert.equal(c.messages.length,2);assert.notEqual(c.messages[0].output.id,c.messages[1].output.id);
  await assert.rejects(()=>readOutput(root,'../outside.md'));await assert.rejects(()=>readOutput(root,'.env'));await assert.rejects(()=>readOutput(root,'integrations.encrypted.json'));
  await fs.symlink(os.tmpdir(),path.join(root,'escape'));await assert.rejects(()=>readOutput(root,'escape/nope.md'));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('own website cannot qualify as observed social performance',()=>{
 const result=classifyEvidence({findings:[{status:'observed',examples:[{url:'https://brand.test/product',observedAt:'2026-10-24'}]},{status:'observed',examples:[{url:'https://www.instagram.com/p/real/',observedAt:'2026-10-24'}]}]},'https://brand.test');
 assert.equal(result.findings[0].status,'hypothesis');assert.equal(result.findings[0].examples[0].sourceKind,'audience-context');assert.equal(result.findings[1].status,'observed');
});
