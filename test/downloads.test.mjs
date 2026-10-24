import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { byteRange, files } from '../infra/downloads/worker.mjs';

const filename = Object.keys(files)[0];
const url = `https://downloads.example/v0.1.0/${filename}`;
test('invalid paths, methods and ranges never touch storage', async () => {
  const env = { INSTALLERS: new Proxy({}, { get() { throw new Error('Storage accessed'); } }) };
  for (const [request, status] of [
    [new Request('https://downloads.example/private'), 404],
    [new Request(url, { method: 'PUT' }), 405],
    [new Request(url, { headers: { Range: 'bytes=0-1,4-5' } }), 416],
    [new Request(url, { headers: { Range: 'bytes=-0' } }), 416],
  ]) assert.equal((await worker.fetch(request, env)).status, status);
});
test('range downloads stream with exactly one storage read', async () => {
  let reads = 0;
  const env = { INSTALLERS: { async get(key, options) {
    reads++;
    assert.equal(key, `v0.1.0/${filename}`);
    assert.deepEqual(options.range, { offset: 0, length: 2 });
    return { size: files[filename], httpEtag: '"abc"', body: new Response('MZ').body };
  } } };
  const response = await worker.fetch(new Request(url, { headers: { Range: 'bytes=0-1' } }), env);
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), `bytes 0-1/${files[filename]}`);
  assert.equal(await response.text(), 'MZ');
  assert.equal(reads, 1);
});
test('HEAD uses one metadata read and no body read', async () => {
  let reads = 0;
  const response = await worker.fetch(new Request(url, { method: 'HEAD' }), { INSTALLERS: {
    async head() { reads++; return { size: files[filename], httpEtag: '"abc"' }; },
    get() { throw new Error('Unexpected GET'); },
  } });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
  assert.equal(reads, 1);
});
test('range parsing supports resume and suffix requests', () => {
  assert.deepEqual(byteRange('bytes=10-', 20), { offset: 10, length: 10 });
  assert.deepEqual(byteRange('bytes=-5', 20), { offset: 15, length: 5 });
  assert.throws(() => byteRange('bytes=20-', 20));
});
