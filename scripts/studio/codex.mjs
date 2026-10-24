import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {EventEmitter} from 'node:events';
const connections=new Set();
export function closeCodexConnections(){for(const connection of connections)connection.close();}

// A private stdio connection. No CLI credentials or arbitrary RPC exposed to the browser.
export class CodexConnection extends EventEmitter {
 constructor(){super();this.next=1;this.pending=new Map();this.ready=null;connections.add(this);}
 async connect(){
  if(this.ready)return this.ready;
  this.ready=(async()=>{
   this.process=spawn(process.env.MAKEPACE_CODEX_PATH||'codex',['app-server','--listen','stdio://'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
   this.process.stderr.on('data',()=>{});
   const child=this.process;let failed=false;
   const fail=()=>{if(failed||this.process!==child)return;failed=true;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Codex connection closed'));}this.pending.clear();this.ready=null;this.emit('disconnected');};
   this.process.on('error',fail);this.process.on('exit',fail);
   this.process.stdin.on('error',fail);
   createInterface({input:this.process.stdout}).on('line',line=>{let m;try{m=JSON.parse(line);}catch{return;}
    if(m.method){this.emit('event',m);return;}const p=this.pending.get(m.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(Error(m.error.message||'Codex request failed')):p.resolve(m.result);
   });
   await this.rpc('initialize',{clientInfo:{name:'makepace',title:'MakePace',version:'0.1.0'},capabilities:{experimentalApi:true}});
   this.send({method:'initialized',params:{}});
  })();
  try{await this.ready;}catch(e){this.process?.kill();this.ready=null;throw e;}
 }
 send(m){if(!this.process?.stdin.writable)throw Error('Codex is not connected');this.process.stdin.write(JSON.stringify(m)+'\n');}
 rpc(method,params={}){return new Promise((resolve,reject)=>{const id=this.next++;const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Codex request timed out; check activity before retrying'));},60000);this.pending.set(id,{resolve,reject,timer});try{this.send({id,method,params});}catch(e){clearTimeout(timer);this.pending.delete(id);reject(e);}});}
 respond(id,result){this.send({id,result});}
 close(){this.process?.kill();}
}
