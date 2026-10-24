import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, selectUpdate, checkForUpdate } from '../desktop/updates.cjs';

test('updates compare numeric and prerelease versions, including alpha 10', () => {
  assert.equal(compareVersions('0.2.0-alpha.10', '0.2.0-alpha.2'), 1);
  assert.equal(compareVersions('0.2.0', '0.2.0-alpha.10'), 1);
  assert.equal(compareVersions('0.10.0', '0.9.9'), 1);
  assert.equal(compareVersions('0.2.0', '0.2.0'), 0);
  assert.throws(() => compareVersions('not-a-version', '0.2.0'));
});
test('stable installs ignore prereleases and release URLs are repository-bound', () => {
  const releases = [
    { tag_name: 'v0.3.0-alpha.1', prerelease: true, html_url: 'https://evil.example' },
    { tag_name: 'v0.2.1', html_url: 'https://evil.example' },
    { tag_name: 'v9.0.0', draft: true },
    { tag_name: 'invalid' },
  ];
  assert.deepEqual(selectUpdate('0.2.0', releases), {
    version: '0.2.1',
    url: 'https://github.com/alonsosolisg/makepace/releases/tag/v0.2.1',
  });
  assert.equal(selectUpdate('0.2.0-alpha.1', releases)?.version, '0.3.0-alpha.1');
  assert.equal(selectUpdate('1.0.0', releases), null);
});
test('update failures are explicit and never install anything', async () => {
  await assert.rejects(
    checkForUpdate('0.2.0', async () => new Response(null, { status: 403 })),
    /Could not check/,
  );
});
