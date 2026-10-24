// Generated icons use the approved three-bar mark, rendered by installed Chrome/Edge.
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { chromePath } from './studio/research.mjs';

const output = path.join(import.meta.dirname, 'studio/public/icons');
await fs.mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ executablePath: await chromePath(), headless: true });
try {
  const page = await browser.newPage();
  for (const size of [180, 192, 512]) {
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(
      `<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{display:block;width:100%;height:100%}</style><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#007D7B" d="M0 0h100v100H0z"/><g fill="#FFFDFA"><rect x="25" y="27" width="11" height="46" rx="5.5"/><rect x="43" y="27" width="11" height="46" rx="5.5"/><rect x="61" y="27" width="16" height="46" rx="8"/><path d="M61 27h5v46h-5z"/></g></svg>`,
    );
    await page.screenshot({ path: path.join(output, `icon-${size}.png`) });
  }
} finally {
  await browser.close();
}
