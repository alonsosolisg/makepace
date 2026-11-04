import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { request } from 'node:http';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'makepace-security-'));
  const output = path.join(root, 'workspace/social/carousels/output');
  await mkdir(path.join(output, 'fixture'), { recursive: true });
  await mkdir(path.join(root, 'data'));
  await writeFile(path.join(root, 'outside.txt'), 'private fixture outside the workspace');
  await writeFile(
    path.join(root, 'outside.json'),
    JSON.stringify({ posts: [{ id: 1, images: ['slide.png'] }], private: 'outside' }),
  );
  await writeFile(
    path.join(output, 'fixture/index.html'),
    '<h1>Preview</h1><script>fetch("/api/studio/state")</script>',
  );
  await writeFile(path.join(output, 'fixture/slide.png'), 'fixture media');
  const child = spawn(process.execPath, ['scripts/serve-community-preview.mjs'], {
    env: {
      ...process.env,
      MAKEPACE_AUTO_CONNECT: '0',
      MAKEPACE_DESKTOP_TOKEN: '',
      COMMUNITY_PREVIEW_PORT: '0',
      COMMUNITY_PREVIEW_ROOT: 'social/carousels/output/fixture',
      MAKEPACE_DATA_ROOT: path.join(root, 'data'),
      MAKEPACE_WORKSPACE_ROOT: path.join(root, 'workspace'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
    await rm(root, { recursive: true, force: true });
  });
  const [message] = await Promise.race([
    once(child.stdout, 'data'),
    once(child, 'exit').then(() => {
      throw Error('Security fixture exited before startup');
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(Error('Security fixture startup timeout')), 5000).unref(),
    ),
  ]);
  const port = Number(String(message).match(/localhost:(\d+)/)[1]);
  return { root, output, base: 'http://127.0.0.1:' + port, port };
}

test('campaign HTML is sandboxed even when opened directly', async (t) => {
  const { base } = await fixture(t);
  for (const route of ['/batches/fixture/index.html', '/batch-preview', '/index.html']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    const policy = response.headers.get('content-security-policy') || '';
    assert.match(policy, /(?:^|;)\s*sandbox\s*(?:;|$)/);
    assert.match(policy, /default-src 'none'/);
    assert.match(policy, /form-action 'none'/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  const studio = await fetch(base + '/studio');
  assert.equal(studio.status, 200);
  assert.doesNotMatch(studio.headers.get('content-security-policy') || '', /sandbox/);
});

test('all private routes reject hostile Host headers and cross-origin reads', async (t) => {
  const { base, port } = await fixture(t);
  for (const route of [
    '/studio',
    '/__batches',
    '/batches/fixture/slide.png',
    '/api/studio/state',
  ]) {
    const status = await new Promise<number>((resolve, reject) => {
      const req = request(
        { host: '127.0.0.1', port, path: route, headers: { Host: 'attacker.example:' + port } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on('error', reject);
      req.end();
    });
    assert.equal(status, 403, route);
    assert.equal(
      (await fetch(base + route, { headers: { Origin: 'https://attacker.example' } })).status,
      403,
      route,
    );
  }
});

test('static files and batch manifests cannot escape their root through symlinks', async (t) => {
  const { root, output, base } = await fixture(t);
  await symlink(path.join(root, 'outside.txt'), path.join(output, 'fixture/leak.txt'));
  await symlink(path.join(root, 'outside.json'), path.join(output, 'fixture/manifest.json'));
  await symlink(root, path.join(output, 'escape'), 'dir');
  for (const route of [
    '/leak.txt',
    '/batches/fixture/leak.txt',
    '/batches/escape/outside.txt',
    '/batches/fixture/manifest.json',
  ]) {
    const response = await fetch(base + route);
    assert.ok(response.status >= 400, route);
    assert.doesNotMatch(await response.text(), /private fixture|"private":"outside"/);
  }
  await symlink(path.join(output, 'fixture/slide.png'), path.join(output, 'fixture/alias.png'));
  assert.equal(await (await fetch(base + '/batches/fixture/alias.png')).text(), 'fixture media');
});
