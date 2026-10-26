import fs from 'node:fs/promises';
import path from 'node:path';

// Keep recipe identities scoped to their collection: matching names are not proof
// that two experiments used the same treatment.
export async function visualFormats(root) {
  const families = [];
  const directory = path.join(root, 'social/carousels/output');
  for (const entry of await fs.readdir(directory, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory()) continue;
    try {
      const manifest = JSON.parse(
        await fs.readFile(path.join(directory, entry.name, 'manifest.json'), 'utf8'),
      );
      if (!Array.isArray(manifest.posts)) continue;
      for (const [id, format] of Object.entries(manifest.formats || {}) as [string, any][]) {
        const samples = manifest.posts
          .filter((p) => p.format === id && p.images?.length)
          .slice(0, 4)
          .map((p) => ({
            batch: entry.name,
            postId: p.id,
            title: p.title,
            image: `/batches/${encodeURIComponent(entry.name)}/${p.images[0]}`,
          }));
        families.push({
          ...format,
          id: entry.name + ':' + id,
          collection: entry.name,
          pattern: format.proof,
          samples,
        });
      }
    } catch {
      /* Legacy previews remain available in the archive. */
    }
  }
  for (const filename of ['library.json', 'sunroom-trial-library.json']) {
    try {
      const library = JSON.parse(
        await fs.readFile(path.join(root, 'social/carousels/formats', filename), 'utf8'),
      );
      for (const family of library.families || []) {
        const samples = [];
        for (const recipe of (library.recipes || []).filter((r) => r.familyId === family.id)) {
          const relative = recipe.assetId + '/tiktok';
          if (!/^[\w-]+\/tiktok$/.test(relative)) continue;
          const files = await fs.readdir(path.join(directory, relative)).catch(() => []);
          const image = files.filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort()[0];
          if (image)
            samples.push({
              title: recipe.name,
              image: `/batches/${relative}/${encodeURIComponent(image)}`,
            });
        }
        families.push({
          ...family,
          id: filename + ':' + family.id,
          collection: library.cohort || filename,
          samples,
        });
      }
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  return { families };
}
