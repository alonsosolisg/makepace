import { customSelect } from '../studio/public/select.js';
const $ = (s) => document.querySelector(s),
  phone = $('#phone'),
  audio = $('#audio');
let posts = [],
  music = {},
  index = 0,
  slide = 0,
  base = '',
  batch = '',
  sound = new URLSearchParams(location.search).get('sound') === '1',
  epoch = 0,
  wheelAt = 0,
  start = null;
const reactions = new Map();
const embedded = new URLSearchParams(location.search).has('embed');
const workspaceId = new URLSearchParams(location.search).get('workspaceId') || 'hey-mom';
let brand = { name: 'Workspace', favicon: null };
function brandAvatar() {
  const el = document.createElement('span');
  el.className = 'social-workspace-avatar';
  el.textContent = brand.name.slice(0, 1).toUpperCase();
  if (brand.favicon) {
    const img = new Image();
    img.src = brand.favicon;
    img.alt = brand.name;
    img.onerror = () => img.remove();
    el.append(img);
  }
  return el;
}
function applyBrand() {
  $('.avatar').replaceChildren(brandAvatar());
  const label = $('.caption > strong');
  const follow = label.querySelector('.follow');
  label.replaceChildren(document.createTextNode(brand.name + ' '));
  if (follow) label.append(follow);
  $('.feednav .social-workspace-avatar')?.remove();
  if (platform === 'instagram') $('.feednav').prepend(brandAvatar());
}
fetch('/api/studio/preview-brand?workspaceId=' + encodeURIComponent(workspaceId))
  .then((r) => {
    if (!r.ok) throw Error('Brand unavailable');
    return r.json();
  })
  .then((value) => {
    brand = value;
    applyBrand();
  })
  .catch(() => applyBrand());
let platform =
  new URLSearchParams(location.search).get('platform') === 'instagram' ? 'instagram' : 'tiktok';
if (embedded) document.body.classList.add('embedded', 'tiktok-overlay');
const playback = document.createElement('div');
playback.className = 'preview-playback';
playback.innerHTML =
  '<span class="preview-title"></span><button data-previous aria-label="Previous post">↑ Previous</button><button data-next aria-label="Next post">Next ↓</button><button data-overlay aria-pressed="true">Show UI</button><button data-sound>Sound on</button><button data-expand aria-label="Expand preview">Expand</button>';
const collectionBar = document.createElement('div');
collectionBar.className = 'collection-bar';
collectionBar.innerHTML =
  '<select id="feed-platform" aria-label="Preview platform"><option value="tiktok">TikTok</option><option value="instagram">Instagram</option></select><span class="export-note"></span>';
document.body.append(collectionBar);
if (embedded) {
  collectionBar.prepend($('#batch'));
  $('#batch').setAttribute('aria-label', 'Preview batch');
  customSelect($('#batch'));
  customSelect(collectionBar.querySelector('select#feed-platform'));
}
$('#feed-platform').value = platform;
for (const option of $('#feed-platform').options)
  option.toggleAttribute('selected', option.value === platform);
const originalNav = $('.feednav').innerHTML;
const originalBottom = $('.bottom').innerHTML;
function platformShell() {
  document.body.classList.toggle('instagram', platform === 'instagram');
  phone.setAttribute(
    'aria-label',
    `${platform === 'instagram' ? 'Instagram' : 'TikTok'} feed simulation`,
  );
  $('.bottom').innerHTML =
    platform === 'instagram'
      ? '<span aria-label="Home">⌂</span><span aria-label="Search">⌕</span><span aria-label="Create">＋</span><span aria-label="Reels">▷</span><span aria-label="Profile">○</span>'
      : originalBottom;
  $('.feednav').innerHTML =
    platform === 'instagram'
      ? '<strong>Posts</strong><span aria-hidden="true">⋯</span>'
      : originalNav;
  applyBrand();
  for (const p of posts) {
    p.images = p.platformImages?.[platform] || p.originalImages || p.images;
    p.caption = p.platformCaptions?.[platform] || p.originalCaption || p.caption;
  }
  render();
}
$('#feed-platform').onchange = (e) => {
  platform = e.target.value;
  platformShell();
};
const rail = document.createElement('nav');
rail.className = 'feed-rail';
rail.ariaLabel = 'Posts in this batch';
if (embedded) {
  document.body.append(playback, rail);
}
playback.querySelector<HTMLButtonElement>('[data-previous]').onclick = () => movePost(-1);
playback.querySelector<HTMLButtonElement>('[data-next]').onclick = () => movePost(1);
playback.querySelector<HTMLButtonElement>('[data-sound]').onclick = () => $('#sound').click();
audio.volume = 0.4;
playback.querySelector<HTMLButtonElement>('[data-overlay]').onclick = (e) => {
  const active = document.body.classList.toggle('tiktok-overlay');
  (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(active));
};
let expanded = false;
function expandPreview(value) {
  expanded = value;
  parent.postMessage({ type: 'feed-expand', expanded }, location.origin);
  playback.querySelector('[data-expand]').textContent = expanded ? 'Exit focus' : 'Expand';
}
playback.querySelector<HTMLButtonElement>('[data-expand]').onclick = () => expandPreview(!expanded);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && expanded) {
    e.preventDefault();
    expandPreview(false);
  }
});
const slideNavigation = document.createElement('div');
slideNavigation.className = 'slide-navigation';
slideNavigation.innerHTML =
  '<button data-slide-prev aria-label="Previous slide">‹</button><button data-slide-next aria-label="Next slide">›</button>';
