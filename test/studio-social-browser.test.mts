import test from 'node:test';
import assert from 'node:assert/strict';
import {
  socialCandidates,
  classifyProfile,
  hasWebsiteBacklink,
} from '../scripts/studio/social-browser.mjs';
import { socialGroup } from '../scripts/studio/public/social-ownership.js';
import { modelSettings, turnSettings } from '../scripts/studio/model-settings.mjs';
test('browser candidates preserve source and keep guesses unverified', () => {
  const c = socialCandidates(
    'https://appheymom.com',
    'Hey Mom',
    [],
    [{ links: [{ url: 'https://www.tiktok.com/@heymomapp' }] }],
  );
  assert.equal(c[0].origin, 'website');
  assert.ok(c.some((x) => x.url.includes('instagram.com/heymomapp')));
  assert.ok(c.some((x) => x.origin === 'candidate'));
});
test('social access is distinct from profile ownership', () => {
  assert.equal(classifyProfile({ text: 'Log in to continue' }), 'blocked');
  assert.equal(classifyProfile({ status: 404 }), 'not-found');
  assert.equal(classifyProfile({ text: '@heymomapp 120 followers 5 following' }), 'readable');
});
test('explicit model and speed override inherited Codex settings', () => {
  assert.deepEqual(modelSettings(), { model: 'gpt-6.1-sol', serviceTier: 'default' });
  assert.deepEqual(modelSettings(true), { model: 'gpt-6.1-sol', serviceTier: 'fast' });
});
test('task reasoning respects the Astra ceiling and selected model', () => {
  for (const model of ['gpt-6.1-sol', 'gpt-6-astra', 'gpt-6-luna']) {
    const settings = modelSettings(true, model);
    assert.equal(turnSettings(settings, 'research').effort, 'medium');
    assert.equal(turnSettings(settings, 'creative', 'Fix a typo').effort, 'low');
    const complex = turnSettings(settings, 'creative', 'Analyze this campaign');
    assert.equal(complex.model, model);
    assert.equal(complex.serviceTier, 'fast');
    assert.equal(complex.effort, model === 'gpt-6-astra' ? 'medium' : 'high');
  }
  assert.throws(() => modelSettings(false, 'unknown'));
});
test('website accounts suppress alternative handles on those platforms', () => {
  const links = [
    { url: 'https://www.instagram.com/maritananature' },
    { url: 'https://www.tiktok.com/@maritananature' },
  ];
  const found = socialCandidates(
    'https://maritana.pe',
    'Maritana',
    [{ url: 'https://www.instagram.com/maritana/' }],
    [{ links }],
  );
  assert.deepEqual(
    found.map((x) => x.url),
    links.map((x) => x.url),
  );
  assert.ok(found.every((x) => x.origin === 'website'));
});
test('backlinks require exact website hosts, not substring or unrelated page text', () => {
  const domains = ['https://maritana.pe'];
  assert.equal(hasWebsiteBacklink({ links: ['https://maritana.pe.evil.test'] }, domains), false);
  assert.equal(hasWebsiteBacklink({ links: [], text: 'recommended maritana.pe' }, domains), false);
  assert.equal(hasWebsiteBacklink({ links: ['https://www.maritana.pe/shop'] }, domains), true);
  assert.equal(
    hasWebsiteBacklink(
      { links: ['https://l.instagram.com/?u=https%3A%2F%2Fmaritana.pe'] },
      domains,
    ),
    true,
  );
});
test('readable candidates are not accepted; user decisions override discovery', () => {
  const account = {
    url: 'https://www.instagram.com/maritana/',
    browserStatus: 'readable',
    confidence: 'unverified',
  };
  assert.equal(socialGroup({ socialChecks: [] }, account), 'candidate');
  const job = { socialDecisions: { 'instagram.com/maritana': 'rejected' } };
  assert.equal(socialGroup(job, { ...account, confidence: 'linked' }), 'rejected');
  job.socialDecisions['instagram.com/maritana'] = 'confirmed';
  assert.equal(socialGroup(job, account), 'confirmed');
});
