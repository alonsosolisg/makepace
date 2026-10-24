import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const { version } = JSON.parse(await fs.readFile('package.json', 'utf8')) as { version: string };
const tag = process.env.GITHUB_REF_NAME;
if (tag !== `v${version}` || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error('Release tag must match package.json version');
}
if (process.argv.includes('--check')) {
  console.log('Verified release tag ' + tag);
} else {
  const directory = path.resolve('dist/installers');
  const names = ['win-x64.exe', 'mac-arm64.dmg', 'mac-x64.dmg', 'linux-x86_64.AppImage'].map(
    (suffix) => `MakePace-${version}-${suffix}`,
  );
  const sums: string[] = [];
  for (const name of names) {
    const file = await fs.readFile(path.join(directory, name));
    if (file.length < 1_000_000) throw new Error('Missing or incomplete installer: ' + name);
    sums.push(createHash('sha256').update(file).digest('hex') + '  ' + name);
  }
  const checksum = path.join(directory, 'SHA256SUMS.txt');
  await fs.writeFile(checksum, sums.join('\n') + '\n');
  execFileSync(
    'gh',
    [
      'release',
      'create',
      tag,
      '--verify-tag',
      '--draft',
      ...(version.includes('-') ? ['--prerelease'] : []),
      '--title',
      `MakePace ${version}`,
      '--notes-file',
      'CHANGELOG.md',
      ...names.map((name) => path.join(directory, name)),
      checksum,
    ],
    { stdio: 'inherit' },
  );
}
