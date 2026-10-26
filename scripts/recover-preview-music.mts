import fs from 'node:fs/promises';
import path from 'node:path';
import { previewBatch } from './studio/preview-batches.mjs';

// Explicit, local migration: restores preview assets without changing publishing records.
export async function recoverPreviewMusic(batchRoot, scheduleFile) {
  const batch = await previewBatch(path.dirname(batchRoot), path.basename(batchRoot));
  const schedule = JSON.parse(await fs.readFile(scheduleFile, 'utf8'));
  const posts = {};
  const missing = [];
  for (const post of batch.posts) {
    const item = schedule.items?.find(
      (item) =>
        item.platform === 'tiktok' &&
        (String(item.sourcePostId) === String(post.id) ||
          (!item.sourcePostId && item.recipeId === post.slug)),
    );
    if (!item?.music?.music_url) {
      missing.push(post.id);
      continue;
    }
    const existing = (await fs.readdir(path.join(batchRoot, 'audio')).catch(() => [])).find(
      (file) =>
        [item.music.music_sound_id, String(post.id)].some(
          (id) => file === `${id}.m4a` || file === `${id}.mp3`,
        ),
    );
    const relative = `audio/${existing || `${item.music.music_sound_id}.mp3`}`;
    const destination = path.join(batchRoot, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    try {
      await fs.access(destination);
    } catch {
      const archived = path.join(path.dirname(scheduleFile), 'audio', `${post.id}.audio`);
      const bytes = await fs
        .readFile(archived)
        .catch(async (error) => {
          if (error.code !== 'ENOENT') throw error;
          const response = await fetch(item.music.music_url, {
            signal: AbortSignal.timeout(30000),
          });
          if (!response.ok) throw Error(`Audio ${post.id}: HTTP ${response.status}`);
          if (!/audio|video\/mp4|octet-stream/i.test(response.headers.get('content-type') || ''))
            throw Error(`Audio ${post.id}: unexpected content type`);
          return Buffer.from(await response.arrayBuffer());
        })
        .catch((error) => {
          missing.push({ id: post.id, reason: error.message });
          return null;
        });
      if (!bytes) continue;
      if (!bytes.length) throw Error(`Empty audio for ${post.id}`);
      await fs.writeFile(destination, bytes);
    }
    posts[post.id] = { ...item.music, previewFile: relative };
  }
  const result = {
    generated: true,
    recoveredAt: new Date().toISOString(),
    source: path.relative(batchRoot, scheduleFile),
    note: 'Original scheduled TikTok selections; also used for historical visual revisions. Preview only.',
    posts,
  };
  await fs.writeFile(path.join(batchRoot, 'music-selection.json'), JSON.stringify(result, null, 2));
  return { restored: Object.keys(posts).length, missing };
}

if (process.argv[1]?.endsWith('recover-preview-music.mts')) {
  const [batchRoot, scheduleFile] = process.argv.slice(2);
  if (!batchRoot || !scheduleFile)
    throw Error('Usage: tsx scripts/recover-preview-music.mts BATCH SCHEDULE');
  console.log(await recoverPreviewMusic(path.resolve(batchRoot), path.resolve(scheduleFile)));
}
