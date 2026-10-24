// Mount once per research run. Polling updates the content without restarting motion.
export function researchWait(host,job){
 let wait=host.querySelector('.research-wait');
 if(!wait){
  host.innerHTML=`<div class="research-wait"><div class="research-scene" aria-hidden="true">
   <div class="research-halo"></div>
   <svg class="research-paths" viewBox="0 0 500 240" fill="none"><path d="M82 84C145 84 140 120 191 120M310 120C366 120 354 64 415 64M310 145C360 145 360 192 416 192"/><circle r="3" cx="148" cy="106"/><circle r="3" cx="363" cy="91"/></svg>
   <div class="discovery-tile discovery-offer"><svg class="icon"><use href="/__studio/phosphor.svg#stack"></use></svg><span>Your offering</span><i></i><i></i></div>
   <div class="research-browser"><div class="research-browser-bar"><span></span><span></span><span></span><b></b></div><div class="research-page"><div class="research-page-placeholder"><div class="research-page-lines"><i></i><i></i><i></i></div><img src="/__studio/mark.svg" alt=""></div><div class="research-scan"></div></div><div class="research-browser-foot"><span></span><i></i><i></i></div></div>
   <div class="discovery-tile discovery-audience"><svg class="icon"><use href="/__studio/phosphor.svg#squares-four"></use></svg><span>Your audience</span><i></i><i></i></div>
   <div class="discovery-tile discovery-socials"><svg class="icon"><use href="/__studio/phosphor.svg#plugs-connected"></use></svg><span>Your socials</span><i></i><i></i></div>
   <span class="research-spark spark-one">✦</span><span class="research-spark spark-two">✦</span>
  </div><div class="research-site-pill"><span></span><b></b></div><h1>Getting to know your business</h1><ol class="research-milestones"><li data-step="capture"><span>1</span>Read your site</li><li data-step="knowledge"><span>2</span>Build knowledge</li><li><span>3</span>Review together</li></ol><p class="research-live" role="status" aria-live="polite"></p></div>`;
  wait=host.querySelector('.research-wait');
 }
 const captured=Boolean(job.screenshot);
 wait.dataset.stage=captured?'knowledge':'capture';
 wait.querySelector('.research-site-pill b').textContent=(job.website||'Your website').replace(/^https?:\/\//,'').replace(/\/$/,'');
 const activity=wait.querySelector('.research-live');if(activity.textContent!==job.activity)activity.textContent=job.activity||'Opening your website';
 const capture=wait.querySelector('[data-step=capture]'),knowledge=wait.querySelector('[data-step=knowledge]');
 capture.classList.toggle('complete',captured);capture.classList.toggle('current',!captured);knowledge.classList.toggle('current',captured);
 capture.querySelector('span').textContent=captured?'✓':'1';
 for(const item of [capture,knowledge]){if(item.classList.contains('current'))item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');}
 if(captured&&job.id&&!wait.querySelector('.research-captured')){
  const image=new Image();image.className='research-captured';image.alt='';image.onload=()=>wait.classList.add('capture-loaded');image.src='/api/studio/research-image?id='+encodeURIComponent(job.id);wait.querySelector('.research-page').prepend(image);
 }
}
