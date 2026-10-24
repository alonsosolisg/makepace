import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { oneUp, localTime, mediaFile } from '../desktop/oneup.cjs';
const now = Date.parse('2026-10-24T10:00:00Z');
test('timezone conversion respects DST and rejects dates without offsets', () => {
  assert.equal(localTime('2026-10-24T10:37:00Z', 'Europe/Tallinn'), '2026-10-24 13:37');
  assert.equal(localTime('2026-10-26T10:37:00Z', 'Europe/Tallinn'), '2026-10-26 12:37');
  assert.throws(() => localTime('2026-10-24 10:37', 'Europe/Tallinn'), /offset/);
});
async function fixture(fn) {
  const root = await mkdtemp(join(tmpdir(), 'makepace-publish-')),
    receipts = join(root, 'receipts');
  const plan = {
    timezone: 'Europe/Tallinn',
    items: [
      {
        id: 'post-1',
        kind: 'image',
        caption: 'A fixture caption',
        scheduledAt: '2026-10-25T14:37:00+02:00',
        media: ['01.png'],
        aiGenerated: true,
        ownBrand: true,
        paidPartnership: false,
        music: {
          music_title: 'Fixture',
          music_author: 'Artist',
          music_sound_id: '1234567890123456789',
          music_url: 'https://example.com/audio',
          music_thumbnail: 'https://example.com/cover',
        },
      },
    ],
  };
  await writeFile(join(root, '01.png'), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]));
  await writeFile(join(root, 'publishing-plan.json'), JSON.stringify(plan));
  const remote = [];
  let creates = 0,
    uploads = 0,
    fields;
  let timeout = false;
  const request = async (url, options) => {
    if (options.method === 'PUT') {
      uploads++;
      return new Response(null, { status: 200 });
    }
    const endpoint = new URL(url).pathname.split('/').at(-1);
    let data: {
      error?: boolean;
      data?: Record<string, unknown>[];
      upload_url?: string;
      file_path?: string;
      post_ids?: number[];
    } = { error: false, data: [] };
    if (endpoint === 'listcategoryaccount')
      data.data = [
        {
          social_network_id: 'account-1',
          social_network_name: 'fixture',
          social_network_type: 'TikTok',
        },
      ];
    if (endpoint === 'listsocialaccounts')
      data.data = [{ social_account_id: 'account-1', is_expired: 0 }];
    if (endpoint === 'getscheduledposts') data.data = remote;
    if (endpoint === 'uploadmedia')
      data = {
        upload_url: 'https://oneupdata.s3.us-east-2.amazonaws.com/upload',
        file_path: 'https://oneupdata.s3.us-east-2.amazonaws.com/file.png',
      };
    if (['scheduleimagepost', 'schedulevideopost'].includes(endpoint)) {
      creates++;
      fields = Object.fromEntries(options.body);
      remote.push({
        post_id: 42,
        content: fields.content,
        date_time: fields.scheduled_date_time + ':00',
        content_image: fields.image_url,
        video_url: fields.video_url,
        social_network_username: 'fixture',
      });
      if (timeout) throw Error('private-key');
      data.post_ids = [42];
    }
    return Response.json(data);
  };
  const publisher = () =>
    oneUp({ directory: receipts, withKey: (cb) => cb('private-key'), request, now: () => now });
  try {
    await fn({
      root,
      plan,
      publisher,
      remote,
      counts: () => ({ creates, uploads, fields }),
      setTimeout: () => (timeout = true),
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
test('prepare is read-only, uploads preserve fields, repeated execute does not duplicate', () =>
  fixture(async (f) => {
    const service = f.publisher(),
      plan = await service.prepare(f.root, 'workspace', {
        categoryId: '1',
        accountId: 'account-1',
      });
    assert.equal(f.counts().uploads, 0);
    assert.equal(f.counts().creates, 0);
    const journal = await service.execute(plan.id);
    assert.equal(journal['post-1'].state, 'verified');
    const tiktok = JSON.parse(f.counts().fields.tiktok);
    assert.equal(tiktok.is_your_brand, true);
    assert.equal(tiktok.is_ai_generated, true);
    assert.equal(tiktok.music_sound_id, '1234567890123456789');
    assert.deepEqual(tiktok.musicOption, f.plan.items[0].music);
    await service.execute(plan.id);
    assert.equal(f.counts().creates, 1);
    const restarted = f.publisher(),
      restored = await restarted.prepare(f.root, 'workspace', {
        categoryId: '1',
        accountId: 'account-1',
      });
    await restarted.execute(restored.id);
    assert.equal(f.counts().creates, 1);
    assert.ok(
      !(await readFile(join(f.root, 'receipts', plan.id + '.json'), 'utf8')).includes(
        'private-key',
      ),
    );
  }));
test('ambiguous create is journaled and blocked from blind retry', () =>
  fixture(async (f) => {
    const service = f.publisher(),
      plan = await service.prepare(f.root, 'workspace', {
        categoryId: '1',
        accountId: 'account-1',
      });
    f.setTimeout();
    await assert.rejects(service.execute(plan.id), /not confirmed/);
    await assert.rejects(service.execute(plan.id), /unresolved/);
    assert.equal(f.counts().creates, 1);
    const receipts = await service.reconcile(plan.id);
    assert.equal(receipts['post-1'].state, 'verified');
    await service.execute(plan.id);
    assert.equal(f.counts().creates, 1);
  }));
test('changed media, traversal and wrong destination are rejected before upload', () =>
  fixture(async (f) => {
    const service = f.publisher();
    await assert.rejects(
      service.prepare(f.root, 'workspace', { categoryId: '1', accountId: 'other' }),
      /Select/,
    );
    await assert.rejects(mediaFile(f.root, '../secret.png'), /relative path/);
    const plan = await service.prepare(f.root, 'workspace', {
      categoryId: '1',
      accountId: 'account-1',
    });
    await writeFile(join(f.root, '01.png'), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 9]));
    await assert.rejects(service.execute(plan.id), /Media changed/);
    assert.equal(f.counts().uploads, 0);
  }));
test('video submits one video URL and explicit disclosure flags', () =>
  fixture(async (f) => {
    f.plan.items[0].kind = 'video';
    f.plan.items[0].media = ['clip.mp4'];
    await writeFile(
      join(f.root, 'clip.mp4'),
      Buffer.from([0, 0, 0, 20, 102, 116, 121, 112, 109, 112, 52, 50]),
    );
    await writeFile(join(f.root, 'publishing-plan.json'), JSON.stringify(f.plan));
    const service = f.publisher(),
      plan = await service.prepare(f.root, 'workspace', {
        categoryId: '1',
        accountId: 'account-1',
      });
    await service.execute(plan.id);
    assert.ok(f.counts().fields.video_url);
    assert.equal(f.counts().fields.image_url, undefined);
    assert.equal(JSON.parse(f.counts().fields.tiktok).is_branded_content, false);
  }));
test('queue collisions and plan edits cannot silently change an approved schedule', () =>
  fixture(async (f) => {
    f.remote.push({
      post_id: 77,
      content: 'Other post',
      date_time: '2026-10-25 14:37:00',
      social_network_username: 'fixture',
    });
    const service = f.publisher();
    await assert.rejects(
      service.prepare(f.root, 'workspace', { categoryId: '1', accountId: 'account-1' }),
      /already has/,
    );
    f.remote.length = 0;
    const plan = await service.prepare(f.root, 'workspace', {
      categoryId: '1',
      accountId: 'account-1',
    });
    f.plan.items[0].caption = 'Changed';
    await writeFile(join(f.root, 'publishing-plan.json'), JSON.stringify(f.plan));
    await assert.rejects(service.execute(plan.id), /plan changed/);
    assert.equal(f.counts().creates, 0);
  }));
