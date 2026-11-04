import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpath } from 'node:fs/promises';

export const appRoot = fileURLToPath(new URL('../../', import.meta.url));
const projectRoot = path.resolve(appRoot, '../..');
export const dataRoot = process.env.MAKEPACE_DATA_ROOT
  ? path.resolve(process.env.MAKEPACE_DATA_ROOT)
  : path.join(projectRoot, '.studio');
// Campaign data stays owned by its workspace, outside the MakePace repository.
export const workspaceRoot = process.env.MAKEPACE_WORKSPACE_ROOT
  ? path.resolve(process.env.MAKEPACE_WORKSPACE_ROOT)
  : path.join(projectRoot, 'data/workspace');
export const outputRoot = path.join(workspaceRoot, 'social/carousels/output');

// Resolve links before reading; a lexical path check alone does not confine files.
export async function confinedPath(root: string, relative: string) {
  const base = await realpath(root),
    file = await realpath(path.resolve(base, relative)),
    inside = path.relative(base, file);
  if (inside === '..' || inside.startsWith('..' + path.sep) || path.isAbsolute(inside))
    throw Error('File points outside its root');
  return file;
}
