import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { previewBatch } from '../scripts/studio/preview-batches.mjs';
test('legacy preview uses actual exports and preserves platform variants', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'preview-batches-'));
  try {
    for (const platform of ['instagram', 'tiktok']) {
      const dir = path.join(root, 'old', platform, '01-story');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, '01.jpg'), 'fixture');
    }
    await fs.writeFile(
      path.join(root, 'old', 'copy-and-production.json'),
      JSON.stringify({
        posts: [
          { id: 1, slug: 'story', caption: 'Original caption' },
          { id: 2, slug: 'not-rendered' },
        ],
      }),
    );
    const result = await previewBatch(root, 'old');
    assert.equal(result.posts.length, 1);
    assert.deepEqual(result.posts[0].platformImages.instagram, ['instagram/01-story/01.jpg']);
    assert.deepEqual(result.posts[0].images, ['tiktok/01-story/01.jpg']);
    assert.equal(result.posts[0].caption, 'Original caption');
    await assert.rejects(() => previewBatch(root, '../old'));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
