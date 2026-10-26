export function setupSocialImport(host: HTMLElement, getWorkspace: () => string) {
  const section = document.createElement('details');
  section.className = 'social-import';
  section.innerHTML = `<summary>Already posting? Import your existing content</summary>
    <p>Use published posts as a starting point. Import captions, original links and available metrics from a public TikTok or Instagram profile. This does not recreate editable originals.</p>
    <form><label>Profile URL<input name="profile" type="url" required placeholder="https://www.tiktok.com/@yourbrand" /></label>
    <p>Uses your saved Apify connection. One bounded run, up to 20 results, with a requested $0.25 charge cap. Coverage depends on the scraper.</p>
    <button class="primary" type="submit">Import posts</button> <button type="button" data-check>Check import</button></form><p role="status"></p>`;
  host.append(section);
  const gallery = document.createElement('section');
  gallery.className = 'baseline-gallery';
  host.append(gallery);
  async function refreshBaseline() {
    const id = getWorkspace();
    gallery.replaceChildren();
    if (!id || id === 'new') return;
    try {
      const response = await fetch(
        '/api/studio/social-baseline?workspaceId=' + encodeURIComponent(id),
      );
      if (!response.ok) return;
      const baseline = await response.json();
      if (id !== getWorkspace() || !baseline.posts?.length) return;
      const title = document.createElement('h3');
      title.textContent = 'Your published content · ' + baseline.posts.length;
      gallery.append(title);
      const grid = document.createElement('div');
      grid.className = 'baseline-grid';
      for (const post of baseline.posts.slice(0, 60)) {
        const card = document.createElement('article');
        const caption = document.createElement('p');
        caption.textContent = post.caption.slice(0, 220) || 'Post without a caption';
        const metrics = document.createElement('small');
        metrics.textContent = ['views', 'likes', 'comments', 'saves']
          .map((k) => `${post.metrics[k] ?? '—'} ${k}`)
          .join(' · ');
        const link = document.createElement('a');
        const u = new URL(post.url);
        if (
          u.protocol !== 'https:' ||
          !['www.tiktok.com', 'tiktok.com', 'www.instagram.com', 'instagram.com'].includes(
            u.hostname,
          )
        )
          continue;
        link.href = u.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open original ↗';
        const date = document.createElement('small');
        date.textContent = `${post.platform} · observed ${String(post.observedAt).slice(0, 10)}`;
        card.append(date, caption, metrics, link);
        grid.append(card);
      }
      gallery.append(grid);
    } catch {
      /* The saved document remains accessible through Research outputs. */
    }
  }
  document.addEventListener('makepace-view', (event) => {
    if (event.detail.view === 'research') void refreshBaseline();
  });
  const form = section.querySelector('form'),
    notice = section.querySelector('[role=status]');
  let busy = false;
  async function request(action: string) {
    if (busy) return;
    const workspaceId = getWorkspace();
    if (!workspaceId || workspaceId === 'new') {
      notice.textContent = 'Create a workspace first.';
      return;
    }
    busy = true;
    section.querySelectorAll('button').forEach((b) => (b.disabled = true));
    notice.textContent = action === 'start' ? 'Starting collection…' : 'Checking collection…';
    try {
      const response = await fetch('/api/studio/social-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, workspaceId, url: new FormData(form).get('profile') }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Import failed.');
      if (workspaceId !== getWorkspace()) return;
      notice.textContent =
        data?.imported !== undefined
          ? `${data.imported} posts imported · ${data.total} in your baseline. Open “Published content baseline” in Research.`
          : data
            ? `Collection ${data.status.toLowerCase()}. Use Check import to retrieve the result; do not start another run.`
            : 'No import started in this workspace.';
      if (data?.imported !== undefined)
        document.dispatchEvent(new CustomEvent('makepace-view', { detail: { view: 'research' } }));
    } catch (error) {
      notice.textContent = error.message;
    } finally {
      busy = false;
      section.querySelectorAll('button').forEach((b) => (b.disabled = false));
    }
  }
  form.onsubmit = (event) => {
    event.preventDefault();
    void request('start');
  };
  section.querySelector<HTMLButtonElement>('[data-check]').onclick = () => void request('result');
}
