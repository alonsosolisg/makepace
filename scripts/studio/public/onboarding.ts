import { websiteIllustration } from './website-illustration.js';
import { providerIllustration, codexMark } from './provider-illustration.js';
import { liveFavicon } from './favicon.js';
import { researchWait } from './research-wait.js';
import { knowledgeMarkup, socialsMarkup } from './knowledge-review.js';
import { modelControl } from './model-control.js';
import { connectProvider } from './provider-connect.js';
const key = 'makepace-new-workspace-brief';
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const safeLink = (s) => {
  try {
    const u = new URL(s);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : '#';
  } catch {
    return '#';
  }
};
async function api(endpoint: string, data?: Record<string, unknown>) {
  const r = await fetch(
    '/api/studio/' + endpoint,
    data === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
  );
  const result = await r.json();
  if (!r.ok) throw Error(result.error || 'Something went wrong. Please retry.');
  return result;
}
let generation = 0;
let connectionUpdates;
export let onboardingReady = Promise.resolve();
export function onboarding(
  section: HTMLElement,
  done: (workspace: unknown) => void,
  reviewSaved = false,
) {
  let draft: { onboardingComplete?: boolean; researchId?: string; website?: string } = {};
  try {
    draft = JSON.parse(localStorage.getItem(key) || '{}');
  } catch {}
  if (draft.onboardingComplete && draft.researchId && !reviewSaved) return false;
  const current = ++generation;
  let connected = document.documentElement.dataset.codexConnected === 'true',
    job = null,
    pollTimer,
    stage = '';
  connectionUpdates?.abort();
  connectionUpdates = new AbortController();
  document.addEventListener(
    'makepace-connection',
    (e) => {
      if (!live()) return;
      connected = Boolean(e.detail.connected);
      if (connected && stage === 'provider') {
        resume();
        return;
      }
      const row = section.querySelector<HTMLElement>('.setup-connection');
      if (!row) return;
      row.children[0].classList.toggle('connected-dot', connected);
      row.children[1].textContent = connected
        ? 'Codex connected'
        : e.detail.status === 'reconnecting'
          ? 'Reconnecting to Codex…'
          : e.detail.status === 'sign-in-required'
            ? 'Sign in to Codex, then reconnect'
            : 'Connect Codex to explore your website';
      const button = row.querySelector('button');
      if (button) button.hidden = connected;
      const submit = section.querySelector<HTMLButtonElement>(
        '#research-start button[type=submit]',
      );
      if (submit) submit.disabled = !connected;
    },
    { signal: connectionUpdates.signal },
  );
  const live = () =>
    current === generation && document.body.classList.contains('onboarding-active');
  const save = () => {
    try {
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {}
  };
  document.body.classList.add('onboarding-active');
  function shell(content, wide = false, provider = false) {
    section.innerHTML = `<div class="setup-shell"><header class="setup-header"><a class="brand" href="/studio"><img class="mark" src="/__studio/mark.svg" alt=""><div>MakePace</div></a><button type="button" id="exit-onboarding">Back to workspace <span aria-hidden="true">↗</span></button></header><div class="setup-content ${wide ? 'setup-wide' : ''}">${content}</div></div>`;
    const workspace = document.querySelector<HTMLSelectElement>('#workspace');
    const otherWorkspace = [...(workspace?.options || [])].find(
      (o) => !o.disabled && o.value !== workspace.value,
    );
    const back = section.querySelector<HTMLElement>('#exit-onboarding');
    back.hidden = !otherWorkspace;
    back.onclick = () => {
      if (!otherWorkspace) return;
      clearTimeout(pollTimer);
      generation++;
      workspace.value = otherWorkspace.value;
      workspace.dispatchEvent(new Event('change'));
    };
    const controls = document.createElement('div');
    controls.className = 'setup-controls';
    const options = document.createElement('div');
    controls.append(section.querySelector<HTMLElement>('#exit-onboarding'), options);
    if (provider && !otherWorkspace) controls.hidden = true;
    section.querySelector<HTMLElement>('.setup-header').append(controls);
    if (!provider) modelControl(options);
    const desktopContext = document.querySelector<HTMLElement>('#desktop-context');
    if (desktopContext) {
      const conversationHeader = desktopContext.querySelector<HTMLElement>('.chat-head');
      if (conversationHeader)
        document.querySelector<HTMLElement>('.chat').prepend(conversationHeader);
      desktopContext.replaceChildren(controls);
    }
  }
  function error(message) {
    const target = section.querySelector<HTMLElement>('[role="alert"]');
    if (target) target.textContent = message;
  }
  function provider() {
    stage = 'provider';
    shell(
      `<div class="provider-step">${providerIllustration}<h1>Start with Codex.</h1><p class="setup-description">Connect Codex to turn your ideas into content.<br>Start with your ChatGPT account.</p><button class="primary provider-connect" id="provider-connect">${codexMark}<span>Connect Codex</span><svg class="icon" aria-hidden="true"><use href="/__studio/phosphor.svg#arrow-up-right"></use></svg></button><p class="provider-hint" role="status">You’ll sign in securely in your browser.</p><p role="alert" class="setup-error"></p></div>`,
      false,
      true,
    );
    const button = section.querySelector<HTMLButtonElement>('#provider-connect'),
      label = button.querySelector('span'),
      hint = section.querySelector<HTMLElement>('.provider-hint');
    button.onclick = async () => {
      button.disabled = true;
      label.textContent = 'Connecting…';
      error('');
      section.querySelector<HTMLElement>('.provider-step').classList.add('is-connecting');
      try {
        await connectProvider((status) => {
          if (live() && stage === 'provider' && status === 'browser') {
            label.textContent = 'Waiting for sign-in…';
            hint.textContent = 'Finish signing in in your browser. We’ll take it from there.';
          }
        });
        connected = true;
        if (live() && stage === 'provider') resume();
      } catch (e) {
        if (live() && stage === 'provider') {
          button.disabled = false;
          label.textContent = 'Try connecting again';
          section.querySelector<HTMLElement>('.provider-step').classList.remove('is-connecting');
          hint.textContent = 'Your workspace will be here when you’re connected.';
          error(e.message);
        }
      }
    };
  }
  function resume() {
    if (draft.researchId) {
      stage = 'research';
      job = { website: draft.website || '', activity: 'Restoring your research' };
      progress();
      return poll();
    }
    website();
    return Promise.resolve();
  }
  function website() {
    stage = 'website';
    shell(
      `<div class="setup-intro">${websiteIllustration}<h1>Start with your website.</h1><p class="setup-description">We’ll learn what you sell, who it’s for, and where you post.</p></div><form id="research-start"><label class="sr-only" for="setup-url">Your website</label><div class="website-entry"><svg class="icon" aria-hidden="true"><use href="/__studio/phosphor.svg#plugs-connected"></use></svg><input id="setup-url" name="website" placeholder="yourcompany.com" inputmode="url" autocomplete="url" autocapitalize="off" spellcheck="false" value="${esc(draft.website || '')}"><button class="primary" type="submit" aria-label="Research website" title="Research website" ${connected ? '' : 'disabled'}><svg class="icon" aria-hidden="true"><use href="/__studio/phosphor.svg#arrow-up"></use></svg></button></div><p role="alert" class="setup-error"></p></form><div class="setup-connection"><span class="${connected ? 'connected-dot' : ''}"></span><span>${connected ? 'Codex connected' : 'Connect Codex to explore your website'}</span><button id="setup-connect" type="button" ${connected ? 'hidden' : ''}>Connect Codex</button></div>`,
    );
    const form = section.querySelector('form'),
      input = form.elements.namedItem('website') as HTMLInputElement;
    liveFavicon(input);
    input.oninput = () => {
      draft.website = input.value;
      save();
    };
    const connect = section.querySelector<HTMLButtonElement>('#setup-connect');
    if (connect)
      connect.onclick = async () => {
        connect.disabled = true;
        connect.textContent = 'Connecting…';
        try {
          await connectProvider();
          connected = true;
          if (live()) website();
        } catch (e) {
          if (live()) {
            connect.disabled = false;
            connect.textContent = 'Retry connection';
            error(e.message);
          }
        }
      };
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!connected) {
        error('Connect Codex first.');
        return;
      }
      draft.website = input.value.trim();
      save();
      const button = form.querySelector('button');
      button.disabled = true;
      try {
        job = await api('research', { website: draft.website });
        draft.researchId = job.id;
        save();
        if (live()) {
          progress();
          poll();
        }
      } catch (e) {
        if (live()) {
          button.disabled = false;
          error(e.message);
        }
      }
    };
  }
  function progress() {
    if (!section.querySelector<HTMLElement>('.research-wait'))
      shell('<div class="research-wait-host"></div>');
    researchWait(section.querySelector<HTMLElement>('.research-wait-host'), job);
  }
  async function poll() {
    try {
      const next = await api('research?id=' + encodeURIComponent(draft.researchId));
      if (!live()) return;
      const changed = JSON.stringify(next) !== JSON.stringify(job);
      job = next;
      if (['ready', 'confirmed'].includes(job.status)) {
        review();
        return;
      }
      if (job.status === 'failed') {
        failed();
        return;
      }
      if (changed) progress();
      pollTimer = setTimeout(poll, 2000);
    } catch (e) {
      if (live()) {
        job = { ...job, error: e.message };
        failed();
      }
    }
  }
  function failed() {
    shell(
      `<div class="setup-symbol">!</div><h1>Let’s try that again.</h1><p class="setup-description">${esc(job.error || 'Research could not finish.')}</p><button class="primary" id="research-retry">Back to website</button><p role="alert" class="setup-error"></p>`,
    );
    section.querySelector<HTMLElement>('#research-retry').onclick = () => {
      delete draft.researchId;
      save();
      website();
    };
  }
  function review() {
    const k = job.confirmedKnowledge || job.knowledge;
    shell(knowledgeMarkup(job), true);
    async function refreshSocials() {
      const next = await api('research?id=' + encodeURIComponent(job.id));
      if (!live()) return;
      job = next;
      section.querySelector<HTMLElement>('.social-discovery').innerHTML = socialsMarkup(job);
      bindSocials();
      if (job.socialChecking)
        pollTimer = setTimeout(() => refreshSocials().catch((e) => error(e.message)), 2000);
    }
    function bindSocials() {
      section.querySelector<HTMLElement>('#check-socials').onclick = async () => {
        try {
          job = await api('research-socials', { id: job.id });
          await refreshSocials();
        } catch (e) {
          error(e.message);
        }
      };
      section.querySelectorAll<HTMLButtonElement>('[data-social-decision]').forEach(
        (button) =>
          (button.onclick = async () => {
            button.disabled = true;
            try {
              job = await api('research-social-review', {
                id: job.id,
                url: button.dataset.socialUrl,
                decision: button.dataset.socialDecision,
              });
              section.querySelector<HTMLElement>('.social-discovery').innerHTML =
                socialsMarkup(job);
              bindSocials();
            } catch (e) {
              button.disabled = false;
              error(e.message);
            }
          }),
      );
    }
    bindSocials();
    if (job.socialChecking)
      pollTimer = setTimeout(() => refreshSocials().catch((e) => error(e.message)), 2000);
    section.querySelector<HTMLElement>('#research-another').onclick = () => {
      draft = { website: '' };
      save();
      website();
    };
    const form = section.querySelector('form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const button = section.querySelector<HTMLButtonElement>('#knowledge-continue');
      button.disabled = true;
      try {
        const knowledge = Object.fromEntries(new FormData(form));
        const confirmed = await api('research-confirm', { id: job.id, knowledge });
        clearTimeout(pollTimer);
        draft = confirmed.workspace;
        save();
        document.body.classList.remove('onboarding-active');
        document.dispatchEvent(
          new CustomEvent('makepace-workspace-created', { detail: confirmed.workspace }),
        );
      } catch (e) {
        button.disabled = false;
        error(e.message);
      }
    };
  }
  if (connected) onboardingReady = resume();
  else {
    provider();
    onboardingReady = Promise.resolve();
  }
  return true;
}
