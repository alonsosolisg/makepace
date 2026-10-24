const { contextBridge, ipcRenderer } = require('electron');
// Restore before the UI's first script, independently of the private server port.
try {
  const saved = ipcRenderer.sendSync('ui-preferences');
  for (const [key, value] of Object.entries(saved || {}))
    if (key.startsWith('makepace-') && typeof value === 'string') localStorage.setItem(key, value);
  let previous = JSON.stringify(saved || {});
  const persist = () => {
    const state = Object.fromEntries(
      Object.keys(localStorage)
        .filter((key) => key.startsWith('makepace-'))
        .map((key) => [key, localStorage.getItem(key)]),
    );
    const next = JSON.stringify(state);
    if (next !== previous) {
      if (ipcRenderer.sendSync('ui-preferences', state)) previous = next;
    }
  };
  setInterval(persist, 1000);
  addEventListener('pagehide', persist);
} catch {}
contextBridge.exposeInMainWorld(
  'makepaceDesktop',
  Object.freeze({
    platform: process.platform,
    integrations: (action, service, token) =>
      ipcRenderer.invoke('integrations', action, service, token),
    publishing: (action, data) => ipcRenderer.invoke('publishing', action, data),
    action: (action, workspaceId) => ipcRenderer.invoke('desktop-action', action, workspaceId),
    onWindowState: (callback) => {
      const listener = (_event, state) => callback(state);
      ipcRenderer.on('desktop-state', listener);
      return () => ipcRenderer.removeListener('desktop-state', listener);
    },
    openSignIn: (url) => ipcRenderer.invoke('provider-sign-in', url),
  }),
);
