import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const types = {
  '.md': 'document',
  '.txt': 'document',
  '.json': 'data',
  '.html': 'preview',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.webp': 'image',
};
export async function readOutput(root, relative) {
  if (
    typeof relative !== 'string' ||
    path.isAbsolute(relative) ||
    relative.split(/[\\/]/).some((p) => p === '..' || p.startsWith('.')) ||
    /credential|secret|token|encrypted|state\.json|knowledge\.json/i.test(relative)
  )
    throw Error('Not a shareable output path');
  const base = await fs.realpath(root),
    file = await fs.realpath(path.join(base, relative)),
    inside = path.relative(base, file);
  if (
    inside.startsWith('..') ||
    path.isAbsolute(inside) ||
    !types[path.extname(file).toLowerCase()]
  )
    throw Error('Unsupported output');
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size > 10 * 1024 * 1024)
    throw Error('Output exceeds preview size limit');
  return {
    data: await fs.readFile(file),
    type: types[path.extname(file).toLowerCase()],
    extension: path.extname(file).toLowerCase(),
  };
}
export async function collectOutputs(root) {
  let entries = [];
  try {
    const raw = await readOutput(root, 'makepace-outputs.json');
    if (raw.data.length > 512000) throw Error('Output index too large');
    entries = JSON.parse(raw.data.toString('utf8')).outputs;
    if (!Array.isArray(entries)) throw Error('Invalid output index');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  entries = [
    ...entries,
    { path: 'research-evidence.json', title: 'Research evidence', kind: 'research' },
    { path: 'publishing-plan.json', title: 'Publishing plan', kind: 'publishing' },
  ].filter((entry) => entry?.path !== 'research/content-format-research.json');
  const result = [],
    seen = new Set();
  for (const entry of entries.slice(0, 100)) {
    if (!entry || seen.has(entry.path)) continue;
    seen.add(entry.path);
    try {
      const file = await readOutput(root, entry.path);
      const hash = createHash('sha256').update(file.data).digest('hex');
      result.push({
        id: createHash('sha256')
          .update(entry.path + '\0' + hash)
          .digest('hex')
          .slice(0, 24),
        path: entry.path,
        title: String(entry.title || path.basename(entry.path)).slice(0, 160),
        kind: String(entry.kind || file.type).slice(0, 40),
        type: file.type,
        hash,
      });
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  return result;
}
export async function registerOutputs(c, root, baseline = []) {
  const before = new Set(baseline.map((o) => o.id)),
    outputs = await collectOutputs(root);
  for (const output of outputs)
    if (
      !before.has(output.id) &&
      !c.messages.some((m) => m.role === 'output' && m.output?.id === output.id)
    )
      c.messages.push({ role: 'output', id: 'output-' + output.id, output });
  return outputs;
}
