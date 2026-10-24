import {EventEmitter} from 'node:events';

// Reconnect the transport/auth session only. Never replay a user turn.
export class CodexSession extends EventEmitter {
 constructor(connection,{delay=1000,maxDelay=30000}={}){
  super();this.connection=connection;this.delay=delay;this.maxDelay=maxDelay;
  this.account=null;this.status='disconnected';this.attempt=0;this.enabled=false;
  connection.on('disconnected',()=>{
   this.account=null;this.status=this.enabled?'reconnecting':'disconnected';
   this.emit('change');if(this.enabled)this.schedule();
  });
 }
 schedule(){
  if(this.timer||!this.enabled)return;
  this.timer=setTimeout(()=>{this.timer=null;void this.connect().catch(()=>{});},Math.min(this.maxDelay,this.delay*2**Math.min(this.attempt++,5)));
  this.timer.unref?.();
 }
 connect(){
  this.enabled=true;
  if(this.inflight)return this.inflight;
  clearTimeout(this.timer);this.timer=null;
  this.status='reconnecting';this.emit('change');
  this.inflight=(async()=>{
   try{
    await this.connection.connect();
    const result=await this.connection.rpc('account/read',{refreshToken:false});
    this.account=result.account;
    this.status=this.account?'connected':'sign-in-required';
    this.attempt=0;
    if(!this.account)this.enabled=false;
    this.emit('change');
    return this.account;
   }catch(error){
    if(/401|unauthori[sz]ed|authentication|refresh token|sign.?in required/i.test(error.message)){
     this.account=null;this.enabled=false;clearTimeout(this.timer);this.timer=null;
     this.status='sign-in-required';this.emit('change');throw error;
    }
    this.account=null;this.status='reconnecting';this.emit('change');
    this.connection.close();this.schedule();throw error;
   }finally{this.inflight=null;}
  })();
  return this.inflight;
 }
 stop(){this.enabled=false;clearTimeout(this.timer);this.timer=null;this.connection.close();}
}
