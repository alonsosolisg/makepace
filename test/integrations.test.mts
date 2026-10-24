import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { integrationStore } from '../desktop/integrations.cjs';
test('connections verify before storing, redact status and reject insecure storage', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'makepace-connections-'));
  try {
    let accepted = true;
    const crypto = {
      getSelectedStorageBackend: () => 'keychain',
      isAsyncEncryptionAvailable: async () => true,
      encryptStringAsync: async () => Buffer.from('encrypted-fixture'),
      decryptStringAsync: async (bytes) => {
        assert.equal(bytes.toString(), 'encrypted-fixture');
        return { result: 'secret-fixture', shouldReEncrypt: false };
      },
    };
    const store = integrationStore({
      directory,
      crypto,
      request: async () => ({ ok: accepted, json: async () => ({ data: { id: 'fixture' } }) }),
    });
    await store('save', 'Apify', 'secret-fixture');
    assert.equal(await store.withCredential('Apify', (key) => key === 'secret-fixture'), true);
    assert.deepEqual(await store('status'), {
      OneUp: { connected: false },
      Apify: { connected: true },
    });
    assert.ok(
      !(await readFile(join(directory, 'integrations.encrypted.json'), 'utf8')).includes(
        'secret-fixture',
      ),
    );
    accepted = false;
    await assert.rejects(store('save', 'Apify', 'rejected'), /not accept/);
    assert.equal((await store('status')).Apify.connected, true);
    await store('remove', 'Apify');
    assert.equal((await store('status')).Apify.connected, false);
    crypto.getSelectedStorageBackend = () => 'basic_text';
    await assert.rejects(store('save', 'Apify', 'secret'), /unavailable/);
    await assert.rejects(store('save', 'Unknown', 'secret'), /Unsupported/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test('OneUp verifies the response and never exposes upstream errors containing keys', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'makepace-oneup-'));
  try {
    let fails = false;
    const store = integrationStore({
      directory,
      crypto: {
        isAsyncEncryptionAvailable: async () => true,
        encryptStringAsync: async () => Buffer.from('cipher'),
      },
      request: async (url, options) => {
        assert.equal(new URL(url).searchParams.get('apiKey'), 'private-fixture');
        assert.equal(options.redirect, 'error');
        if (fails) throw Error('URL contains private-fixture');
        return { ok: true, json: async () => ({ data: [] }) };
      },
    });
    await store('save', 'OneUp', 'private-fixture');
    assert.equal((await store('status')).OneUp.connected, true);
    fails = true;
    await assert.rejects(
      store('save', 'OneUp', 'private-fixture'),
      (e) =>
        e instanceof Error &&
        !e.message.includes('private-fixture') &&
        e.message.includes('Could not verify'),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
