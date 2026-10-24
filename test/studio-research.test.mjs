import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicWebsite,publicIP,getResearch} from '../scripts/studio/research.mjs';

test('research accepts public web addresses and normalizes bare domains',()=>{
 assert.equal(publicWebsite('example.com/about#team'),'https://example.com/about');
 for(const value of ['file:///etc/passwd','http://localhost','https://user:password@example.com','http://example.com:8080',''])assert.throws(()=>publicWebsite(value));
});
test('research blocks private network addresses and path traversal',async()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.1.1','192.168.1.1','100.64.0.1','::1','::ffff:127.0.0.1'])assert.equal(publicIP(ip),false,ip);
 assert.equal(publicIP('93.184.216.34'),true);
 await assert.rejects(getResearch('../../.env'));
});
