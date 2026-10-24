import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import puppeteer from 'puppeteer-core';
import { safeURL, chromePath } from './research.mjs';

const tool = (name, description, properties, required) => ({
  type: 'function',
  name,
  description,
  inputSchema: { type: 'object', additionalProperties: false, properties, required },
});
export const researchTools = [
  tool(
    'makepace_inspect_page',
    'Inspect a public original or library page in MakePace’s own Chrome/Edge browser. Returns visible text, links, media URLs and an actual screenshot. No T3 browser connection needed. For carousels use slide 0 first, then successive slide numbers; a failed next action is explicitly reported. This does not watch a complete video.',
    { url: { type: 'string' }, slide: { type: 'integer', minimum: 0, maximum: 15 } },
    ['url'],
  ),
  tool(
    'makepace_collect_social',
    'Collect public TikTok or Instagram posts through the locally saved Apify connection. Maximum 3 URLs, 20 results and $0.25 requested cap per run; at most 2 runs per turn. Returns run ID; poll with makepace_collection_result. Never asks for a token in chat.',
    {
      platform: { type: 'string', enum: ['tiktok', 'instagram'] },
      urls: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string' } },
    },
    ['platform', 'urls'],
  ),
  tool(
    'makepace_collection_result',
    'Read a collection started by MakePace. Poll only an issued run ID. Returns data when ready; do not restart the same run.',
    { runId: { type: 'string' } },
    ['runId'],
  ),
];
const pending = new Map();
process.parentPort?.on('message', ({ data }) => {
  if (data?.type !== 'research-result') return;
  const p = pending.get(data.id);
  if (!p) return;
  pending.delete(data.id);
  clearTimeout(p.timer);
  data.error ? p.reject(Error(data.error)) : p.resolve(data.result);
});
function desktopResearch(action, args) {
  if (!process.parentPort)
    throw Error(
      'Apify collection requires MakePace desktop and a saved Apify connection. Use makepace_inspect_page or public web search instead.',
    );
  return new Promise<{ runId: string; items?: unknown[] }>((resolve, reject) => {
    const id = randomUUID(),
      timer = setTimeout(() => {
        pending.delete(id);
        reject(Error('Collection request timed out. Check existing run before retrying.'));
      }, 60000);
    pending.set(id, { resolve, reject, timer });
    process.parentPort.postMessage({ type: 'research-request', id, action, args });
  });
}
export async function inspectPage({ url, slide = 0 }, cwd) {
  if (!Number.isInteger(slide) || slide < 0 || slide > 15)
    throw Error('Slide must be between 0 and 15.');
  await safeURL(url);
  const browser = await puppeteer.launch({
    executablePath: await chromePath(),
    headless: true,
    args: ['--disable-dev-shm-usage', '--disable-background-networking'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setRequestInterception(true);
    page.on('request', (r) => {
      void (async () => {
        try {
          if (!r.url().startsWith('data:')) await safeURL(r.url());
          await r.continue();
        } catch {
          await r.abort().catch(() => {});
        }
      })();
    });
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 4000 }).catch(() => {});
    let advanced = 0;
    for (; advanced < slide; advanced++) {
      const next = await page.$(
        'button[aria-label="Next"],button[aria-label="Next slide"],[role="button"][aria-label="Next"],[data-e2e="arrow-right"]',
      );
      if (!next) break;
      await next.click();
      await new Promise((r) => setTimeout(r, 350));
    }
    const evidence = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      text: document.body.innerText.slice(0, 20000),
      links: [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
        .map((a) => ({ url: a.href, text: a.innerText.slice(0, 100) }))
        .filter((a) => /^https?:/.test(a.url))
        .slice(0, 100),
      media: [...document.querySelectorAll<HTMLImageElement | HTMLVideoElement>('img,video')]
        .map((m) => ({
          type: m.tagName.toLowerCase(),
          url: m.currentSrc || m.src,
          alt: m instanceof HTMLImageElement ? m.alt : '',
          poster: m instanceof HTMLVideoElement ? m.poster : '',
        }))
        .filter((m) => /^https?:/.test(m.url))
        .slice(0, 40),
    }));
    const observedAt = new Date().toISOString(),
      id = randomUUID(),
      directory = path.join(cwd, 'research', 'captures');
    await fs.mkdir(directory, { recursive: true });
    const screenshot = await page.screenshot({ type: 'png' });
    const file = 'research/captures/' + id;
    const result = {
      ...evidence,
      status: response?.status(),
      observedAt,
      requestedSlide: slide,
      advancedSlides: advanced,
      completeSequenceInspected: false,
      screenshot: file + '.png',
      note:
        advanced < slide
          ? 'Could not advance to requested slide. Do not infer unseen content.'
          : 'Screenshot shows this viewport only. Login walls and previews are not full original evidence.',
    };
    await fs.writeFile(path.join(cwd, file + '.png'), screenshot);
    await fs.writeFile(path.join(cwd, file + '.json'), JSON.stringify(result, null, 2));
    return {
      success: true,
      contentItems: [
        { type: 'inputText', text: JSON.stringify(result) },
        {
          type: 'inputImage',
          imageUrl: 'data:image/png;base64,' + Buffer.from(screenshot).toString('base64'),
        },
      ],
    };
  } finally {
    await browser.close();
  }
}
export async function runResearchTool(name, args, active) {
  if (!active?.cwd) throw Error('No active workspace.');
  if (name === 'makepace_inspect_page') return inspectPage(args, active.cwd);
  if (!['makepace_collect_social', 'makepace_collection_result'].includes(name))
    throw Error('Unknown research tool.');
  if (name === 'makepace_collect_social') {
    active.collectionsStarted = (active.collectionsStarted || 0) + 1;
    if (active.collectionsStarted > 2)
      throw Error(
        'This turn’s collection limit is reached. Inspect existing results before starting another turn.',
      );
  }
  const result = await desktopResearch(
    name === 'makepace_collect_social' ? 'start' : 'result',
    args,
  );
  if (result.items) {
    const dir = path.join(active.cwd, 'research', 'collections');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, result.runId + '.json'), JSON.stringify(result, null, 2));
  }
  return {
    success: true,
    contentItems: [{ type: 'inputText', text: JSON.stringify(result).slice(0, 100000) }],
  };
}
