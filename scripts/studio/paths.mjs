import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';

export const appRoot=fileURLToPath(new URL('../../',import.meta.url));
export const dataRoot=process.env.MAKEPACE_DATA_ROOT?path.resolve(process.env.MAKEPACE_DATA_ROOT):path.join(appRoot,'.studio');
const sibling=path.resolve(appRoot,'../gd-gtm');
// Campaign data stays owned by its workspace, outside the MakePace repository.
export const workspaceRoot=process.env.MAKEPACE_WORKSPACE_ROOT
 ?path.resolve(process.env.MAKEPACE_WORKSPACE_ROOT)
 :existsSync(path.join(sibling,'social/carousels/output'))?sibling:path.join(appRoot,'data/workspace');
export const outputRoot=path.join(workspaceRoot,'social/carousels/output');
