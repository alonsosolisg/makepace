import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editConversation } from '../scripts/studio/conversations.mjs';
test('rename and delete are scoped and protect active conversations', () => {
  const c = { 'workspace:a:one': { messages: [] }, 'workspace:b:two': { messages: [] } };
  const input = { base: 'workspace:a', id: 'workspace:a:one' };
  editConversation(c, { ...input, action: 'rename', title: '  New name  ' });
  assert.equal(c[input.id].title, 'New name');
  assert.throws(() => editConversation(c, { ...input, action: 'rename', title: ' ' }));
  assert.throws(() => editConversation(c, { ...input, id: 'workspace:b:two', action: 'delete' }));
  assert.throws(() => editConversation(c, { ...input, action: 'delete' }, input.id));
  editConversation(c, { ...input, action: 'delete' });
  assert.ok(!c[input.id]);
  assert.ok(c['workspace:b:two']);
});
