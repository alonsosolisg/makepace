import { execFileSync } from 'node:child_process';
import { mkdir, readdir, stat, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { files } from './worker.mjs';

const account = 'ce13960cb78935713d21d554d8d70104';
const bucket = 'makepace-installers';
const root = fileURLToPath(new URL('../../', import.meta.url));
const cf = (args) =>
  JSON.parse(execFileSync('cf', args, { encoding: 'utf8', maxBuffer: 4e6, cwd: root }));
const lock = resolve(root, 'dist/r2-publish.lock');
await mkdir(lock); // Exclusive directory: another local publisher must finish first.
try {
  const subscriptions = cf(['accounts', 'subscriptions', 'get']);
  if (
    subscriptions.some(
      (s) => /workers/i.test(s.rate_plan?.id || '') && s.rate_plan?.id !== 'workers_free',
    )
  ) {
    throw new Error('Workers paid subscription invalidates the request ceiling. Stop.');
  }
  const r2 = subscriptions.find((s) => s.rate_plan?.id === 'r2_paid');
  if (!r2?.current_period_start) throw new Error('Cannot verify R2 billing period.');
  const buckets = cf(['r2', 'buckets', 'list']).buckets;
  if (buckets.length !== 1 || buckets[0].name !== bucket) {
    throw new Error('Other account buckets require a fresh account-wide usage review.');
  }
  const publicDomain = cf(['r2', 'buckets', 'domains', 'managed', 'list', '--bucket-name', bucket]);
  const custom = cf(['r2', 'buckets', 'domains', 'custom', 'list', '--bucket-name', bucket]);
  if (publicDomain.enabled || custom.domains.length)
    throw new Error('Public R2 access bypasses the gateway.');
  const metrics = cf(['r2', 'buckets', 'metrics', 'list']);
  let stored = 0;
  for (const storageClass of ['standard', 'infrequentAccess']) {
    for (const state of ['uploaded', 'published']) {
      const value = metrics[storageClass]?.[state];
      if (!value || !Number.isFinite(value.payloadSize) || !Number.isFinite(value.metadataSize))
        throw new Error('Unknown storage usage.');
      stored += value.payloadSize + value.metadataSize;
    }
  }
  // Billing metrics lag behind uploads. Always cross-check the live inventory.
  const inventory = cf(['r2', 'objects', 'list', '--bucket-name', bucket, '--per-page', '1000']);
  if (
    !Array.isArray(inventory) ||
    inventory.length >= 1000 ||
    inventory.some((o) => !Number.isSafeInteger(o.size) || o.size < 0)
  ) {
    throw new Error('Object inventory is incomplete or invalid.');
  }
  stored = Math.max(
    stored,
    inventory.reduce((sum, o) => sum + o.size, 0),
  );
  const usage = cf([
    'sql',
    'query',
    'SELECT sum(sampleInterval) AS operations FROM events.r2CombinedOperations',
    '--scope-account',
    account,
    '--time-since',
    r2.current_period_start,
    '--time-until',
    new Date().toISOString(),
  ]);
  const operations = Number(usage.data?.[0]?.operations);
  // Analytics is delayed/sampled: use ALL operations and a conservative margin.
  // This is a publishing guard, not a provider-enforced account spending cap.
  if (!Number.isFinite(operations) || operations >= 100000)
    throw new Error('Usage unavailable or requires review (100k operations).');
  const paths = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (Object.hasOwn(files, entry.name)) {
        const size = (await stat(path)).size;
        if (size !== files[entry.name]) throw new Error(`Unexpected size: ${entry.name}`);
        paths.push({ name: entry.name, path, size });
      }
    }
  }
  await walk(resolve(root, 'dist/installers'));
  if (paths.length !== 4 || new Set(paths.map((p) => p.name)).size !== 4)
    throw new Error('Expected exactly four installers.');
  const projected = stored + paths.reduce((total, p) => total + p.size, 0);
  if (projected > 8_000_000_000) throw new Error('Projected storage exceeds 8 GB.');
  console.log(
    JSON.stringify({
      storedBytes: stored,
      projectedBytes: projected,
      observedOperations: operations,
    }),
  );
  if (!process.argv.includes('--upload')) {
    console.log('Checks passed. Use --upload to publish; no objects written.');
  } else {
    const existing = cf(['r2', 'objects', 'list', '--bucket-name', bucket, '--prefix', 'v0.1.0/']);
    // Never overwrite this immutable release. Inspect the raw API shape first.
    if (!Array.isArray(existing) || existing.length) {
      throw new Error('Release exists or listing is incomplete; inspect before uploading.');
    }
    for (const file of paths) {
      console.log(`Uploading ${file.name}`);
      execFileSync(
        'cf',
        [
          'r2',
          'objects',
          'put',
          `v0.1.0/${file.name}`,
          '--bucket-name',
          bucket,
          '--file',
          file.path,
          '--content-type',
          'application/octet-stream',
          '--cf-r2-storage-class',
          'Standard',
        ],
        { cwd: root, stdio: 'inherit', timeout: 600000 },
      );
    }
  }
} finally {
  await rm(lock, { recursive: true });
}