if (embedded) document.querySelector('main').append(slideNavigation);
slideNavigation.querySelector<HTMLButtonElement>('[data-slide-prev]').onclick = () => moveSlide(-1);
slideNavigation.querySelector<HTMLButtonElement>('[data-slide-next]').onclick = () => moveSlide(1);
function soundLabel() {
  const label = sound ? 'Mute' : 'Play sound';
  $('#sound').textContent = label;
  playback.querySelector('[data-sound]').textContent = label;
}
soundLabel();
const icons = {
  like: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  comment: 'M21 11.5a9 9 0 1 1-4.3-7.7A9 9 0 0 1 21 11.5ZM17 19l4 3-1-6',
  save: 'M5 3h14v19l-7-5-7 5Z',
  share: 'M14 3l9 8-9 8v-5C7 14 4 17 2 21c0-9 4-14 12-14Z',
};
for (const [key, d] of Object.entries(icons)) {
  const button = $('#' + key),
    label = button.querySelector('small');
  button.replaceChildren();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '30');
  svg.setAttribute('height', '30');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(svg.namespaceURI, 'path');
  p.setAttribute('d', d);
  p.setAttribute('fill', 'currentColor');
  svg.append(p);
  button.append(svg, label);
}
let toastTimer: ReturnType<typeof setTimeout>;
function toast(s) {
  $('#toast').textContent = s;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2200);
}
function resource(p) {
  const u = new URL(p, location.origin + base);
  if (!['http:', 'https:'].includes(u.protocol)) throw Error('Unsupported media');
  return u.href;
}
function stop() {
  audio.pause();
  phone.querySelector('video')?.pause();
}
function play() {
  if (!sound || document.hidden) return;
  const player = posts[index]?.videoFile ? phone.querySelector('video') : audio;
  if (player?.src)
    player.play().catch(() => {
      playback.querySelector('[data-sound]').textContent = 'Play sound';
      sound = false;
      toast('Tap Play sound to start the music.');
    });
}
function render(postChanged = true) {
  const p = posts[index];
  if (!p) return;
  playback.querySelector('.preview-title').textContent = `${p.id} · ${p.title || ''}`;
  $('.export-note').textContent = p.platformImages?.[platform]
    ? `${platform === 'instagram' ? 'Instagram' : 'TikTok'} export`
    : 'Same artwork · platform simulation';
  playback.querySelector<HTMLButtonElement>('[data-previous]').disabled = index === 0;
  playback.querySelector<HTMLButtonElement>('[data-next]').disabled = index === posts.length - 1;
  if (postChanged) {
    stop();
    slide = 0;
    $('#caption-text').classList.remove('expanded');
    $('#comments textarea').value = '';
  }
  const media = $('#media');
  media.replaceChildren();
  if (p.videoFile) {
    const v = document.createElement('video');
    v.src = resource(p.videoFile);
    v.loop = true;
    v.playsInline = true;
    v.muted = !sound;
    media.append(v);
    v.play().catch(() => {});
  } else {
    const img = new Image();
    img.alt = p.slides?.[slide]?.head?.replaceAll('\n', ' ') || p.title || `Slide ${slide + 1}`;
    img.src = resource(p.images[slide]);
    img.onerror = () => toast('Slide could not load');
    media.append(img);
  }
  $('#counter').textContent = p.videoFile ? '' : `${slide + 1}/${p.images.length}`;
  $('#dots').replaceChildren(
    ...(p.images || []).map((_, n) => {
      const b = document.createElement('button');
      b.ariaLabel = `Slide ${n + 1}`;
      b.className = n === slide ? 'selected' : '';
      b.onclick = () => moveSlide(n - slide);
      return b;
    }),
  );
  $('#caption-text').textContent = p.caption || '';
  const m = music[p.id];
  $('#track').textContent = m ? `♫ ${m.music_title} · ${m.music_author}` : '♫ Original audio';
  if (postChanged) {
    audio.removeAttribute('src');
    if (m?.previewFile || m?.music_url) audio.src = resource(m.previewFile || m.music_url);
    play();
  }
  $('#position').textContent =
    `Post ${index + 1} of ${posts.length} · ${p.videoFile ? 'Video' : `Slide ${slide + 1} of ${p.images.length}`} · ← → slides · ↑ ↓ posts`;
  slideNavigation.querySelector<HTMLButtonElement>('[data-slide-prev]').disabled =
    !!p.videoFile || slide === 0;
  slideNavigation.querySelector<HTMLButtonElement>('[data-slide-next]').disabled =
    !!p.videoFile || slide === (p.images?.length || 1) - 1;
  rail.querySelectorAll('button').forEach((button, n) => {
    button.classList.toggle('active', n === index);
    button.setAttribute('aria-current', String(n === index));
  });
  if (postChanged) rail.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  $('#jump').value = String(p.id);
  $('#details').textContent =
    `${p.title || p.id} · ${p.format || 'Carousel'} · ${p.images?.length || 1} slides`;
  for (const k of ['like', 'save'])
    $('#' + k).classList.toggle('active', reactions.get(batch + ':' + p.id + ':' + k) === true);
  history.replaceState(
    null,
    '',
    `/feed?batch=${encodeURIComponent(batch)}&workspaceId=${encodeURIComponent(workspaceId)}&platform=${platform}${embedded ? '&embed=1' : ''}#post-${p.id}`,
  );
  if (embedded)
    parent.postMessage({ type: 'studio-post', batchId: batch, postId: p.id }, location.origin);
  if (p.images?.[slide + 1]) {
    const pre = new Image();
    pre.src = resource(p.images[slide + 1]);
  }
}
function movePost(n) {
  if (!posts.length) return;
  const next = Math.max(0, Math.min(posts.length - 1, index + n));
  if (next === index) {
    toast(n > 0 ? 'End of this batch' : 'First post');
    return;
  }
  index = next;
  render();
}
function moveSlide(n) {
  const p = posts[index];
  if (!p || p.videoFile) return;
  const next = Math.max(0, Math.min(p.images.length - 1, slide + n));
  if (next === slide) return;
  slide = next;
  render(false);
}
async function load(id) {
  const ticket = ++epoch;
  stop();
  batch = id;
  base = `/batches/${encodeURIComponent(id)}/`;
  try {
    const [r, m] = await Promise.all([
      fetch(base + 'manifest.json'),
      fetch(base + 'music-selection.json')
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
    ]);
    if (!r.ok) throw Error('Batch unavailable');
    const data = await r.json();
    if (ticket !== epoch) return;
    posts = data.posts.map((p) => ({ ...p, originalImages: p.images, originalCaption: p.caption }));
    for (const p of posts) {
      p.images = p.platformImages?.[platform] || p.images;
      p.caption = p.platformCaptions?.[platform] || p.caption;
    }
    music = ('posts' in m ? m.posts : {}) || {};
    rail.replaceChildren(
      ...posts.map((p, n) => {
        const b = document.createElement('button'),
          img = new Image();
        img.src = resource(p.images?.[0] || '');
        img.alt = p.title || String(p.id);
        img.loading = 'lazy';
        b.title = img.alt;
        const label = document.createElement('span');
        label.textContent = String(p.id);
        b.append(img, label);
        b.onclick = () => {
          index = n;
          render();
        };
        return b;
      }),
    );
    index = Math.max(
      0,
      posts.findIndex((p) => `#post-${p.id}` === location.hash),
    );
    $('#jump').replaceChildren(
      ...posts.map((p) => new Option(`${p.id} · ${p.title || p.slug}`, p.id)),
    );
    platformShell();
  } catch (e) {
    toast(e.message);
  }
}
$('#prev').onclick = () => movePost(-1);
$('#next').onclick = () => movePost(1);
$('#jump').onchange = (e) => {
  index = posts.findIndex((p) => String(p.id) === e.target.value);
  render();
};
$('#batch').onchange = (e) => load(e.target.value);
$('#shuffle').onclick = () => {
  for (let i = posts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [posts[i], posts[j]] = [posts[j], posts[i]];
  }
  index = 0;
  $('#jump').replaceChildren(
    ...posts.map((p) => new Option(`${p.id} · ${p.title || p.slug}`, p.id)),
  );
  render();
  toast('Batch shuffled locally');
};
$('#sound').onclick = () => {
  sound = !sound;
  soundLabel();
  audio.volume = 0.4;
  const v = phone.querySelector('video');
  if (v) v.muted = !sound;
  if (sound) play();
  else audio.pause();
};
$('#guides').onchange = (e) => phone.classList.toggle('guides', e.target.checked);
$('#caption-text').onclick = (e) => e.currentTarget.classList.toggle('expanded');
for (const k of ['like', 'save'])
  $('#' + k).onclick = () => {
    const key = batch + ':' + posts[index].id + ':' + k;
    reactions.set(key, !reactions.get(key));
    $('#' + k).classList.toggle('active', reactions.get(key));
    toast('Local preview only');
  };
