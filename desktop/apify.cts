const fs = require('node:fs/promises');
const path = require('node:path');
function apifyResearch({ withKey, request = fetch, directory = undefined }) {
  const runs = new Map();
  const ready = directory
    ? fs
        .readFile(path.join(directory, 'apify-runs.json'), 'utf8')
        .then((raw) => {
          for (const [id, dataset] of Object.entries(JSON.parse(raw))) runs.set(id, dataset);
        })
        .catch((error) => {
          if (error.code !== 'ENOENT') throw error;
        })
    : Promise.resolve();
  let writes = Promise.resolve();
  async function call(route, options = {}) {
    return withKey(async (key) => {
      let response;
      try {
        response = await request('https://api.apify.com/v2/' + route, {
          ...options,
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
          redirect: 'error',
          signal: AbortSignal.timeout(45000),
        });
      } catch {
        throw Error('Apify could not be reached. Check the existing run before retrying.');
      }
      if (!response.ok)
        throw Error(
          response.status === 402
            ? 'Apify usage limit reached. No automatic retry.'
            : response.status === 401
              ? 'Reconnect Apify in Settings.'
              : 'Apify rejected the request (HTTP ' + response.status + ').',
        );
      return response.json();
    });
  }
  return async (action, args) => {
    await ready;
    if (action === 'start') {
      const { platform, urls } = args;
      if (
        !['tiktok', 'instagram'].includes(platform) ||
        !Array.isArray(urls) ||
        urls.length < 1 ||
        urls.length > 3
      )
        throw Error('Choose TikTok or Instagram and 1–3 public URLs.');
      const parsed = urls.map((value) => {
        const u = new URL(value);
        if (
          u.protocol !== 'https:' ||
          u.username ||
          u.password ||
          u.port ||
          !['www.' + platform + '.com', platform + '.com'].includes(u.hostname)
        )
          throw Error('Use original HTTPS platform URLs.');
        return u;
      });
      const actor = platform === 'tiktok' ? 'clockworks~tiktok-scraper' : 'apify~instagram-scraper';
      const input =
        platform === 'instagram'
          ? { directUrls: parsed.map((u) => u.href), resultsType: 'posts', resultsLimit: 20 }
          : {
              profiles: parsed
                .filter((u) => !/(video|photo)\//.test(u.pathname))
                .map((u) => u.pathname.split('/').filter(Boolean)[0]?.replace(/^@/, '')),
              postURLs: parsed.filter((u) => /(video|photo)\//.test(u.pathname)).map((u) => u.href),
              resultsPerPage: args.limit === 20 ? 20 : 6,
              shouldDownloadVideos: false,
              shouldDownloadCovers: false,
            };
      const { data } = await call(
        'acts/' + actor + '/runs?timeout=120&maxItems=20&maxTotalChargeUsd=0.25',
        { method: 'POST', body: JSON.stringify(input) },
      );
      if (!data?.id || !data.defaultDatasetId)
        throw Error('Apify did not return a run reference. Check the console before retrying.');
      runs.set(data.id, data.defaultDatasetId);
      if (directory) {
        const snapshot = JSON.stringify(Object.fromEntries(runs), null, 2);
        writes = writes.then(async () => {
          await fs.mkdir(directory, { recursive: true });
          const file = path.join(directory, 'apify-runs.json');
          await fs.writeFile(file + '.tmp', snapshot, { mode: 0o600 });
          await fs.rename(file + '.tmp', file);
        });
        await writes;
      }
      return { runId: data.id, status: data.status, requestedMaxChargeUsd: 0.25 };
    }
    if (action !== 'result' || !runs.has(args.runId))
      throw Error('Unknown collection run. Use a run started by this MakePace installation.');
    const { data } = await call(
      'actor-runs/' + encodeURIComponent(args.runId) + '?waitForFinish=15',
    );
    const result: { runId: string; status: string; observedAt: string; items?: unknown[] } = {
      runId: args.runId,
      status: data.status,
      observedAt: new Date().toISOString(),
    };
    if (data.status === 'SUCCEEDED')
      result.items = await call(
        'datasets/' + encodeURIComponent(runs.get(args.runId)) + '/items?clean=true&limit=20',
      );
    return result;
  };
}
module.exports = { apifyResearch };
