const REPOSITORY = 'alonsosolisg/makepace';
const VERSION =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

/** Compare release versions; stable sorts after prereleases of the same version. */
export function compareVersions(left: string, right: string): number {
  const a = VERSION.exec(left),
    b = VERSION.exec(right);
  if (!a || !b) throw new Error('Invalid release version');
  for (let i = 1; i <= 3; i++) {
    const difference = Number(a[i]) - Number(b[i]);
    if (difference) return Math.sign(difference);
  }
  if (a[4] === b[4]) return 0;
  if (!a[4]) return 1;
  if (!b[4]) return -1;
  const aa = a[4].split('.'),
    bb = b[4].split('.');
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const x = aa[i],
      y = bb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const xn = /^\d+$/.test(x),
      yn = /^\d+$/.test(y);
    if (xn && yn) return Math.sign(Number(x) - Number(y));
    if (xn !== yn) return xn ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

export function selectUpdate(
  current: string,
  releases: unknown,
): { version: string; url: string } | null {
  if (!Array.isArray(releases)) throw new Error('Invalid release response');
  const candidates: string[] = [];
  for (const raw of releases) {
    if (!raw || typeof raw !== 'object') continue;
    const release = raw as Record<string, unknown>;
    if (release.draft || typeof release.tag_name !== 'string') continue;
    const version = release.tag_name.replace(/^v/, '');
    if (!VERSION.test(version)) continue;
    if (!current.includes('-') && (release.prerelease || version.includes('-'))) continue;
    if (compareVersions(version, current) > 0) candidates.push(version);
  }
  candidates.sort((a, b) => compareVersions(b, a));
  const version = candidates[0];
  return version
    ? {
        version,
        url: `https://github.com/${REPOSITORY}/releases/tag/v${encodeURIComponent(version)}`,
      }
    : null;
}

export async function checkForUpdate(current: string, request: typeof fetch = fetch) {
  const response = await request(
    `https://api.github.com/repos/${REPOSITORY}/releases?per_page=30`,
    {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'MakePace/' + current },
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    },
  );
  if (!response.ok) throw new Error('Could not check GitHub Releases. Try again later.');
  return selectUpdate(current, await response.json());
}
