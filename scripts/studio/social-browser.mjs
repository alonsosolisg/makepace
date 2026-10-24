export function hasWebsiteBacklink(evidence,websites){
 const hosts=websites.map(value=>new URL(value).hostname.replace(/^www\./,'').toLowerCase());
 const matches=value=>{try{const host=new URL(value).hostname.replace(/^www\./,'').toLowerCase();return hosts.includes(host);}catch{return false;}};
 for(const link of evidence.links||[]){
  if(matches(link))return true;
  try{const u=new URL(link);if(/(^|\.)(instagram\.com|facebook\.com|tiktok\.com)$/.test(u.hostname))for(const key of ['u','url','target'])if(matches(u.searchParams.get(key)))return true;}catch{}
 }
 // A profile description is useful evidence; page-wide recommendations are not.
 return (evidence.description?.match(/(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?/gi)||[]).some(value=>matches(/^https?:/.test(value)?value:'https://'+value));
}
export function socialCandidates(website,name,socials=[],pages=[]){
 const results=new Map();
 const add=(url,origin)=>{try{const u=new URL(url);if(!/(^|\.)(instagram\.com|tiktok\.com|linkedin\.com|facebook\.com|youtube\.com|x\.com)$/.test(u.hostname)||!u.pathname.replace(/\//g,''))return;u.search='';u.hash='';if(!results.has(u.href))results.set(u.href,{url:u.href,origin});}catch{}};
 for(const page of pages)for(const link of page.links||[])add(link.url,'website');
 const platform=url=>{const host=new URL(url).hostname;return ['instagram.com','tiktok.com','linkedin.com','facebook.com','youtube.com','x.com'].find(domain=>host===domain||host.endsWith('.'+domain));};
 const linkedPlatforms=new Set([...results.values()].map(item=>platform(item.url)));
 for(const item of socials){try{if(!linkedPlatforms.has(platform(item.url)))add(item.url,'search');}catch{}}
 const domain=new URL(website).hostname.replace(/^www\./,'').split('.')[0];
 const handles=[domain];if(domain.startsWith('app')&&domain.length>5)handles.push(domain.slice(3)+'app');
 const brand=name.split(/\s+by\s+/i)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
 if(brand&&brand!==domain)handles.push(brand+'app');
 for(const handle of [...new Set(handles)].slice(0,3)){
  if(!linkedPlatforms.has('tiktok.com'))add('https://www.tiktok.com/@'+handle,'candidate');
  if(!linkedPlatforms.has('instagram.com'))add('https://www.instagram.com/'+handle+'/','candidate');
 }
 return [...results.values()].slice(0,8);
}
export function classifyProfile({url,title='',text='',status=200},website){
 const content=title+'\n'+text;
 if(status===404||/couldn't find this account|couldn’t find this account|page isn't available|account not found/i.test(content))return 'not-found';
 if(status>=400||/captcha|verify (?:that )?you are human|access denied|unusual traffic|security check/i.test(content))return 'blocked';
 const profileDetails=/followers|following|subscribers|@[a-z0-9_.]+/i.test(content);
 if(!profileDetails&&(/log in|sign in|login|sign up/i.test(content)||text.trim().length<100))return 'blocked';
 return profileDetails?'readable':'unverified';
}
export async function inspectSocials({browser,job,pages,safeURL,saveEvidence}){
 const checks=[];
 const candidates=socialCandidates(job.website,job.knowledge.name,job.knowledge.socials,pages);
 for(const candidate of candidates){
  const page=await browser.newPage();
  try{
   await page.setViewport({width:1280,height:900});
   await page.setRequestInterception(true);
   page.on('request',r=>{void(async()=>{try{if(r.url().startsWith('data:')){await r.continue();return;}await safeURL(r.url());await r.continue();}catch{await r.abort().catch(()=>{});}})();});
   await safeURL(candidate.url);
   const response=await page.goto(candidate.url,{waitUntil:'domcontentloaded',timeout:14000});
   await page.waitForNetworkIdle({idleTime:500,timeout:2000}).catch(()=>{});
   const evidence=await page.evaluate(()=>({url:location.href,title:document.title,text:document.body?.innerText.slice(0,12000)||'',description:document.querySelector('meta[property="og:description"],meta[name="description"]')?.content||'',links:[...document.querySelectorAll('a[href]')].map(a=>a.href).slice(0,150)}));
   evidence.text=evidence.description+'\n'+evidence.text;
   const status=classifyProfile({...evidence,status:response?.status()},job.website);
   const backlink=hasWebsiteBacklink(evidence,[job.website,...pages.map(p=>p.url)]);
   const check={...candidate,status,title:evidence.title,summary:status==='readable'?'Public profile opened in the browser. '+(backlink?'It links back to your website.':'Ownership still needs your confirmation.'):status==='not-found'?'This profile was not found.':'The platform did not expose a readable public profile in this browser.',backlink,checkedAt:new Date().toISOString()};
   checks.push(check);await saveEvidence(check,evidence);
   const existing=job.knowledge.socials.find(s=>s.url.replace(/\/$/,'')===candidate.url.replace(/\/$/,''));
   if(existing){existing.browserStatus=status;existing.browserEvidence=check.summary;existing.ownershipEvidence=backlink?'website-backlink':null;}
   else if(status==='readable')job.knowledge.socials.push({platform:new URL(candidate.url).hostname.includes('tiktok')?'TikTok':new URL(candidate.url).hostname.includes('instagram')?'Instagram':'Social profile',url:candidate.url,evidence:check.summary,confidence:candidate.origin==='website'?'linked':backlink?'likely':'unverified',browserStatus:status,browserEvidence:check.summary});
   const account=job.knowledge.socials.find(s=>s.url.replace(/\/$/,'')===candidate.url.replace(/\/$/,''));
   if(account)account.ownershipEvidence=backlink?'website-backlink':null;
  }catch(e){checks.push({...candidate,status:'blocked',summary:'Browser could not read this profile: '+e.message,checkedAt:new Date().toISOString()});}
  finally{await page.close();}
  job.socialChecks=[...checks];
 }
 return checks;
}
