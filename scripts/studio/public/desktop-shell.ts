const desktop = window.makepaceDesktop;
if (desktop) {
  document.documentElement.classList.add('desktop-app');
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/__studio/desktop-shell.css';
  document.head.append(stylesheet);
  const bar = document.createElement('div');
  bar.className = 'desktop-titlebar';
  bar.setAttribute('aria-label', 'MakePace window');
  bar.innerHTML = `<details class="desktop-menu"><summary aria-label="MakePace menu" title="MakePace menu"><img src="/__studio/mark.svg" alt=""><span>MakePace</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="desktop-menu-panel"><span class="desktop-menu-label">YOUR WORKSPACE</span><button data-action="workspace">Open workspace folder</button><button data-action="data">Open app data folder</button><hr><button data-action="reload">Reload window <kbd>Ctrl R</kbd></button><div class="desktop-zoom"><span>Zoom</span><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="zoom-reset">Reset</button><button data-action="zoom-in" aria-label="Zoom in">+</button></div><hr><button data-action="updates">Check for updates</button><button data-action="close">Close window</button></div></details><span class="desktop-title">Content studio</span><div class="desktop-window-controls"><button data-action="minimize" aria-label="Minimize" title="Minimize"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button><button data-action="maximize" aria-label="Maximize" title="Maximize"><svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2"/></svg></button><button data-action="close" aria-label="Close" title="Close"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>`;
  if (desktop.platform === 'darwin') {
    bar.classList.add('desktop-mac');
    bar.querySelector<HTMLElement>('.desktop-window-controls').remove();
    bar.querySelector('kbd').textContent = '⌘ R';
  }
  const menu = bar.querySelector('details');
  const context = document.createElement('div');
  context.id = 'desktop-context';
  bar.querySelector<HTMLElement>('.desktop-title').replaceWith(context);
  const pageHeading = document.createElement('div');
  pageHeading.className = 'page-heading';
  pageHeading.innerHTML = '<span></span><strong></strong>';
  document.addEventListener('makepace-view', (e) => {
    pageHeading.children[0].textContent = e.detail.workspace;
    pageHeading.children[1].textContent = e.detail.title;
    syncContext();
  });
  const syncContext = () => {
    const onboarding = document.body.classList.contains('onboarding-active'),
      chat = document.querySelector<HTMLElement>('.chat');
    const heading = document.querySelector<HTMLElement>('.chat-head');
    if (!onboarding && document.body.classList.contains('desk-chat') && heading) {
      if (heading.parentElement !== context) context.replaceChildren(heading);
      bar.classList.add('has-conversation');
    } else {
      if (heading?.parentElement === context && chat) chat.prepend(heading);
      if (!onboarding) context.replaceChildren(pageHeading);
      bar.classList.remove('has-conversation');
    }
  };
  new MutationObserver(syncContext).observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
  });
  bar.addEventListener('click', (event) => {
    const button =
      event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action]') : null;
    if (!button) return;
    void desktop
      .action(button.dataset.action, document.querySelector<HTMLSelectElement>('#workspace')?.value)
      .catch((error) => {
        const toast = document.querySelector<HTMLElement>('#toast');
        if (toast) {
          toast.textContent = error.message;
          toast.style.display = 'block';
        }
      });
    if (!button.closest('.desktop-zoom')) menu.open = false;
  });
  document.addEventListener('pointerdown', (event) => {
    if (!menu.contains(event.target as Node)) menu.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') menu.open = false;
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const action = {
      r: 'reload',
      '+': 'zoom-in',
      '=': 'zoom-in',
      '-': 'zoom-out',
      '0': 'zoom-reset',
    }[event.key.toLowerCase()];
    if (action) {
      event.preventDefault();
      void desktop.action(action);
    }
  });
  desktop.onWindowState((state) => {
    bar.classList.toggle('is-inactive', !state.focused);
    const button = bar.querySelector<HTMLElement>('[data-action="maximize"]');
    if (button) {
      button.title = state.maximized ? 'Restore window' : 'Maximize';
      button.setAttribute('aria-label', button.title);
      button.innerHTML = state.maximized
        ? '<svg viewBox="0 0 24 24"><path d="M9 5h10v10M5 9h10v10H5Z"/></svg>'
        : '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
    }
  });
  document.body.prepend(bar);
}
