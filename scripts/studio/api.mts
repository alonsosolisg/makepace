import fs from 'node:fs/promises';
import type { StudioState } from '../../types/state.js';
import type { ServerResponse } from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { CodexConnection } from './codex.mjs';
import { CodexSession } from './reconnect.mjs';
import {
  startResearch,
  getResearch,
  researchImage,
  confirmResearch,
  retrySocials,
  reviewSocial,
} from './research.mjs';
import { favicon, savedFavicon } from './favicon.mjs';
import { modelSettings, turnSettings } from './model-settings.mjs';
import { workspacePartnerContext } from './partner-context.mjs';
import { appRoot, dataRoot, workspaceRoot, outputRoot } from './paths.mjs';
import { pathToFileURL } from 'node:url';
import { recordTool, settleTools } from './tool-activity.mjs';
import { editConversation } from './conversations.mjs';
import { collectOutputs, registerOutputs, readOutput } from './outputs.mjs';
import { classifyEvidence } from './research-evidence.mjs';
import { researchTools, runResearchTool, desktopResearch } from './research-tools.mjs';
import { saveBaseline } from './social-baseline.mjs';
import { visualFormats } from './format-library.mjs';
const cwd = workspaceRoot,
  output = outputRoot,
  stateFile = path.join(dataRoot, 'state.json');
const codex = new CodexConnection(),
  clients = new Set<ServerResponse>(),
  loadedThreads = new Set(),
  requests = new Map();
const session = new CodexSession(codex);
const importLocks = new Set();
let state: StudioState = { conversations: {}, reviews: {} },
  account = null,
  active = null,
  starting = false,
  saveChain = Promise.resolve();
