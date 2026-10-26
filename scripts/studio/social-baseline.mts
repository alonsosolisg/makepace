import fs from 'node:fs/promises';
import path from 'node:path';

const count = (...values) => {
  const value = values.find((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0);
  return value ?? null;
};
const publicURL = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
};
export function normalizeBaseline(items, platform, profileUrl, observedAt) {
  const posts = new Map();
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const url = publicURL(
      item.webVideoUrl ||
        item.url ||
        (platform === 'instagram' && item.shortCode
          ? `https://www.instagram.com/p/${item.shortCode}/`
          : null),
    );
    if (!url || !['www.' + platform + '.com', platform + '.com'].includes(new URL(url).hostname))
      continue;
    const id = String(item.id || item.shortCode || url);
    const rawDate =
      item.createTimeISO ||
      item.timestamp ||
      (typeof item.createTime === 'number' ? item.createTime * 1000 : null);
    const date = rawDate === null ? null : new Date(rawDate);
    posts.set(platform + ':' + id, {
      id: platform + ':' + id,
      platform,
      url,
      profileUrl,
      observedAt,
      caption: String(item.text || item.caption || '').slice(0, 20000),
      publishedAt: date && Number.isFinite(date.getTime()) ? date.toISOString() : null,
      type:
        item.type || (item.isSlideshow ? 'carousel' : platform === 'tiktok' ? 'video' : 'unknown'),
      thumbnailUrl: publicURL(item.videoMeta?.coverUrl || item.displayUrl || item.thumbnailUrl),
      metrics: {
        views: count(item.playCount, item.videoViewCount, item.videoPlayCount),
        likes: count(item.diggCount, item.likesCount),
        comments: count(item.commentCount, item.commentsCount),
        shares: count(item.shareCount),
        saves: count(item.collectCount),
      },
    });
  }
  return [...posts.values()];
}
export async function saveBaseline(root, result, platform, profileUrl) {
  const directory = path.join(root, 'research');
  await fs.mkdir(directory, { recursive: true });
  const file = path.join(directory, 'social-baseline.json');
  let existing = { posts: [] };
  try {
    existing = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const posts = normalizeBaseline(result.items, platform, profileUrl, result.observedAt);
  const merged = new Map(existing.posts.map((p) => [p.id, p]));
  for (const post of posts) merged.set(post.id, post);
  const baseline = {
    version: 1,
    updatedAt: result.observedAt,
    posts: [...merged.values()],
    note: 'Public published-post baseline, not editable source assets or proof of ownership. Missing metrics are null. Observations are snapshots, not follower attribution.',
  };
  await fs.writeFile(file + '.tmp', JSON.stringify(baseline, null, 2));
  await fs.rename(file + '.tmp', file);
  return { imported: posts.length, total: merged.size, path: 'research/social-baseline.json' };
}
