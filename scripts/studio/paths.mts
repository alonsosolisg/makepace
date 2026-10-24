import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
