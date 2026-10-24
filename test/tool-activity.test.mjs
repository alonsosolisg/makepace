import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordTool,settleTools} from '../scripts/studio/tool-activity.mjs';
test('tool activity keeps ordered metadata without arguments or raw results',()=>{
 const messages=[];
 recordTool(messages,{id:'a',type:'mcpToolCall',server:'apify',tool:'collect_posts',arguments:{token:'secret'}});
 messages.push({role:'assistant',text:'Reviewing results'});
 recordTool(messages,{id:'a',type:'mcpToolCall',server:'apify',tool:'collect_posts',result:{secret:'hidden'}},true);
 assert.equal(messages.length,2);assert.equal(messages[0].service,'Apify');assert.equal(messages[0].status,'completed');assert.ok(!JSON.stringify(messages).includes('secret'));
 recordTool(messages,{id:'b',type:'commandExecution',exitCode:-1},true);assert.equal(messages[2].status,'failed');
 recordTool(messages,{id:'c',type:'webSearch'});settleTools(messages);assert.equal(messages[3].status,'interrupted');assert.equal(messages[0].status,'completed');
});
