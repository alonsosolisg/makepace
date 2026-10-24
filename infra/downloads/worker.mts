// Only these immutable release files can reach R2. One read per accepted request.
export const files = {
  'MakePace-0.1.0-win-x64.exe': 227274112,
  'MakePace-0.1.0-mac-arm64.dmg': 261795631,
  'MakePace-0.1.0-mac-x64.dmg': 276931858,
  'MakePace-0.1.0-linux-x86_64.AppImage': 296086871,
};

export function byteRange(value, size) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) throw new Error('Invalid range');
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]), size - 1) : size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start)
    throw new Error('Invalid range');
  return { offset: start, length: end - start + 1 };
}

export default {
  async fetch(request, env) {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    const url = new URL(request.url);
    const filename = url.pathname.replace(/^\/v0\.1\.0\//, '');
    if (url.pathname !== `/v0.1.0/${filename}` || !Object.hasOwn(files, filename)) {
      return new Response('Download not found.', { status: 404 });
    }
    const size = files[filename];
    let range;
    try {
      range = request.method === 'HEAD' ? null : byteRange(request.headers.get('Range'), size);
    } catch {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    try {
      const key = `v0.1.0/${filename}`;
      const object =
        request.method === 'HEAD'
          ? await env.INSTALLERS.head(key)
          : await env.INSTALLERS.get(key, range ? { range } : {});
      if (!object) return new Response('Download not available.', { status: 404 });
      if (object.size !== size) {
        if (object.body) await object.body.cancel();
        return new Response('Download temporarily unavailable.', { status: 503 });
      }
      const headers = new Headers({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(range ? range.length : size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-Content-Type-Options': 'nosniff',
        ETag: object.httpEtag,
      });
      if (range)
        headers.set(
          'Content-Range',
          `bytes ${range.offset}-${range.offset + range.length - 1}/${size}`,
        );
      return new Response(request.method === 'HEAD' ? null : object.body, {
        status: range ? 206 : 200,
        headers,
      });
    } catch {
      console.error(JSON.stringify({ event: 'download_read_failed', filename }));
      return new Response('Download temporarily unavailable. Please try again later.', {
        status: 503,
      });
    }
  },
};
