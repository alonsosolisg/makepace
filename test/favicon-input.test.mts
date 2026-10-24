import test from 'node:test';
import assert from 'node:assert/strict';
import { faviconWebsite } from '../scripts/studio/public/favicon.js';
test('favicon lookup waits for a domain and deduplicates paths', () => {
  for (const value of [
    '',
    'hello',
    'example.',
    'example.c',
    'a sentence',
    'hello@example.com',
    '-bad.com',
    'bad_.com',
    'https://',
    '127.0.0.1',
    'https://user:pass@example.com',
  ]) {
    assert.equal(faviconWebsite(value), '', value);
  }
  assert.equal(faviconWebsite('example.com'), 'https://example.com');
  assert.equal(faviconWebsite('https://example.com/about?x=1'), 'https://example.com');
  assert.equal(faviconWebsite('  maritana.pe  '), 'https://maritana.pe');
});