try {
  state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
for (const c of Object.values(state.conversations)) {
  settleTools(c.messages);
  c.messages = c.messages.filter(
    (m) => !(m.role === 'output' && m.output?.path === 'research/content-format-research.json'),
  );
}
const save = () => {
  const data = JSON.stringify(state, null, 2);
  saveChain = saveChain.then(async () => {
    await fs.mkdir(path.dirname(stateFile), { recursive: true, mode: 0o700 });
    await fs.writeFile(stateFile + '.tmp', data, { mode: 0o600 });
    await fs.rename(stateFile + '.tmp', stateFile);
  });
  return saveChain;
};
function publicState() {
  return {
    settings: modelSettings(state.fastMode === true, state.model),
    connected: Boolean(account),
    connectionStatus: session.status,
    accountType: account?.type,
    active,
    conversations: state.conversations,
    reviews: state.reviews,
    requests: [...requests.values()],
  };
}
function broadcast() {
  const data = 'data: ' + JSON.stringify(publicState()) + '\n\n';
  for (const r of clients) r.write(data);
}
session.on('change', () => {
  account = session.account;
  broadcast();
});
if (state.autoReconnect && process.env.MAKEPACE_AUTO_CONNECT !== '0')
  void session.connect().catch(() => {});
const conversation = (id) => (state.conversations[id] ??= { messages: [], threadId: null });
// Recover known saved deliverables already referenced by older conversations.
void (async () => {
  let changed = false;
  for (const workspace of Object.values(state.workspaces || {})) {
    const root = workspacePartnerContext(state.workspaces, workspace.id, cwd).cwd;
    const outputs = await collectOutputs(root).catch(() => []);
    for (const [key, c] of Object.entries(state.conversations))
      if (
        key === 'workspace:' + workspace.id ||
        key.startsWith('workspace:' + workspace.id + ':')
      ) {
        for (const output of outputs) {
          const mentioned = c.messages.some(
            (m) =>
              m.role === 'assistant' && String(m.text).replaceAll('\\', '/').includes(output.path),
          );
          if (mentioned && !c.messages.some((m) => m.output?.id === output.id)) {
            c.messages.push({ role: 'output', id: 'output-' + output.id, output });
            changed = true;
          }
        }
      }
  }
  if (changed) {
    await save();
    broadcast();
  }
})().catch(() => {});
const batchPath = (id) => {
  if (typeof id !== 'string' || !/^hm-[a-z0-9-]+$/.test(id)) throw Error('Invalid batch');
  return path.join(output, id);
};
async function manifest(id) {
  const m = JSON.parse(await fs.readFile(path.join(batchPath(id), 'manifest.json'), 'utf8'));
  if (!Array.isArray(m.posts)) throw Error('Batch has no posts');
  return m;
}
async function prepareWorkspace(id) {
  let target = workspacePartnerContext(state.workspaces, id, cwd);
  const workspace = state.workspaces[id];
  const research = workspace.researchId ? await getResearch(workspace.researchId) : null;
  const knowledge = research?.confirmedKnowledge ||
    research?.knowledge || { offering: workspace.product, audience: workspace.audience };
  target = workspacePartnerContext(state.workspaces, id, cwd, knowledge);
  await fs.mkdir(target.cwd, { recursive: true });
  // Generated copy for the user and local agent; canonical knowledge stays in app data.
  await fs.writeFile(
    path.join(target.cwd, 'workspace-knowledge.json'),
    JSON.stringify(
      {
        generatedBy: 'MakePace — managed copy of onboarding knowledge',
        name: workspace.name,
        website: workspace.website,
        knowledge,
      },
      null,
      2,
    ),
  );
  await fs.copyFile(
    path.join(appRoot, 'scripts/studio/publishing-guide.md'),
    path.join(target.cwd, 'MAKEPACE-PUBLISHING.md'),
  );
  await fs.copyFile(
    path.join(appRoot, 'scripts/studio/research-guide.md'),
    path.join(target.cwd, 'MAKEPACE-RESEARCH.md'),
  );
  await fs.copyFile(
    path.join(appRoot, 'scripts/studio/research-sources.md'),
    path.join(target.cwd, 'MAKEPACE-SOURCES.md'),
  );
  await fs.copyFile(
    path.join(appRoot, 'scripts/studio/output-guide.md'),
    path.join(target.cwd, 'MAKEPACE-OUTPUTS.md'),
  );
  return target;
}
codex.on('disconnected', () => {
  account = null;
  loadedThreads.clear();
  requests.clear();
  if (active) {
    settleTools(conversation(active.batch).messages);
    conversation(active.batch).messages.push({
      role: 'status',
      text: 'Codex disconnected. The turn may have been interrupted; review before retrying.',
    });
    active = null;
    void save();
  }
  broadcast();
});
codex.on('event', (m) => {
  const p = m.params || {};
  if (m.method === 'account/login/completed' && p.success) {
    void session
      .connect()
      .then(async () => {
        state.autoReconnect = true;
        await save();
        broadcast();
      })
      .catch(() => {});
  }
  if (m.id !== undefined) {
    if (m.method === 'item/tool/call') {
      const work = active;
      void (async () => {
        try {
          if (!work || p.threadId !== work.threadId)
            throw Error('Research call does not belong to the active workspace.');
          codex.respond(m.id, await runResearchTool(p.tool, p.arguments, work));
        } catch (e) {
          codex.respond(m.id, {
            success: false,
            contentItems: [{ type: 'inputText', text: e.message }],
          });
        }
      })();
      return;
    }
    if (
      [
        'item/commandExecution/requestApproval',
        'item/fileChange/requestApproval',
        'item/tool/requestUserInput',
      ].includes(m.method)
    )
      requests.set(String(m.id), {
        id: m.id,
        method: m.method,
        reason: p.reason,
        command: p.command,
        questions: p.questions,
      });
    else {
      codex.send({
        id: m.id,
        error: {
          code: -32601,
          message:
            'This Studio version does not support this interactive request; explain the required action to the user.',
        },
      });
    }
    broadcast();
    return;
  }
  if (!active || (p.threadId && p.threadId !== active.threadId)) return;
  const c = conversation(active.batch);
  if (m.method === 'item/agentMessage/delta') {
    let msg = c.messages.find((x) => x.id === p.itemId);
    if (!msg) {
      msg = { role: 'assistant', id: p.itemId, text: '' };
      c.messages.push(msg);
    }
    msg.text += p.delta;
  } else if (m.method === 'item/completed' && p.item?.type === 'agentMessage') {
    const msg = c.messages.find((x) => x.id === p.item.id);
    if (msg) msg.text = p.item.text;
    else c.messages.push({ role: 'assistant', id: p.item.id, text: p.item.text });
    void save();
  } else if (m.method === 'item/started' || m.method === 'item/completed') {
    const tool = recordTool(c.messages, p.item, m.method === 'item/completed');
    if (tool) {
      active.activity = tool.status === 'running' ? tool.label : 'Working on your response';
      void save();
    }
  } else if (m.method === 'turn/started') {
    active.turnId = p.turn.id;
  } else if (m.method === 'turn/completed') {
    settleTools(c.messages);
    const completed = active;
    if (completed.cwd)
      void registerOutputs(c, completed.cwd, completed.outputsBefore || [])
        .then(() => save())
        .then(broadcast)
        .catch(() => {
          c.messages.push({
            role: 'status',
            text: 'The output index could not be read. Check makepace-outputs.json and its registered files.',
          });
          void save().then(broadcast);
        });
    if (p.turn.status !== 'completed')
      c.messages.push({
        role: 'status',
        text: `Turn ${p.turn.status}: ${p.turn.error?.message || 'Work stopped.'}`,
      });
    active = null;
    requests.clear();
    void save();
  } else if (m.method === 'error') {
    c.messages.push({ role: 'status', text: p.error?.message || 'Codex reported an error' });
  }
  broadcast();
});
async function body(req) {
  let s = '';
  for await (const c of req) {
    s += c;
    if (s.length > 50000) throw Error('Request too large');
  }
  return JSON.parse(s || '{}');
}
const json = (res, code, data) =>
  res
    .writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    .end(JSON.stringify(data));
export async function studioAPI(req, res, url) {
  if (!url.pathname.startsWith('/api/studio/')) return false;
  // Local app, not a public remote shell. Reject cross-origin mutations and hostile Host headers.
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(new URL('http://' + req.headers.host).hostname)
  ) {
    json(res, 403, { error: 'Use localhost to open Studio' });
    return true;
  }
  if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) {
    json(res, 403, { error: 'Origin not allowed' });
    return true;
  }
  let ownsStart = false;
  try {
    const endpoint = url.pathname.slice('/api/studio/'.length);
    if (req.method === 'GET' && endpoint === 'events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
      });
      clients.add(res);
      res.write('data: ' + JSON.stringify(publicState()) + '\n\n');
      const t = setInterval(() => res.write(': heartbeat\n\n'), 15000);
      req.on('close', () => {
        clearInterval(t);
        clients.delete(res);
      });
      return true;
    }
    if (req.method === 'GET' && endpoint === 'state') {
      json(res, 200, publicState());
      return true;
    }
    if (req.method === 'GET' && endpoint === 'workspaces') {
      json(res, 200, Object.values(state.workspaces || {}));
      return true;
    }
    if (req.method === 'GET' && endpoint === 'preview-brand') {
      const id = url.searchParams.get('workspaceId');
      const workspace = state.workspaces?.[id];
      if (id !== 'hey-mom' && !workspace) throw Error('Unknown workspace');
      json(res, 200, {
        name: workspace?.name || 'Hey Mom App',
        favicon: workspace?.favicon || (id === 'hey-mom' ? '/__studio/hey-mom-icon.svg' : null),
      });
      return true;
    }
    if (req.method === 'GET' && endpoint === 'social-baseline') {
      const id = url.searchParams.get('workspaceId');
      const root = id === 'hey-mom' ? cwd : workspacePartnerContext(state.workspaces, id, cwd).cwd;
      try {
        const file = await readOutput(root, 'research/social-baseline.json');
        json(res, 200, JSON.parse(file.data.toString('utf8')));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        json(res, 200, { posts: [] });
      }
      return true;
    }
    if (req.method === 'GET' && ['outputs', 'output'].includes(endpoint)) {
      const id = url.searchParams.get('workspaceId'),
        root = id === 'hey-mom' ? cwd : workspacePartnerContext(state.workspaces, id, cwd).cwd;
      const outputs = await collectOutputs(root);
      if (endpoint === 'outputs') {
        json(res, 200, { outputs });
        return true;
      }
      const output = outputs.find((o) => o.id === url.searchParams.get('id'));
      if (!output) throw Error('This output version is no longer available.');
      const file = await readOutput(root, output.path);
      if (file.type === 'image') {
        const mime = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.webp': 'image/webp',
        }[file.extension];
        res
          .writeHead(200, {
            'Content-Type': mime,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          })
          .end(file.data);
      } else json(res, 200, { ...output, text: file.data.toString('utf8') });
      return true;
    }
    if (req.method === 'GET' && endpoint === 'research-evidence') {
      const id = url.searchParams.get('workspaceId');
      const target =
        id === 'hey-mom' ? cwd : workspacePartnerContext(state.workspaces, id, cwd).cwd;
      let data = { findings: [] };
      try {
        const root = await fs.realpath(target),
          file = await fs.realpath(path.join(root, 'research-evidence.json'));
        if (path.dirname(file) !== root) throw Error('Evidence must stay in its workspace');
        if ((await fs.stat(file)).size > 512000) throw Error('Research evidence is too large');
        data = JSON.parse(await fs.readFile(file, 'utf8'));
        if (!Array.isArray(data.findings)) throw Error('Invalid research evidence');
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
      json(res, 200, classifyEvidence(data, state.workspaces?.[id]?.website));
      return true;
    }
    if (req.method === 'GET' && endpoint === 'favicon') {
      json(res, 200, await favicon(url.searchParams.get('website')));
      return true;
    }
    if (req.method === 'GET' && endpoint === 'research') {
      json(res, 200, await getResearch(url.searchParams.get('id')));
      return true;
    }
    if (req.method === 'GET' && endpoint === 'research-image') {
      const image = await researchImage(url.searchParams.get('id'));
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' }).end(image);
      return true;
    }
    if (req.method === 'GET' && endpoint === 'formats') {
      json(res, 200, await visualFormats(cwd));
      return true;
    }
    if (req.method === 'GET' && endpoint === 'queue') {
      const { queue } = await import(
        pathToFileURL(path.join(cwd, 'scripts/oneup-carousel-api.mjs')).href
      ).catch(() => {
        throw Error('Connect a workspace with a OneUp integration to view its queue.');
      });
      json(
        res,
        200,
        (await queue())
          .filter((x) => x.social_network_username === 'heymomapp')
          .map(({ post_id, content, date_time }) => ({
            id: post_id,
            caption: content,
            time: date_time,
          })),
      );
      return true;
    }
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not supported' });
      return true;
    }
    if (!req.headers['content-type']?.startsWith('application/json')) {
      json(res, 415, { error: 'JSON required' });
      return true;
    }
    const data = await body(req);
    if (endpoint === 'social-import') {
      const id = data.workspaceId;
      if (importLocks.has(id)) throw Error('An import request is already in progress.');
      importLocks.add(id);
      try {
        const target =
          id === 'hey-mom' ? cwd : workspacePartnerContext(state.workspaces, id, cwd).cwd;
        state.socialImports ??= {};
        const previous = state.socialImports[id];
        if (data.action === 'start') {
          if (
            previous &&
            !['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(previous.status)
          )
            throw Error('An import is already running. Check its status before starting another.');
          const u = new URL(data.url);
          const platform = u.hostname.replace(/^www\./, '').split('.')[0];
          if (
            u.protocol !== 'https:' ||
            !['tiktok', 'instagram'].includes(platform) ||
            !['www.' + platform + '.com', platform + '.com'].includes(u.hostname) ||
            !/^\/@?[\w.]+\/?$/.test(u.pathname)
          )
            throw Error('Enter a public TikTok or Instagram profile URL.');
          const result = await desktopResearch('start', { platform, urls: [u.href], limit: 20 });
          state.socialImports[id] = { ...result, platform, url: u.href };
          await save();
          json(res, 200, state.socialImports[id]);
        } else if (data.action === 'result' && previous) {
          if (previous.imported !== undefined) {
            json(res, 200, previous);
            return true;
          }
          const result = await desktopResearch('result', { runId: previous.runId });
          const summary = result.items
            ? await saveBaseline(target, result, previous.platform, previous.url)
            : {};
          state.socialImports[id] = { ...previous, status: result.status, ...summary };
          await save();
          json(res, 200, state.socialImports[id]);
        } else if (data.action === 'status') json(res, 200, previous || null);
        else throw Error('No import to check.');
      } finally {
        importLocks.delete(id);
      }
    } else if (endpoint === 'connect') {
      account = await session.connect();
      if (!account) throw Error('Sign in with codex login in your terminal, then reconnect');
      state.autoReconnect = true;
      await save();
      broadcast();
      json(res, 200, { connected: true, accountType: account.type });
    } else if (endpoint === 'provider-login') {
      if (!process.env.MAKEPACE_DESKTOP_TOKEN) throw Error('Use the desktop app to sign in.');
      await codex.connect();
      const result = await codex.rpc('account/login/start', { type: 'chatgpt' });
      json(res, 200, { authUrl: result.authUrl });
    } else if (endpoint === 'workspace-folder') {
      const target =
        data.workspaceId && data.workspaceId !== 'hey-mom' && data.workspaceId !== 'new'
          ? await prepareWorkspace(data.workspaceId)
          : { cwd };
      json(res, 200, { path: target.cwd });
    } else if (endpoint === 'settings') {
      if (data.fast !== undefined && typeof data.fast !== 'boolean')
        throw Error('Choose Standard or Fast.');
      const settings = modelSettings(
        data.fast ?? state.fastMode === true,
        data.model ?? state.model,
      );
      state.fastMode = settings.serviceTier === 'fast';
      state.model = settings.model;
      await save();
      broadcast();
      json(res, 200, settings);
    } else if (endpoint === 'research') {
      if (!account) throw Error('Connect Codex first.');
      json(
        res,
        200,
        await startResearch(data.website, modelSettings(state.fastMode === true, state.model)),
      );
    } else if (endpoint === 'research-confirm') {
      const job = await confirmResearch(data.id, data.knowledge || {});
      const k = job.confirmedKnowledge;
      state.workspaces ??= {};
      const site = (url) => new URL(url).hostname.replace(/^www\./, '').toLowerCase();
      const existing = Object.values(state.workspaces).find(
        (w) => site(w.website) === site(job.website),
      );
      const icon = existing?.favicon || (await savedFavicon(job.website));
      const workspace = {
        id: existing?.id || job.id,
        name: k.name,
        website: job.website,
        researchId: job.id,
        product: k.offering,
        audience: k.audience,
        favicon: icon,
        onboardingComplete: true,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      state.workspaces[workspace.id] = workspace;
      await save();
      json(res, 200, { ...job, workspace });
    } else if (endpoint === 'workspace-remove') {
      if (!state.workspaces?.[data.id]) throw Error('Unknown workspace');
      delete state.workspaces[data.id];
      await save();
      json(res, 200, { removed: true });
    } else if (endpoint === 'workspace-icon') {
      const workspace = state.workspaces?.[data.id];
      if (!workspace) throw Error('Unknown workspace');
      workspace.favicon = await savedFavicon(workspace.website);
      await save();
      json(res, 200, { saved: Boolean(workspace.favicon) });
    } else if (endpoint === 'conversation-edit') {
      if (starting) throw Error('Wait for the conversation to start before editing it.');
      const base = data.workspaceId
        ? workspacePartnerContext(state.workspaces, data.workspaceId, cwd).key
        : data.batch;
      if (!data.workspaceId) batchPath(base);
      editConversation(state.conversations, { ...data, base }, active?.batch);
      await save();
      broadcast();
      json(res, 200, { saved: true });
    } else if (endpoint === 'research-socials') {
      json(res, 200, await retrySocials(data.id));
    } else if (endpoint === 'research-social-review') {
      json(res, 200, await reviewSocial(data.id, data.url, data.decision));
    } else if (endpoint === 'message') {
      if (active || starting) throw Error('A turn is already running. Wait or stop it first.');
      starting = true;
      ownsStart = true;
      if (typeof data.text !== 'string' || !data.text.trim() || data.text.length > 20000)
        throw Error('Enter a message under 20,000 characters');
      let target = null,
        b = null;
      if (data.workspaceId) {
        target = await prepareWorkspace(data.workspaceId);
      } else b = await manifest(data.batch);
      if (data.conversationId && !/^[a-zA-Z0-9-]{1,80}$/.test(data.conversationId))
        throw Error('Invalid conversation identifier');
      const conversationKey =
          (target?.key || data.batch) + (data.conversationId ? ':' + data.conversationId : ''),
        conversationCwd = target?.cwd || cwd;
      if (!target) {
        await fs.copyFile(
          path.join(appRoot, 'scripts/studio/output-guide.md'),
          path.join(conversationCwd, 'MAKEPACE-OUTPUTS.md'),
        );
        await fs.copyFile(
          path.join(appRoot, 'scripts/studio/research-guide.md'),
          path.join(conversationCwd, 'MAKEPACE-RESEARCH.md'),
        );
        await fs.copyFile(
          path.join(appRoot, 'scripts/studio/research-sources.md'),
          path.join(conversationCwd, 'MAKEPACE-SOURCES.md'),
        );
      }
      if (!account) throw Error('Connect Codex first');
      const c = conversation(conversationKey);
      active = {
        batch: conversationKey,
        threadId: c.threadId,
        turnId: null,
        activity: 'Starting Codex',
        cwd: conversationCwd,
        outputsBefore: await collectOutputs(conversationCwd).catch(() => []),
      };
      broadcast();
      try {
        let continuation = '';
        if (!c.threadId || !c.researchToolsVersion) {
          if (c.threadId)
            continuation =
              '\nPrior conversation excerpt (reference only, not new authorization):\n' +
              c.messages
                .filter((m) => ['user', 'assistant'].includes(m.role))
                .map((m) => m.role + ': ' + m.text)
                .join('\n')
                .slice(-60000);
          const r = await codex.rpc('thread/start', {
            cwd: conversationCwd,
            sandbox: 'workspace-write',
            approvalPolicy: 'on-request',
            dynamicTools: researchTools,
            developerInstructions:
              (target?.instructions ||
                'You are the content agent inside MakePace. Read AGENTS.md and workspace guides. Keep work in this workspace. Publishing and external messages require explicit current authorization. Never expose credentials.') +
              ' Use makepace_inspect_page for browser evidence and makepace_collect_social for the saved Apify connection. These are MakePace tools, independent of T3. Save reports as local Markdown files per MAKEPACE-OUTPUTS.md; do not route workspace reports to Pages/Notion skills.',
          });
          if (c.threadId) c.previousThreadIds = [...(c.previousThreadIds || []), c.threadId];
          c.threadId = r.thread.id;
          c.researchToolsVersion = 1;
          loadedThreads.add(c.threadId);
        } else if (!loadedThreads.has(c.threadId)) {
          await codex.rpc('thread/resume', {
            threadId: c.threadId,
            cwd: conversationCwd,
            excludeTurns: true,
          });
          loadedThreads.add(c.threadId);
        }
        active.threadId = c.threadId;
        const post = b?.posts.find((p) => String(p.id) === String(data.postId));
        const text = target
          ? `${target.context}\n\nUser request:\n${data.text}`
          : `Respond in English unless the user requests another language. Read MAKEPACE-OUTPUTS.md and register useful deliverables. For research read MAKEPACE-RESEARCH.md; the brand website is audience context, not social performance evidence.\nSelected batch: ${data.batch}\nManifest: social/carousels/output/${data.batch}/manifest.json\n${post ? `Selected post ${post.id}: ${post.title}\n` : ''}\nUser request:\n${data.text}`;
        c.messages.push({ role: 'user', id: randomUUID(), text: data.text, postId: post?.id });
        await save();
        broadcast();
        const r = await codex.rpc('turn/start', {
          threadId: c.threadId,
          ...turnSettings(
            modelSettings(state.fastMode === true, state.model),
            'creative',
            data.text,
          ),
          input: [{ type: 'text', text: continuation + '\n' + text }],
        });
        if (active) active.turnId = r.turn.id;
        broadcast();
        json(res, 200, { started: true });
      } catch (e) {
        c.messages.push({ role: 'status', text: e.message });
        active = null;
        await save();
        broadcast();
        throw e;
      }
    } else if (endpoint === 'stop') {
      if (active?.turnId)
        await codex.rpc('turn/interrupt', { threadId: active.threadId, turnId: active.turnId });
      json(res, 200, { requested: true });
    } else if (endpoint === 'answer') {
      const r = requests.get(String(data.id));
      if (!r) throw Error('Request no longer pending');
      if (r.method === 'item/tool/requestUserInput') {
        const answers = {};
        for (const q of r.questions || []) {
          const v = data.answers?.[q.id];
          if (typeof v !== 'string') throw Error('Answer every question');
          answers[q.id] = { answers: [v] };
        }
        codex.respond(r.id, { answers });
      } else {
        if (!['accept', 'decline'].includes(data.decision)) throw Error('Invalid decision');
        codex.respond(r.id, { decision: data.decision });
      }
      requests.delete(String(data.id));
      broadcast();
      json(res, 200, { answered: true });
    } else if (endpoint === 'review') {
      const b = await manifest(data.batch);
      if (!b.posts.some((p) => String(p.id) === String(data.postId))) throw Error('Unknown post');
      if (
        !['unreviewed', 'approved', 'revise'].includes(data.status) ||
        typeof data.note !== 'string' ||
        data.note.length > 5000
      )
        throw Error('Invalid review');
      state.reviews[data.batch + ':' + data.postId] = {
        status: data.status,
        note: data.note,
        updatedAt: new Date().toISOString(),
      };
      await save();
      broadcast();
      json(res, 200, { saved: true });
    } else json(res, 404, { error: 'Unknown action' });
  } catch (e) {
    json(res, 400, { error: e.message });
  } finally {
    if (ownsStart) starting = false;
  }
  return true;
}
process.on('exit', () => codex.close());
