function apifyResearch({withKey,request=fetch}){
 const runs=new Map();
 async function call(route,options={}){return withKey(async key=>{
  let response;try{response=await request('https://api.apify.com/v2/'+route,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(45000)});}catch{throw Error('Apify could not be reached. Check the existing run before retrying.');}
  if(!response.ok)throw Error(response.status===402?'Apify usage limit reached. No automatic retry.':response.status===401?'Reconnect Apify in Settings.':'Apify rejected the request (HTTP '+response.status+').');
  return response.json();
 });}
 return async(action,args)=>{
  if(action==='start'){
   const {platform,urls}=args;
   if(!['tiktok','instagram'].includes(platform)||!Array.isArray(urls)||urls.length<1||urls.length>3)throw Error('Choose TikTok or Instagram and 1–3 public URLs.');
   const parsed=urls.map(value=>{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!['www.'+platform+'.com',platform+'.com'].includes(u.hostname))throw Error('Use original HTTPS platform URLs.');return u;});
   const actor=platform==='tiktok'?'clockworks~tiktok-scraper':'apify~instagram-scraper';
   const input=platform==='instagram'?{directUrls:parsed.map(u=>u.href),resultsType:'posts',resultsLimit:20}:{profiles:parsed.filter(u=>!/(video|photo)\//.test(u.pathname)).map(u=>u.pathname.split('/').filter(Boolean)[0]?.replace(/^@/,'')),postURLs:parsed.filter(u=>/(video|photo)\//.test(u.pathname)).map(u=>u.href),resultsPerPage:6,shouldDownloadVideos:false,shouldDownloadCovers:false};
   const {data}=await call('acts/'+actor+'/runs?timeout=120&maxItems=20&maxTotalChargeUsd=0.25',{method:'POST',body:JSON.stringify(input)});
   if(!data?.id||!data.defaultDatasetId)throw Error('Apify did not return a run reference. Check the console before retrying.');
   runs.set(data.id,data.defaultDatasetId);return {runId:data.id,status:data.status,requestedMaxChargeUsd:.25};
  }
  if(action!=='result'||!runs.has(args.runId))throw Error('Unknown collection run. Use a run started in this app session.');
  const {data}=await call('actor-runs/'+encodeURIComponent(args.runId)+'?waitForFinish=15');
  const result={runId:args.runId,status:data.status,observedAt:new Date().toISOString()};
  if(data.status==='SUCCEEDED')result.items=await call('datasets/'+encodeURIComponent(runs.get(args.runId))+'/items?clean=true&limit=20');
  return result;
 };
}
module.exports={apifyResearch};