$('#comment').onclick = () => {
  stop();
  $('#comments').showModal();
};
$('#close-comments').onclick = () => $('#comments').close();
$('#comments').onclose = play;
$('#share').onclick = () =>
  navigator.clipboard
    .writeText(location.href)
    .then(() => toast('Preview link copied'))
    .catch(() => toast('Copy the address from your browser'));
$('#mobile-tools').onclick = () => $('.workspace').classList.toggle('open');
$('#close-tools').onclick = () => $('.workspace').classList.remove('open');
phone.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button,dialog,textarea')) return;
  start = { x: e.clientX, y: e.clientY, id: e.pointerId };
  phone.setPointerCapture(e.pointerId);
});
phone.addEventListener('pointerup', (e) => {
  if (!start) return;
  const dx = e.clientX - start.x,
    dy = e.clientY - start.y;
  start = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 35) return;
  if (Math.abs(dx) > Math.abs(dy) * 1.15) moveSlide(dx < 0 ? 1 : -1);
  else if (Math.abs(dy) > Math.abs(dx) * 1.15) movePost(dy < 0 ? 1 : -1);
});
phone.addEventListener('pointercancel', () => (start = null));
phone.addEventListener(
  'wheel',
  (e) => {
    if ($('#comments').open) return;
    e.preventDefault();
    if (Date.now() - wheelAt < 650 || Math.max(Math.abs(e.deltaX), Math.abs(e.deltaY)) < 15) return;
    wheelAt = Date.now();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) moveSlide(Math.sign(e.deltaX));
    else movePost(Math.sign(e.deltaY));
  },
  { passive: false },
);
document.addEventListener('keydown', (e) => {
  if (
    (e.target instanceof Element && e.target.closest('input,select,textarea')) ||
    $('#comments').open
  )
    return;
  const actions = {
    ArrowUp: () => movePost(-1),
    ArrowDown: () => movePost(1),
    ArrowLeft: () => moveSlide(-1),
    ArrowRight: () => moveSlide(1),
    m: () => $('#sound').click(),
  };
  if (actions[e.key]) {
    e.preventDefault();
    actions[e.key]();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
});
addEventListener('pagehide', stop);
audio.onerror = () => {
  if (sound) toast('Selected music preview is unavailable');
};
try {
  const d = await (await fetch('/__batches')).json();
  $('#batch').replaceChildren(...d.batches.map((b) => new Option(`${b.id} (${b.count})`, b.id)));
  const requested = new URLSearchParams(location.search).get('batch');
  const id = d.batches.some((b) => b.id === requested) ? requested : d.current;
  $('#batch').value = id;
  await load(id);
} catch {
  toast('Could not load batches');
}
