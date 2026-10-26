import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { normalizeBaseline, saveBaseline } from '../scripts/studio/social-baseline.mjs';
test('baseline preserves unavailable metrics and deduplicates original posts', () => {
  const item = {
    id: '1',
    webVideoUrl: 'https://www.tiktok.com/@brand/video/1',
    text: 'Hello',
    diggCount: 0,
  };
  const result = normalizeBaseline(
    [item, item, { url: 'https://evil.test/post' }],
    'tiktok',
    'https://www.tiktok.com/@brand',
    '2026-10-24',
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].metrics.likes, 0);
  assert.equal(result[0].metrics.views, null);
  assert.equal(result[0].publishedAt, null);
});
test('reimport updates the same post and preserves other baseline posts', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'makepace-baseline-'));
  try {
    await saveBaseline(
      dir,
      {
        observedAt: '2026-10-23',
        items: [
          { id: 'a', url: 'https://www.instagram.com/p/a/', likesCount: 3 },
          { id: 'b', url: 'https://www.instagram.com/p/b/' },
        ],
      },
      'instagram',
      'https://www.instagram.com/brand/',
    );
    const result = await saveBaseline(
      dir,
      {
        observedAt: '2026-10-24',
        items: [{ id: 'a', url: 'https://www.instagram.com/p/a/', likesCount: 5 }],
      },
      'instagram',
      'https://www.instagram.com/brand/',
    );
    assert.equal(result.total, 2);
    const saved = JSON.parse(
      await fs.readFile(path.join(dir, 'research/social-baseline.json'), 'utf8'),
    );
    assert.equal(saved.posts.find((p) => p.id === 'instagram:a').metrics.likes, 5);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
