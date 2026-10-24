const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const musicKeys = ['music_title', 'music_sound_id', 'music_url', 'music_thumbnail', 'music_author'];
const mime = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
};
export function localTime(iso, timezone) {
  if (
    typeof iso !== 'string' ||
    !/(Z|[+-]\d{2}:\d{2})$/.test(iso) ||
    !Number.isFinite(Date.parse(iso))
  )
    throw Error('Each post needs an ISO date with a UTC offset.');
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}
export async function mediaFile(root, relative) {
  if (
    typeof relative !== 'string' ||
    path.isAbsolute(relative) ||
    relative.includes('..') ||
    relative.includes(':')
  )
    throw Error('Media must use a relative path inside the workspace.');
  const base = await fs.realpath(root),
    file = await fs.realpath(path.join(base, relative));
  if (!file.startsWith(base + path.sep)) throw Error('Media points outside this workspace.');
  const type = mime[path.extname(file).toLowerCase()];
  if (!type) throw Error('Use JPEG, PNG or MP4 exports.');
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size > (type === 'video/mp4' ? 100 : 8) * 1024 * 1024)
    throw Error('Media exceeds the 8 MB image / 100 MB video limit.');
  const bytes = await fs.readFile(file);
  const valid =
    type === 'image/png'
      ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : type === 'image/jpeg'
        ? bytes[0] === 255 && bytes[1] === 216
        : bytes.subarray(4, 8).toString() === 'ftyp';
  if (!valid) throw Error('Media contents do not match the file type.');
  return { path: relative, type, sha256: hash(bytes), size: bytes.length, bytes };
}
export function oneUp({ directory, withKey, request = fetch, now = () => Date.now() }) {
  let busy = false;
  const prepared = new Map();
  async function call(endpoint, fields = {}, method = 'GET') {
    return withKey(async (key) => {
      const params = new URLSearchParams({ apiKey: key });
      for (const [k, v] of Object.entries(fields))
        params.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      try {
        const response = await request(
          'https://www.oneupapp.io/api/' + endpoint + (method === 'GET' ? '?' + params : ''),
          {
            method,
            ...(method === 'POST' ? { body: params } : {}),
            redirect: 'error',
            signal: AbortSignal.timeout(45000),
          },
        );
        const result = await response.json();
        if (!response.ok || result.error || result.success === false) throw Error();
        return result;
      } catch {
        throw Error(
          method === 'POST'
            ? 'OneUp submission was not confirmed. Check the queue before retrying.'
            : 'OneUp could not complete the request. Check the connection and API plan.',
        );
      }
    });
  }
  async function rows(endpoint, fields = {}) {
    const result = await call(endpoint, fields);
    if (!Array.isArray(result.data)) throw Error('Unexpected OneUp response.');
    return result.data;
  }
  async function queue() {
    const all = [],
      ids = new Set();
    for (let start = 0; start < 5000; start += 50) {
      const page = await rows('getscheduledposts', { start });
      for (const p of page) {
        if (ids.has(String(p.post_id))) throw Error('OneUp repeated a queue page.');
        ids.add(String(p.post_id));
        all.push({
          id: String(p.post_id),
          caption: p.content || '',
          time: p.date_time || '',
          account: p.social_network_username || '',
          images: p.content_image || '',
          video: p.video_url || '',
        });
      }
      if (page.length < 50) return all;
    }
    throw Error('Queue exceeds the supported page limit.');
  }
  async function accounts(categoryId) {
    return (await rows('listcategoryaccount', { category_id: categoryId })).map((a) => ({
      id: String(a.social_network_id),
      name: a.social_network_name,
      platform: String(a.social_network_type).toLowerCase(),
    }));
  }
  async function overview(categoryId) {
    const categories = (await rows('listcategory')).map((c) => ({
      id: String(c.id),
      name: c.category_name,
    }));
    return {
      categories,
      accounts: categoryId ? await accounts(categoryId) : [],
      queue: await queue(),
    };
  }
  async function prepare(root, workspaceId, selection) {
    const raw = await fs.readFile(path.join(root, 'publishing-plan.json'), 'utf8');
    if (raw.length > 1024 * 1024) throw Error('Publishing plan is too large.');
    const plan = JSON.parse(raw);
    if (!Array.isArray(plan.items) || !plan.items.length || plan.items.length > 100)
      throw Error('Plan needs 1–100 posts.');
    new Intl.DateTimeFormat('en', { timeZone: plan.timezone }).format();
    if (!plan.timezone) throw Error('Set the OneUp timezone in the plan.');
    const account = (await accounts(selection.categoryId)).find(
      (a) => a.id === selection.accountId,
    );
    if (!account || !['tiktok', 'instagram'].includes(account.platform))
      throw Error('Select a TikTok or Instagram account in this category.');
    const health = (await rows('listsocialaccounts')).find(
      (a) => String(a.social_account_id) === account.id,
    );
    if (health && (Number(health.is_expired) === 1 || health.need_refresh === true))
      throw Error('Reconnect this social account in OneUp first.');
    const items = [],
      seen = new Set(),
      live = await queue();
    for (const item of plan.items) {
      if (
        typeof item.id !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id) ||
        Object.hasOwn(Object.prototype, item.id) ||
        seen.has(item.id)
      )
        throw Error('Each post needs a unique safe id.');
      seen.add(item.id);
      if (typeof item.caption !== 'string' || !item.caption.trim() || item.caption.length > 2200)
        throw Error('Post ' + item.id + ' needs a caption under 2,200 characters.');
      if (!['image', 'video'].includes(item.kind))
        throw Error('Choose image or video for ' + item.id);
      for (const flag of ['aiGenerated', 'ownBrand', 'paidPartnership'])
        if (typeof item[flag] !== 'boolean')
          throw Error('Set ' + flag + ' explicitly for ' + item.id);
      if (
        !Array.isArray(item.media) ||
        !item.media.length ||
        item.media.length > (item.kind === 'video' ? 1 : account.platform === 'instagram' ? 10 : 35)
      )
        throw Error('Invalid media count for ' + item.id);
      const time = localTime(item.scheduledAt, plan.timezone);
      if (Date.parse(item.scheduledAt) < now() + 120000)
        throw Error('Schedule every post at least two minutes in the future.');
      if (items.some((i) => i.time === time)) throw Error('Two posts share the same time: ' + time);
      if (item.music) {
        if (account.platform !== 'tiktok')
          throw Error('This flow supports selected music on TikTok only.');
        for (const k of musicKeys)
          if (typeof item.music[k] !== 'string' || !item.music[k])
            throw Error('Incomplete TikTok music for ' + item.id);
        if (!/^\d+$/.test(item.music.music_sound_id)) throw Error('Use a native TikTok sound ID.');
      }
      if (
        account.platform === 'tiktok' &&
        item.kind === 'image' &&
        !item.music &&
        item.autoAddMusic !== true
      )
        throw Error('Choose TikTok music or explicitly set autoAddMusic true for ' + item.id);
      const media = [];
      for (const relative of item.media) {
        const file = await mediaFile(root, relative);
        if ((item.kind === 'video') !== (file.type === 'video/mp4'))
          throw Error('Do not mix video and images.');
        const { bytes, ...info } = file;
        media.push(info);
      }
      items.push({ ...item, time, media });
    }
    const snapshot = {
      workspaceId,
      timezone: plan.timezone,
      categoryId: String(selection.categoryId),
      account,
      items,
      sourceHash: hash(raw),
    };
    const id = hash(JSON.stringify(snapshot));
    prepared.set(id, { ...snapshot, root });
    await fs.mkdir(directory, { recursive: true });
    const journal = await fs
      .readFile(path.join(directory, id + '.json'), 'utf8')
      .then(JSON.parse)
      .catch((e) => {
        if (e.code === 'ENOENT') return {};
        throw e;
      });
    for (const item of items)
      if (
        !journal[item.id] &&
        live.some((p) => p.account === account.name && p.time.slice(0, 16) === item.time)
      )
        throw Error('This account already has a post at ' + item.time);
    return { id, ...snapshot, receipts: journal };
  }
  async function execute(id) {
    if (busy) throw Error('A publishing batch is already running.');
    busy = true;
    try {
      const plan = prepared.get(id);
      if (!plan) throw Error('Review the plan again before scheduling.');
      if (hash(await fs.readFile(path.join(plan.root, 'publishing-plan.json'))) !== plan.sourceHash)
        throw Error('The plan changed. Review it again.');
      // Preflight every file before uploading anything.
      for (const item of plan.items)
        for (const media of item.media)
          if ((await mediaFile(plan.root, media.path)).sha256 !== media.sha256)
            throw Error('Media changed. Review the plan again.');
      const current = (await accounts(plan.categoryId)).find(
        (a) => a.id === plan.account.id && a.platform === plan.account.platform,
      );
      if (!current) throw Error('The selected account is no longer available.');
      const file = path.join(directory, id + '.json');
      let journal = await fs
        .readFile(file, 'utf8')
        .then(JSON.parse)
        .catch((e) => {
          if (e.code === 'ENOENT') return {};
          throw e;
        });
      const save = async () => {
        await fs.writeFile(file + '.tmp', JSON.stringify(journal, null, 2), { mode: 0o600 });
        await fs.rename(file + '.tmp', file);
      };
      for (const item of plan.items) {
        if (journal[item.id]?.state === 'verified') continue;
        if (journal[item.id])
          throw Error(
            'Post ' + item.id + ' has an unresolved submission. Inspect OneUp before retrying.',
          );
        if (Date.parse(item.scheduledAt) < now() + 120000)
          throw Error('A planned time has passed. Prepare a new schedule.');
        const live = await queue();
        if (live.some((p) => p.account === plan.account.name && p.time.slice(0, 16) === item.time))
          throw Error('Queue changed: a post already occupies ' + item.time);
        const urls = [];
        for (const media of item.media) {
          const content = await mediaFile(plan.root, media.path);
          if (content.sha256 !== media.sha256) throw Error('Media changed during submission.');
          const upload = await call('uploadmedia');
          for (const value of [upload.upload_url, upload.file_path]) {
            const url = new URL(value);
            if (url.protocol !== 'https:' || !/(^|\.)amazonaws\.com$/.test(url.hostname))
              throw Error('Unexpected OneUp upload destination.');
          }
          try {
            const result = await request(upload.upload_url, {
              method: 'PUT',
              headers: { 'Content-Type': media.type },
              body: content.bytes,
              redirect: 'error',
              signal: AbortSignal.timeout(120000),
            });
            if (!result.ok) throw Error();
          } catch {
            throw Error('Media upload failed. No post was submitted for ' + item.id);
          }
          urls.push(upload.file_path);
        }
        const fields = {
          category_id: plan.categoryId,
          social_network_id: [plan.account.id],
          scheduled_date_time: item.time,
          content: item.caption,
          isDraftPost: false,
          requireApproval: false,
          [item.kind === 'video' ? 'video_url' : 'image_url']: urls.join('~~'),
        };
        if (plan.account.platform === 'tiktok')
          fields.tiktok = {
            is_ai_generated: item.aiGenerated,
            is_your_brand: item.ownBrand,
            is_branded_content: item.paidPartnership,
            autoAddMusic: !item.music && item.autoAddMusic === true,
            ...(item.music
              ? {
                  ...Object.fromEntries(musicKeys.map((k) => [k, item.music[k]])),
                  musicOption: Object.fromEntries(musicKeys.map((k) => [k, item.music[k]])),
                }
              : {}),
          };
        else
          fields.instagram = {
            isStory: false,
            is_ai_generated: item.aiGenerated,
            ...(item.kind === 'video' ? { addToFeed: 1 } : {}),
          };
        journal[item.id] = {
          state: 'intent',
          time: item.time,
          account: plan.account,
          fields,
          beforeIds: live.map((p) => p.id),
          createdAt: new Date(now()).toISOString(),
        };
        await save();
        const result = await call(
          item.kind === 'video' ? 'schedulevideopost' : 'scheduleimagepost',
          fields,
          'POST',
        );
        journal[item.id].state = 'submitted';
        journal[item.id].postIds = (result.post_ids || []).map(String);
        await save();
        const after = await queue();
        const matches = after.filter(
          (p) =>
            journal[item.id].postIds.includes(p.id) &&
            p.caption === item.caption &&
            p.time.slice(0, 16) === item.time,
        );
        if (matches.length !== 1)
          throw Error(
            'Submission needs reconciliation in OneUp; it will not be retried automatically.',
          );
        const remote = matches[0];
        if (
          (item.kind === 'image' && remote.images.split('~~').length !== urls.length) ||
          (item.kind === 'video' && !remote.video)
        )
          throw Error('OneUp media readback differs; inspect the submitted post.');
        journal[item.id].state = 'verified';
        journal[item.id].remoteId = remote.id;
        await save();
      }
      return journal;
    } finally {
      busy = false;
    }
  }
  async function reconcile(id) {
    if (busy) throw Error('Wait for the current batch to finish.');
    busy = true;
    try {
      if (!prepared.has(id)) throw Error('Review the plan first.');
      const file = path.join(directory, id + '.json'),
        journal: Record<
          string,
          {
            state: string;
            fields: Record<string, string>;
            time: string;
            account: { name: string };
            postIds?: string[];
            beforeIds: string[];
            remoteId?: string;
            reconciledAt?: string;
          }
        > = await fs.readFile(file, 'utf8').then(JSON.parse),
        live = await queue();
      for (const receipt of Object.values(journal)) {
        if (receipt.state === 'verified') continue;
        const matches = live.filter(
          (p) =>
            p.caption === receipt.fields.content &&
            p.time.slice(0, 16) === receipt.time &&
            p.account === receipt.account.name &&
            (receipt.postIds?.length
              ? receipt.postIds.includes(p.id)
              : !receipt.beforeIds.includes(p.id)),
        );
        if (matches.length !== 1) continue;
        const p = matches[0],
          count = receipt.fields.image_url?.split('~~').length;
        if (
          (count && p.images.split('~~').length !== count) ||
          (receipt.fields.video_url && !p.video)
        )
          continue;
        receipt.state = 'verified';
        receipt.remoteId = p.id;
        receipt.reconciledAt = new Date(now()).toISOString();
      }
      await fs.writeFile(file + '.tmp', JSON.stringify(journal, null, 2), { mode: 0o600 });
      await fs.rename(file + '.tmp', file);
      return journal;
    } finally {
      busy = false;
    }
  }
  async function preview(id, postId, index) {
    const plan = prepared.get(id),
      media = plan?.items.find((i) => i.id === postId)?.media[index];
    if (!media || media.type === 'video/mp4') throw Error('Image preview unavailable.');
    const file = await mediaFile(plan.root, media.path);
    if (file.sha256 !== media.sha256) throw Error('Export changed. Review the plan again.');
    return file.bytes;
  }
  return { overview, prepare, execute, reconcile, preview };
}
