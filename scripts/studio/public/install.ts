let promptEvent = null;
let dialog: HTMLDialogElement | null = null;
const key = 'makepace-install-dismissed';
const standalone = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ios = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function remember() {
  try {
    localStorage.setItem(key, 'true');
  } catch {}
}
function dismissed() {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}
function updateButton() {
  if (dialog)
    dialog.querySelector<HTMLButtonElement>('#install-app').textContent = promptEvent
      ? 'Install MakePace'
      : 'How to install';
}
addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  promptEvent = event;
  updateButton();
});
addEventListener('appinstalled', () => {
  promptEvent = null;
  remember();
  dialog?.close();
});
function instructions() {
  if (ios())
    return 'Open the Share menu, choose Add to Home Screen, then tap Add. If your browser doesn’t offer it, open this page in Safari.';
  if (/Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent))
    return 'In Safari, choose File → Add to Dock, then Add.';
  if (/Firefox/.test(navigator.userAgent))
    return 'For desktop installation, open MakePace in Chrome or Edge and use the browser’s Install option.';
  return 'Use the install icon in the address bar, or open the browser menu and look for “Install MakePace” or “Install page as app”. If it is not available, you can continue in this browser.';
}
export function setupInstall() {
  if (window.makepaceDesktop) return;
  if ('serviceWorker' in navigator && isSecureContext)
    navigator.serviceWorker
      .register('/studio-sw.js', { scope: '/studio', updateViaCache: 'none' })
      .catch(() => {});
  if (standalone()) return;
  dialog = document.createElement('dialog');
  dialog.className = 'install-dialog';
  dialog.setAttribute('aria-labelledby', 'install-title');
  dialog.setAttribute('aria-describedby', 'install-copy');
  dialog.innerHTML =
    '<img class="install-icon" src="/__studio/icons/icon-192.png" width="64" height="64" alt=""><h2 id="install-title">MakePace, one click away.</h2><p id="install-copy">Give your content workspace a home of its own. Install MakePace for a dedicated window and quick access.</p><p id="install-help" hidden></p><p id="install-error" role="status"></p><button id="install-app" class="primary" type="button">How to install</button><button id="install-later" type="button">Continue in browser</button>';
  document.body.append(dialog);
  updateButton();
  dialog.querySelector<HTMLElement>('#install-later').onclick = () => {
    remember();
    dialog.close();
  };
  dialog.addEventListener('cancel', remember);
  dialog.querySelector<HTMLButtonElement>('#install-app').onclick = async () => {
    if (!promptEvent) {
      const help = dialog.querySelector<HTMLElement>('#install-help');
      help.hidden = false;
      help.textContent = instructions();
      return;
    }
    const event = promptEvent;
    promptEvent = null;
    const button = dialog.querySelector<HTMLButtonElement>('#install-app');
    button.disabled = true;
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === 'accepted') {
        remember();
        dialog.close();
      } else {
        const help = dialog.querySelector<HTMLElement>('#install-help');
        help.hidden = false;
        help.textContent = 'No problem. You can keep using MakePace in your browser.';
      }
    } catch {
      dialog.querySelector<HTMLElement>('#install-error').textContent =
        'The install prompt could not open. You can use your browser’s install menu instead.';
    } finally {
      button.disabled = false;
      updateButton();
    }
  };
  if (!dismissed()) dialog.showModal();
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'install-reopen';
  retry.textContent = 'Install MakePace';
  retry.onclick = () => dialog.showModal();
  document.querySelector<HTMLElement>('.sidebar-bottom')?.append(retry);
}
