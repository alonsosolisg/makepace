const fs=require('node:fs/promises');
const path=require('node:path');
function integrationStore({directory,crypto,request=fetch}){
 const file=path.join(directory,'integrations.encrypted.json');let pending=Promise.resolve();
 const read=async()=>{try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return {};throw Error('Could not read stored connections.');}};
 async function run(action,service,token){
  if(action==='status'){const data=await read();return Object.fromEntries(['OneUp','Apify'].map(name=>[name,{connected:Boolean(data[name])}]));}
  if(!['OneUp','Apify'].includes(service)||!['save','remove'].includes(action))throw Error('Unsupported connection action.');
  const data=await read();
  if(action==='save'){
   if(!await crypto.isAsyncEncryptionAvailable()||crypto.getSelectedStorageBackend?.()==='basic_text')throw Error('Secure OS credential storage is unavailable.');
   if(typeof token!=='string'||!token.trim()||token.length>4096)throw Error('Enter a valid API credential.');
   token=token.trim();let valid=false;
   try{
    const url=service==='Apify'?'https://api.apify.com/v2/users/me':'https://www.oneupapp.io/api/getscheduledposts?start=0&apiKey='+encodeURIComponent(token);
    const response=await request(url,{headers:service==='Apify'?{Authorization:'Bearer '+token}:{},redirect:'error',signal:AbortSignal.timeout(15000)});
    const body=await response.json();valid=response.ok&&(service==='Apify'?Boolean(body.data?.id):!body.error&&Array.isArray(body.data));
   }catch{throw Error('Could not verify the connection. Check your credential and try again.');}
   if(!valid)throw Error('The service did not accept this credential.');
   data[service]=(await crypto.encryptStringAsync(token)).toString('base64');
  }else delete data[service];
  await fs.mkdir(directory,{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(data),{mode:0o600});await fs.rename(file+'.tmp',file);return {connected:action==='save'};
 }
 const store=(...args)=>{const result=pending.then(()=>run(...args));pending=result.catch(()=>{});return result;};
 // Main-process only. This callback is never exposed through preload or IPC.
 store.withCredential=async(service,callback)=>{
  await pending;const data=await read();if(!data[service])throw Error('Connect '+service+' in Settings first.');
  let key;try{const decrypted=await crypto.decryptStringAsync(Buffer.from(data[service],'base64'));key=decrypted.result;if(typeof key!=='string')throw Error();}catch{throw Error('Reconnect '+service+' to restore its local credential.');}
  return callback(key);
 };
 return store;
}
module.exports={integrationStore};
