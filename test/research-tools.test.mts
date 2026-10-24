import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { researchTools, runResearchTool } from '../scripts/studio/research-tools.mjs';
import { recordTool } from '../scripts/studio/tool-activity.mjs';
const { apifyResearch } = createRequire(import.meta.url)('../desktop/apify.cjs');
test('collection is bounded, credentials stay in headers, and only issued runs are readable', async () => {
  const requests = [];
  const collect = apifyResearch({
    withKey: (fn) => fn('private-test-key'),
    request: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        json: async () =>
          url.includes('/items?')
            ? [{ url: 'https://www.instagram.com/p/example/' }]
            : {
                data: url.includes('/runs?')
                  ? { id: 'run1', defaultDatasetId: 'dataset1', status: 'RUNNING' }
                  : { status: 'SUCCEEDED' },
              },
      };
    },
  });
  await assert.rejects(() =>
    collect('start', { platform: 'instagram', urls: ['https://localhost/private'] }),
  );
  assert.equal(requests.length, 0);
  const started = await collect('start', {
    platform: 'instagram',
    urls: ['https://www.instagram.com/example/'],
  });
  assert.equal(started.runId, 'run1');
  assert.match(requests[0].url, /maxTotalChargeUsd=0.25/);
  assert.equal(JSON.parse(requests[0].options.body).resultsLimit, 20);
  assert.equal(requests[0].options.headers.Authorization, 'Bearer private-test-key');
  assert.ok(!requests[0].url.includes('private-test-key'));
  await assert.rejects(() => collect('result', { runId: 'someone-elses-run' }));
  assert.equal((await collect('result', { runId: 'run1' })).items.length, 1);
});
test('provider failures never expose upstream credential-bearing text', async () => {
  const collect = apifyResearch({
    withKey: (fn) => fn('secret'),
    request: async () => ({ ok: false, status: 402, json: async () => ({ error: 'secret' }) }),
  });
  await assert.rejects(
    () => collect('start', { platform: 'tiktok', urls: ['https://www.tiktok.com/@example'] }),
    /usage limit reached/,
  );
});
test('research tools fail clearly without desktop and do not persist raw results in activity', async () => {
  assert.equal(researchTools.length, 3);
  await assert.rejects(
    () => runResearchTool('makepace_collection_result', { runId: 'x' }, { cwd: '/tmp' }),
    /requires MakePace desktop/,
  );
  const messages = [];
  recordTool(
    messages,
    {
      id: 'a',
      type: 'dynamicToolCall',
      tool: 'makepace_collect_social',
      arguments: { secret: 'hidden' },
      success: false,
    },
    true,
  );
  assert.equal(messages[0].service, 'Apify');
  assert.equal(messages[0].status, 'failed');
  assert.ok(!JSON.stringify(messages).includes('hidden'));
});
