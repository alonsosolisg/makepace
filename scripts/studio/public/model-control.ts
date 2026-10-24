import { customSelect } from './select.js';
export const modelControlsReady = [];
let count = 0;
let saving = false;
const cacheKey = 'makepace-model-settings';
let saved;
try {
  saved = JSON.parse(localStorage.getItem(cacheKey));
} catch {}
let latest = ['gpt-6.1-sol', 'gpt-6-astra', 'gpt-6-luna'].includes(saved?.model) ? saved : null;
const initialSettings = fetch('/api/studio/state', { signal: AbortSignal.timeout(5000) })
  .then((r) => {
    if (!r.ok) throw Error('Settings unavailable');
    return r.json();
  })
  .then((s) => {
    latest = s.settings;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(latest));
    } catch {}
    return latest;
  });
// Install a handler immediately; each mounted control still shows fetch failures.
initialSettings.catch(() => {});
export function modelControl(host: HTMLElement) {
  host.innerHTML =
    '<select id="model-choice-' +
    ++count +
    '" aria-label="Codex model"><option value="gpt-6.1-sol">GPT-6.1 Sol</option><option value="gpt-6-astra">GPT-6 Astra</option><option value="gpt-6-luna">GPT-6 Luna</option></select><button class="model-fast" type="button" role="switch" aria-checked="false" title="Faster responses use more of your Codex allowance">Fast <span class="fast-track" aria-hidden="true"><span class="fast-thumb"><svg viewBox="0 0 256 256"><path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z"/></svg></span></span></button><small role="status"></small>';
  host.classList.add('model-control');
  const select = host.querySelector('select'),
    button = host.querySelector<HTMLElement>('.model-fast'),
    status = host.querySelector('small');
  customSelect(select);
  let current = latest || { model: 'gpt-6.1-sol', serviceTier: 'default' },
    syncing = false;
  const show = (s) => {
    current = s;
    if (select.value !== s.model) {
      syncing = true;
      select.value = s.model;
      select.dispatchEvent(new Event('change'));
      syncing = false;
    }
    button.setAttribute('aria-checked', String(s.serviceTier === 'fast'));
  };
  host.classList.toggle('model-pending', !latest);
  show(current);
  document.addEventListener('makepace-model-settings', (e) => {
    latest = e.detail;
    show(latest);
  });
  modelControlsReady.push(
    initialSettings
      .then(() => {
        show(latest);
        host.classList.remove('model-pending');
      })
      .catch(() => {
        host.classList.remove('model-pending');
        status.textContent = 'Settings unavailable';
      }),
  );
  async function update(patch) {
    if (saving) {
      show(current);
      return;
    }
    saving = true;
    host.setAttribute('aria-busy', 'true');
    status.textContent = '';
    const previous = current;
    host.classList.add('model-interacted');
    show({
      ...current,
      ...(patch.model ? { model: patch.model } : {}),
      ...(patch.fast === undefined ? {} : { serviceTier: patch.fast ? 'fast' : 'default' }),
    });
    try {
      const r = await fetch('/api/studio/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const s = await r.json();
      if (!r.ok) throw Error(s.error);
      latest = s;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(s));
      } catch {}
      host.classList.add('model-interacted');
      document.dispatchEvent(new CustomEvent('makepace-model-settings', { detail: s }));
    } catch (e) {
      show(previous);
      status.textContent = e.message;
    } finally {
      saving = false;
      host.removeAttribute('aria-busy');
    }
  }
  select.addEventListener('change', () => {
    if (!syncing) void update({ model: select.value });
  });
  button.onclick = () => update({ fast: button.getAttribute('aria-checked') !== 'true' });
}
