import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'dist/app');
await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(out, { recursive: true });
for (const folder of ['desktop', 'scripts', 'landing', 'test', 'infra/downloads']) {
  const base = path.join(root, folder);
  if (!(await fs.stat(base).catch(() => null))?.isDirectory()) continue;
  for await (const relative of fs.glob('**/*', {
    cwd: base,
    exclude: ['node_modules/**', '.cloudflare/**', '.wrangler/**'],
  })) {
    const source = path.join(base, relative);
    if (!(await fs.stat(source)).isFile()) continue;
    const destination = path.join(out, folder, relative);
    const extension = path.extname(source);
    if (['.ts', '.mts', '.cts'].includes(extension) && !source.endsWith('.d.ts')) {
      if (source.endsWith('cloudflare.config.ts')) continue;
      const target = destination.replace(
        /\.(mts|cts|ts)$/,
        extension === '.mts' ? '.mjs' : extension === '.cts' ? '.cjs' : '.js',
      );
      await build({
        entryPoints: [source],
        outfile: target,
        bundle: false,
        platform: extension === '.ts' ? 'browser' : 'node',
        format: extension === '.cts' ? 'cjs' : 'esm',
        target: 'es2022',
      });
    } else if (!['.py', '.map'].includes(extension)) {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(source, destination);
    }
  }
}
const packageFile = path.join(root, 'package.json');
await fs.copyFile(packageFile, path.join(out, 'package.json'));
const { version } = JSON.parse(await fs.readFile(packageFile, 'utf8')) as { version: string };
const downloads = Object.fromEntries(
  Object.entries({
    'windows-x64': 'win-x64.exe',
    'macos-arm64': 'mac-arm64.dmg',
    'macos-x64': 'mac-x64.dmg',
    'linux-x64': 'linux-x86_64.AppImage',
  }).map(([platform, suffix]) => [
    platform,
    `https://github.com/alonsosolisg/makepace/releases/download/v${version}/MakePace-${version}-${suffix}`,
  ]),
);
await fs.writeFile(
  path.join(out, 'landing/releases.json'),
  JSON.stringify({ version, downloads }, null, 2),
);
console.log('Compiled MakePace to dist/app');
