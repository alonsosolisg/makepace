const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  shell,
  ipcMain,
  utilityProcess,
  safeStorage,
  nativeImage,
} = require('electron');
const { integrationStore } = require('./integrations.cjs');
const { oneUp } = require('./oneup.cjs');
const { apifyResearch } = require('./apify.cjs');
import { checkForUpdate } from './updates.cjs';
const path = require('node:path');
const fs = require('node:fs/promises');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { randomBytes } = require('node:crypto');
const root = path.resolve(__dirname, '..');
let window,
  backend,
  origin,
  quitting = false;
const token = randomBytes(32).toString('hex');
app.setName('MakePace');
if (process.env.MAKEPACE_DESKTOP_USER_DATA)
  app.setPath('userData', path.resolve(process.env.MAKEPACE_DESKTOP_USER_DATA));
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    window?.show();
    window?.focus();
  });
  app
    .whenReady()
    .then(start)
    .catch((error) => {
      if (process.env.MAKEPACE_DESKTOP_SMOKE) {
        console.error(error);
        app.exit(1);
      } else {
        dialog.showErrorBox('MakePace could not start', error.message);
        app.quit();
      }
    });
}
function bundledCodex() {
  const triples = {
    'linux-x64': 'x86_64-unknown-linux-musl',
    'linux-arm64': 'aarch64-unknown-linux-musl',
    'darwin-x64': 'x86_64-apple-darwin',
    'darwin-arm64': 'aarch64-apple-darwin',
    'win32-x64': 'x86_64-pc-windows-msvc',
    'win32-arm64': 'aarch64-pc-windows-msvc',
  };
  const platform = process.platform + '-' + process.arch,
    triple = triples[platform];
  const packagePath = require.resolve('@openai/codex-' + platform + '/package.json');
  return path.join(
    path.dirname(packagePath).replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep),
    'vendor',
    triple,
    'bin',
    process.platform === 'win32' ? 'codex.exe' : 'codex',
  );
}
async function start() {
  app.setName('MakePace');
  const userData = app.getPath('userData'),
    workspace = process.env.MAKEPACE_WORKSPACE_ROOT || path.join(userData, 'workspace');
  await fs.mkdir(workspace, { recursive: true });
  const codex = process.env.MAKEPACE_CODEX_PATH || bundledCodex();
  if (!existsSync(codex))
    throw Error('The bundled Codex executable is missing. Reinstall MakePace.');
  backend = utilityProcess.fork(path.join(root, 'scripts/serve-community-preview.mjs'), [], {
    cwd: workspace,
    serviceName: 'MakePace local workspace',
    stdio: 'pipe',
    env: {
      ...process.env,
      COMMUNITY_PREVIEW_PORT: '0',
      MAKEPACE_DATA_ROOT: path.join(userData, 'studio'),
      MAKEPACE_WORKSPACE_ROOT: workspace,
      MAKEPACE_CODEX_PATH: codex,
      MAKEPACE_DESKTOP_TOKEN: token,
    },
  });
  // Keep private backend output off renderer logs.
  backend.stdout?.on('data', () => {});
  backend.stderr?.on('data', () => {});
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('The local workspace did not start.')), 20000);
    backend.on('message', (message) => {
      if (message.type === 'ready') {
        clearTimeout(timeout);
        resolve(message.port);
      }
    });
    backend.once('exit', () => {
      clearTimeout(timeout);
      reject(Error('The local workspace stopped before it was ready.'));
    });
  });
  origin = 'http://127.0.0.1:' + port;
  const preferences = path.join(userData, 'ui-preferences.json');
  ipcMain.on('ui-preferences', (event, value) => {
    if (
      event.sender !== window?.webContents ||
      event.senderFrame !== window.webContents.mainFrame
    ) {
      event.returnValue = null;
      return;
    }
    try {
      if (value !== undefined) {
        if (!value || typeof value !== 'object' || Array.isArray(value))
          throw Error('Invalid preferences');
        const safe = Object.fromEntries(
          Object.entries(value).filter(
            ([key, v]) => key.startsWith('makepace-') && typeof v === 'string',
          ),
        );
        const json = JSON.stringify(safe);
        if (json.length > 1024 * 1024) throw Error('Preferences too large');
        writeFileSync(preferences, json, { mode: 0o600 });
        event.returnValue = true;
      } else event.returnValue = JSON.parse(readFileSync(preferences, 'utf8'));
    } catch {
      event.returnValue = null;
    }
  });
  window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 900,
    minHeight: 640,
    title: 'MakePace',
    backgroundColor: '#F5F2EB',
    show: false,
    frame: false,
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 16, y: 14 } }
      : {}),
    icon: path.join(root, 'scripts/studio/public/icons/icon-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  const ses = window.webContents.session;
  const integrations = integrationStore({ directory: userData, crypto: safeStorage });
  const collect = apifyResearch({
    withKey: (callback) => integrations.withCredential('Apify', callback),
  });
  backend.on('message', (message) => {
    if (message?.type !== 'research-request') return;
    void collect(message.action, message.args)
      .then((result) => backend.postMessage({ type: 'research-result', id: message.id, result }))
      .catch((error) =>
        backend.postMessage({ type: 'research-result', id: message.id, error: error.message }),
      );
  });
  const publisher = oneUp({
    directory: path.join(userData, 'publishing-receipts'),
    withKey: (callback) => integrations.withCredential('OneUp', callback),
  });
  const publishingPlans = new Map();
  ipcMain.handle(
    'publishing',
    async (
      event,
      action,
      data: {
        id?: string;
        postId?: string;
        index?: number;
        workspaceId?: string;
        categoryId?: string;
      } = {},
    ) => {
      if (
        event.sender !== window?.webContents ||
        event.senderFrame !== window.webContents.mainFrame
      )
        throw Error('Unsupported caller');
      if (!['overview', 'prepare', 'execute', 'reconcile', 'preview'].includes(action))
        throw Error('Unsupported publishing action');
      if (action === 'preview')
        return nativeImage
          .createFromBuffer(await publisher.preview(data.id, data.postId, data.index))
          .resize({ width: 600 })
          .toDataURL();
      if (action === 'reconcile') return { receipts: await publisher.reconcile(data.id) };
      if (action === 'execute') {
        const plan = publishingPlans.get(data.id);
        if (!plan) throw Error('Review the schedule first.');
        const confirmation = await dialog.showMessageBox(window, {
          type: 'question',
          title: 'Schedule this batch?',
          message: `Schedule ${plan.items.length} posts to ${plan.account.name} on ${plan.account.platform}?`,
          detail: `Times use ${plan.timezone}. Confirm this matches the account timezone in OneUp. Media will be uploaded publicly to OneUp.\n\n${plan.items
            .slice(0, 8)
            .map((i) => i.time + ' · ' + i.caption.slice(0, 65))
            .join('\n')}${plan.items.length > 8 ? '\n…see the complete plan in MakePace.' : ''}`,
          buttons: ['Cancel', 'Upload and schedule'],
          defaultId: 0,
          cancelId: 0,
        });
        if (confirmation.response !== 1) return { cancelled: true };
        return { receipts: await publisher.execute(data.id) };
      }
      if (typeof data.workspaceId !== 'string' || data.workspaceId === 'new')
        throw Error('Choose a saved workspace first.');
      const response = await fetch(origin + '/api/studio/workspace-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-MakePace-Desktop': token },
        body: JSON.stringify({ workspaceId: data.workspaceId }),
      });
      const target = await response.json();
      if (!response.ok) throw Error('Could not open the selected workspace.');
      await fs.copyFile(
        path.join(root, 'scripts/studio/publishing-guide.md'),
        path.join(target.path, 'MAKEPACE-PUBLISHING.md'),
      );
      if (action === 'overview') {
        const overview = await publisher.overview(data.categoryId);
        await fs.writeFile(
          path.join(target.path, 'publishing-context.json'),
          JSON.stringify(
            {
              generatedBy: 'MakePace — no credentials',
              fetchedAt: new Date().toISOString(),
              ...overview,
            },
            null,
            2,
          ),
        );
        return overview;
      }
      const plan = await publisher.prepare(target.path, data.workspaceId, data);
      publishingPlans.set(plan.id, plan);
      return plan;
    },
  );
  ipcMain.handle('integrations', (event, ...args) => {
    if (event.sender !== window?.webContents || event.senderFrame !== window.webContents.mainFrame)
      throw Error('Unsupported caller');
    return integrations(...args);
  });
  ipcMain.handle('desktop-action', async (event, action, workspaceId) => {
    if (event.sender !== window?.webContents || event.senderFrame !== window.webContents.mainFrame)
      throw Error('Unsupported caller');
    switch (action) {
      case 'minimize':
        window.minimize();
        break;
      case 'maximize':
        window.isMaximized() ? window.unmaximize() : window.maximize();
        break;
      case 'close':
        window.close();
        break;
      case 'workspace': {
        const response = await fetch(origin + '/api/studio/workspace-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-MakePace-Desktop': token },
          body: JSON.stringify({ workspaceId }),
        });
        const result = await response.json();
        if (!response.ok) throw Error(result.error);
        return shell.openPath(result.path);
      }
      case 'data':
        return shell.openPath(userData);
      case 'updates': {
        const current = app.getVersion();
        const update = await checkForUpdate(current);
        const result = await dialog.showMessageBox(window, {
          type: 'info',
          title: 'MakePace updates',
          message: update
            ? `MakePace ${update.version} is available`
            : `You're up to date (${current})`,
          detail: update
            ? 'Download the new installer from GitHub Releases. Your local workspaces stay on this computer.'
            : 'No newer release is available for your channel.',
          buttons: update ? ['View release', 'Later'] : ['Done'],
          defaultId: 0,
          cancelId: update ? 1 : 0,
        });
        if (update && result.response === 0) await shell.openExternal(update.url);
        break;
      }
      case 'reload':
        window.webContents.reload();
        break;
      case 'zoom-in':
        window.webContents.setZoomLevel(Math.min(3, window.webContents.getZoomLevel() + 0.5));
        break;
      case 'zoom-out':
        window.webContents.setZoomLevel(Math.max(-2, window.webContents.getZoomLevel() - 0.5));
        break;
      case 'zoom-reset':
        window.webContents.setZoomLevel(0);
        break;
      default:
        throw Error('Unknown desktop action');
    }
  });
  const sendWindowState = () =>
    window?.webContents.send('desktop-state', {
      maximized: window.isMaximized(),
      focused: window.isFocused(),
    });
  for (const event of ['maximize', 'unmaximize', 'focus', 'blur'])
    window.on(event, sendWindowState);
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    if (new URL(details.url).origin === origin)
      details.requestHeaders['X-MakePace-Desktop'] = token;
    callback({ requestHeaders: details.requestHeaders });
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== origin) {
      event.preventDefault();
      openExternal(url);
    }
  });
  backend.on('exit', () => {
    if (!quitting) {
      dialog.showErrorBox(
        'Local workspace stopped',
        'Restart MakePace to reconnect. Your workspace files are saved.',
      );
      app.quit();
    }
  });
  ipcMain.handle('provider-sign-in', (event, url) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame)
      throw Error('Unsupported caller');
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' ||
      !['auth.openai.com', 'chatgpt.com', 'auth0.openai.com'].includes(parsed.hostname)
    )
      throw Error('Unsupported sign-in URL');
    return shell.openExternal(parsed.href);
  });
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
      {
        label: 'MakePace',
        submenu: [
          { label: 'Open workspace folder', click: () => shell.openPath(workspace) },
          { label: 'Open app data folder', click: () => shell.openPath(userData) },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About MakePace',
            click: () =>
              dialog.showMessageBox(window, {
                message: 'MakePace',
                detail:
                  'Your local content powerhouse. Codex runs on this computer; model requests use your connected provider.',
              }),
          },
        ],
      },
    ]),
  );
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
  await window.loadURL(origin + '/studio');
  window.show();
  window.on('closed', () => {
    window = null;
    app.quit();
  });
  if (process.env.MAKEPACE_DESKTOP_SMOKE) {
    const out = path.resolve(process.env.MAKEPACE_DESKTOP_SMOKE);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const state = await window.webContents.executeJavaScript(
      '({desktop:!!window.makepaceDesktop,ready:document.documentElement.classList.contains("app-ready"),pwa:!!document.querySelector(".install-dialog")})',
    );
    if (!state.desktop || !state.ready || state.pwa)
      throw Error('Desktop smoke check failed: ' + JSON.stringify(state));
    await fs.mkdir(out, { recursive: true });
    await fs.writeFile(
      path.join(out, 'desktop.png'),
      (await window.webContents.capturePage()).toPNG(),
    );
    await window.webContents.executeJavaScript(
      'document.querySelector(".desktop-menu summary").click()',
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    await fs.writeFile(
      path.join(out, 'desktop-menu.png'),
      (await window.webContents.capturePage()).toPNG(),
    );
    state.menu = await window.webContents.executeJavaScript(
      'document.querySelector(".desktop-menu").open',
    );
    await window.webContents.executeJavaScript(
      'document.querySelector("[data-action=zoom-in]").click()',
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    state.zoom = window.webContents.getZoomLevel() === 0.5;
    await window.webContents.executeJavaScript(
      'document.querySelector("[data-action=zoom-reset]").click()',
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!state.menu || !state.zoom || window.webContents.getZoomLevel() !== 0)
      throw Error('Desktop menu action check failed');
    await window.reload();
    await new Promise((resolve) => setTimeout(resolve, 1800));
    state.shellCount = await window.webContents.executeJavaScript(
      'document.querySelectorAll(".desktop-titlebar").length',
    );
    if (state.shellCount !== 1) throw Error('Desktop shell duplicated after reload');
    // Exercise the same cached-frame restoration used during refresh, held long
    // enough to inspect its geometry before releasing the live shell.
    state.refreshFrame = await window.webContents.executeJavaScript(`(async()=>{
   dispatchEvent(new Event('pagehide'));
   (0,eval)(await (await fetch('/__studio/startup.js')).text());
   window.restoreStudioFrame();
   document.documentElement.classList.remove('app-ready');
   const frame=document.querySelector('#studio-frame'),bar=document.querySelector('.desktop-titlebar');
   return !!frame && frame.getBoundingClientRect().top===0 &&
    Number(getComputedStyle(frame).zIndex)>Number(getComputedStyle(bar).zIndex) &&
    getComputedStyle(bar).visibility==='hidden';
  })()`);
    if (!state.refreshFrame) throw Error('Refresh frame did not cover the rebuilding titlebar');
    await fs.writeFile(
      path.join(out, 'refresh-frame.png'),
      (await window.webContents.capturePage()).toPNG(),
    );
    await window.webContents.executeJavaScript(
      'document.documentElement.classList.add("app-ready");window.releaseStudioFrame()',
    );
    await window.webContents.executeJavaScript(
      'document.querySelector("[data-view=workflows]").click()',
    );
    await new Promise((resolve) => setTimeout(resolve, 150));
    state.pageHeader = await window.webContents.executeJavaScript(
      'document.querySelector("#desktop-context .page-heading strong")?.textContent==="Workflows"',
    );
    if (!state.pageHeader) throw Error('Page header did not follow navigation');
    await fs.writeFile(
      path.join(out, 'workflows.png'),
      (await window.webContents.capturePage()).toPNG(),
    );
    await window.webContents.executeJavaScript(
      'document.querySelector("[data-view=chat]").click()',
    );
    await new Promise((resolve) => setTimeout(resolve, 150));
    state.chatHeader = await window.webContents.executeJavaScript(
      '!!document.querySelector("#desktop-context .chat-head")',
    );
    if (!state.chatHeader) throw Error('Conversation header did not restore');
    if (process.env.MAKEPACE_DESKTOP_TEST_PARTNER) {
      await window.webContents.executeJavaScript('document.querySelector("#connect").click()');
      let deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        if (
          await window.webContents.executeJavaScript(
            'document.querySelector("#connect").hidden && !document.querySelector("#send").disabled',
          )
        )
          break;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      await window.webContents.executeJavaScript(
        'document.querySelector("#prompt").value="Reply with exactly the business name and its audience from the supplied context. Do not use tools.";document.querySelector("#composer").requestSubmit()',
      );
      deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        const reply = await window.webContents.executeJavaScript(
          'document.querySelector("#messages .assistant")?.textContent||""',
        );
        const idle = await window.webContents.executeJavaScript(
          '!document.querySelector("#send").disabled',
        );
        if (reply.includes('Cedar Test') && reply.includes('gardeners') && idle) {
          state.partnerReplied = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await fs.writeFile(
        path.join(out, 'partner.png'),
        (await window.webContents.capturePage()).toPNG(),
      );
      if (!state.partnerReplied)
        throw Error('Creative Partner did not reply with workspace context');
    }
    if (process.env.MAKEPACE_DESKTOP_TEST_CONNECT) {
      await window.webContents.executeJavaScript(
        'document.querySelector("#provider-connect").click()',
      );
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        if (
          await window.webContents.executeJavaScript('!!document.querySelector("#research-start")')
        ) {
          state.providerContinued = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      if (!state.providerContinued) throw Error('Provider did not advance to website');
      await fs.writeFile(
        path.join(out, 'website-after-connect.png'),
        (await window.webContents.capturePage()).toPNG(),
      );
    }
    await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(state));
    app.quit();
  }
}
function openExternal(url) {
  try {
    const u = new URL(url);
    if (['https:', 'http:'].includes(u.protocol)) void shell.openExternal(u.href);
  } catch {}
}
app.on('before-quit', (event) => {
  if (quitting || !backend) return;
  event.preventDefault();
  quitting = true;
  const timer = setTimeout(() => {
    backend?.kill();
    app.quit();
  }, 1500);
  backend.once('exit', () => {
    clearTimeout(timer);
    app.quit();
  });
  backend.postMessage({ type: 'shutdown' });
});
app.on('window-all-closed', () => app.quit());
