export const socialKey=url=>{try{const u=new URL(url);return u.hostname.replace(/^www\./,'').toLowerCase()+u.pathname.replace(/\/+$/,'').toLowerCase();}catch{return '';}}
export function socialGroup(job,social){
 const key=socialKey(social.url),decision=job.socialDecisions?.[key];
 if(decision==='rejected')return 'rejected';
 if(decision==='confirmed')return 'confirmed';
 const check=job.socialChecks?.find(c=>socialKey(c.url)===key);
 if(check?.origin==='website'||social.confidence==='linked')return 'matched';
 if(social.ownershipEvidence==='website-backlink')return 'matched';
 // Older results did not retain structured backlink evidence: keep them reviewable.
 return 'candidate';
}
