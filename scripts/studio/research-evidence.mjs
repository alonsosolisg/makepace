export function classifyEvidence(data,website){
 let own='';try{own=new URL(website).hostname.replace(/^www\./,'');}catch{}
 return {...data,findings:(data.findings||[]).map(f=>{
  const examples=(f.examples||[]).map(s=>{let kind='unverified';try{const u=new URL(s.url),host=u.hostname.replace(/^www\./,'');if(own&&(host===own||host.endsWith('.'+own)))kind='audience-context';else if((host==='instagram.com'&&/^\/(p|reel)\//.test(u.pathname)||host==='tiktok.com'&&/\/(video|photo)\//.test(u.pathname))&&s.observedAt&&f.status==='observed')kind='reported-observation';}catch{}return {...s,sourceKind:kind};});
  return {...f,examples,status:examples.some(s=>s.sourceKind==='reported-observation')?'observed':'hypothesis'};
 })};
}
