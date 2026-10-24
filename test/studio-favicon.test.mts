import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iconLinks } from '../scripts/studio/favicon.mjs';
test('finds declared icons relative to the final redirected website', () => {
  const html = `<link href="/brand/icon.svg" rel="icon"><link rel='apple-touch-icon' href='apple.png'><link rel="stylesheet" href="style.css"><link rel="icon" href="javascript:alert(1)">`;
  assert.deepEqual(iconLinks(html, 'https://example.com/product/'), [
    'https://example.com/brand/icon.svg',
    'https://example.com/product/apple.png',
    'https://example.com/favicon.ico',
  ]);
});
test('deduplicates icons and provides a fallback', () => {
  assert.deepEqual(
    iconLinks('<link rel="shortcut icon" href="/favicon.ico">', 'https://example.com'),
    ['https://example.com/favicon.ico'],
  );
});
