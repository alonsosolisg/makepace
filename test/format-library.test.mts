import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { visualFormats } from '../scripts/studio/format-library.mjs';

test('visual library preserves cohort identities and associates real samples', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'makepace-formats-'));
  try {
    for (const batch of ['first', 'second']) {
      const directory = path.join(root, 'social/carousels/output', batch);
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(
        path.join(directory, 'manifest.json'),
        JSON.stringify({
          formats: { editorial: { name: 'Editorial' } },
          posts: [{ id: 1, format: 'editorial', images: ['1.jpg'] }],
        }),
      );
    }
    const result = await visualFormats(root);
    assert.equal(result.families.length, 2);
    assert.notEqual(result.families[0].id, result.families[1].id);
    assert.equal(result.families[0].samples[0].image, '/batches/first/1.jpg');
    assert.equal(result.families[1].samples[0].batch, 'second');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
