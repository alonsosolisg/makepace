// Small editorial scenes, each describing the work that belongs on its page.
const scenes={
 research:`<rect x="25" y="20" width="88" height="66" rx="9" fill="var(--surface)"/><path d="M37 36h37M37 47h25"/><path d="m38 72 13-11 13 5 19-20" stroke="var(--brand)"/><circle cx="104" cy="68" r="23" fill="var(--brand-soft)"/><circle cx="104" cy="68" r="15"/><path d="m121 85 17 17" stroke="var(--brand)" stroke-width="5"/>`,
 batch:`<rect x="28" y="22" width="55" height="72" rx="8" fill="var(--surface)" transform="rotate(-8 55 58)"/><rect x="72" y="14" width="60" height="82" rx="8" fill="var(--surface)"/><rect x="81" y="24" width="42" height="33" rx="4" fill="var(--brand-soft)"/><path d="m84 50 11-12 9 7 8-9 8 14M83 69h30M83 78h21"/><circle cx="130" cy="89" r="16" fill="var(--brand)" stroke="none"/><path d="M123 89h14M130 82v14" stroke="var(--surface)"/>`,
 formats:`<rect x="22" y="19" width="53" height="75" rx="7" fill="var(--surface)"/><rect x="31" y="28" width="35" height="26" rx="3" fill="var(--brand-soft)"/><path d="M32 65h33M32 74h22M32 83h28"/><rect x="85" y="19" width="53" height="75" rx="7" fill="var(--surface)"/><path d="M95 31h31M95 40h22"/><rect x="95" y="52" width="12" height="30" rx="3" fill="var(--brand-soft)"/><rect x="114" y="52" width="14" height="30" rx="3" fill="var(--brand-soft)"/><path d="M64 104h32" stroke="var(--brand)"/>`,
 feed:`<rect x="54" y="9" width="54" height="98" rx="12" fill="var(--surface)"/><path d="M72 17h18"/><rect x="61" y="29" width="40" height="51" rx="5" fill="var(--brand-soft)"/><path d="m67 67 10-13 9 8 8-12M63 88h23M63 95h16"/><path d="M126 83V37m-7 8 7-8 7 8" stroke="var(--brand)"/><path d="M35 36v46m-7-8 7 8 7-8"/>`,
 queue:`<rect x="28" y="25" width="104" height="69" rx="9" fill="var(--surface)"/><path d="M28 44h104M48 17v17M111 17v17"/><rect x="42" y="56" width="16" height="12" rx="3" fill="var(--brand-soft)"/><rect x="70" y="56" width="16" height="12" rx="3" fill="var(--brand-soft)"/><path d="M43 80h13M71 80h13"/><circle cx="123" cy="86" r="23" fill="var(--brand-soft)"/><path d="M123 72v14l9 5" stroke="var(--brand)"/>`,
 output:`<rect x="33" y="18" width="78" height="78" rx="8" fill="var(--surface)"/><rect x="43" y="29" width="58" height="36" rx="4" fill="var(--brand-soft)"/><path d="m49 56 13-16 12 11 12-12 9 17M44 76h38M44 85h25"/><circle cx="116" cy="86" r="19" fill="var(--brand)" stroke="none"/><path d="m108 86 5 5 11-12" stroke="var(--surface)"/>`
};
let sequence=0;
export function emptyArt(kind){
 const id='empty-art-'+(++sequence);
 const scene=(scenes[kind]||scenes.batch)
  .replaceAll('fill="var(--surface)"',`fill="url(#${id}-paper)" filter="url(#${id}-shadow)"`)
  .replaceAll('fill="var(--brand-soft)"',`fill="url(#${id}-wash)"`)
  .replaceAll('fill="var(--brand)"',`fill="url(#${id}-teal)" filter="url(#${id}-shadow)"`);
 const detail={
  research:'<rect x="101" y="7" width="43" height="19" rx="9" fill="#007D7B" stroke="none"/><path d="m109 19 6-5 5 3 7-5m5 5h5" stroke="#E2EFEB"/>',
  batch:'<path d="M14 39v-9h9M139 53h9v9" stroke="#71AA9B"/><circle cx="108" cy="37" r="8" fill="#007D7B" stroke="none"/><path d="m84 50 11-12 9 7 8-9 8 14" stroke="#007D7B"/>',
  formats:'<path d="M32 35h23M32 42h16" stroke="#007D7B" stroke-width="2"/><rect x="95" y="52" width="12" height="30" rx="3" fill="#007D7B" stroke="none"/><path d="M9 58h7m-3.5-3.5v7"/>',
  feed:'<path d="M67 42h27M67 48h17" stroke="#007D7B" stroke-width="2"/><circle cx="94" cy="73" r="3" fill="#007D7B" stroke="none"/><rect x="21" y="91" width="25" height="14" rx="7" fill="#007D7B" stroke="none"/><path d="M28 98h11" stroke="white"/>',
  queue:'<rect x="70" y="56" width="16" height="12" rx="3" fill="#007D7B" stroke="none"/><path d="m74 62 3 3 6-7" stroke="white"/><path d="M28 44h104" stroke="#007D7B"/>',
  output:'<circle cx="90" cy="40" r="7" fill="#007D7B" stroke="none"/><path d="m49 56 13-16 12 11 12-12 9 17" stroke="#007D7B" stroke-width="2"/>'
 };
 return `<svg class="empty-illustration" data-scene="${Object.hasOwn(scenes,kind)?kind:'batch'}" viewBox="0 0 180 140" fill="none" stroke="#A6BFB5" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
 <defs><linearGradient id="${id}-paper" x2=".3" y2="1"><stop stop-color="#FFFFFF"/><stop offset="1" stop-color="#F5F2EB"/></linearGradient><linearGradient id="${id}-wash" x2="1" y2="1"><stop stop-color="#C0DED1"/><stop offset="1" stop-color="#E9F0E8"/></linearGradient><linearGradient id="${id}-teal" x2="1" y2="1"><stop stop-color="#159A94"/><stop offset="1" stop-color="#006963"/></linearGradient><filter id="${id}-shadow" x="-50%" y="-50%" width="200%" height="210%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#244E43" flood-opacity=".15"/></filter></defs>
 <ellipse cx="88" cy="73" rx="73" ry="53" fill="#E2EFEB" opacity=".55" stroke="none"/>
 <path d="M19 25h6m-3-3v6M155 108h8m-4-4v8" stroke="#7AB7A8"/><circle cx="154" cy="31" r="2" fill="#B7D6C8" stroke="none"/>
 <g transform="translate(10 10) rotate(${kind==='feed'?5:-6} 80 60)">${scene}${detail[kind]||''}</g></svg>`;
}
