import fs from 'node:fs/promises';
import path from 'node:path';

export async function previewBatch(output, id) {
  if (!/^[\w-]+$/.test(id)) throw Error('Invalid batch');
  const root = path.join(output, id);
  for (const file of ['manifest.json', 'copy-and-production.json', 'batch.json']) {
    let source;
    try {
      source = JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
    } catch (e) {
      if (e.code === 'ENOENT') continue;
      throw e;
    }
    if (!Array.isArray(source.posts)) continue;
    if (source.posts.every((p) => p.images?.length || p.videoFile)) return source;
    const posts = [];
    for (const p of source.posts) {
      const platformImages = {};
      for (const platform of ['tiktok', 'instagram']) {
        const folders = await fs.readdir(path.join(root, platform)).catch(() => []);
        const folder = folders.find(
          (f) =>
            f === p.slug ||
            f === `${String(p.id).padStart(2, '0')}-${p.slug}` ||
            f.startsWith(`${String(p.id).padStart(2, '0')}-`),
        );
        if (!folder) continue;
        const images = (await fs.readdir(path.join(root, platform, folder)))
          .filter((f) => /^\d+\.(jpg|png|webp)$/i.test(f))
          .sort();
        if (images.length)
          platformImages[platform] = images.map((f) => `${platform}/${folder}/${f}`);
      }
      const images = platformImages['tiktok'] || platformImages['instagram'];
      if (images)
        posts.push({
          ...p,
          title: p.title || p.name || p.slug.replaceAll('-', ' '),
          format: p.format || p.family,
          images,
          platformImages,
        });
    }
    if (posts.length) return { ...source, id, posts };
  }
  throw Error('No previewable batch');
}
