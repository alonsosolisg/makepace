import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { CodexSession } from '../scripts/studio/reconnect.mjs';
class Connection extends EventEmitter {
  calls = [];
  account = { type: 'chatgpt' };
  fail = false;
  async connect() {
    this.calls.push('connect');
    if (this.fail) {
      this.fail = false;
      throw Error('temporary');
    }
  }
  async rpc(method) {
    this.calls.push(method);
    return { account: this.account };
  }
  close() {}
}
async function untilConnected(session) {
  while (session.status !== 'connected') await once(session, 'change');
}
test('reconnects after a drop without replaying any work', async () => {
  const connection = new Connection(),
    session = new CodexSession(connection, { delay: 1, maxDelay: 5 });
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    const first = session.connect();
    assert.equal(session.connect(), first);
    await first;
    connection.fail = true;
    connection.emit('disconnected');
    await untilConnected(session);
    assert.equal(session.account.type, 'chatgpt');
    assert.equal(connection.calls.filter((x) => x === 'connect').length, 3);
    assert.ok(connection.calls.every((x) => ['connect', 'account/read'].includes(x)));
  } finally {
    clearTimeout(keepAlive);
    session.stop();
  }
});
test('missing authentication stops automatic retry and permits manual reconnect', async () => {
  const connection = new Connection(),
    session = new CodexSession(connection, { delay: 1 });
  connection.account = null;
  assert.equal(await session.connect(), null);
  assert.equal(session.status, 'sign-in-required');
  assert.equal(session.enabled, false);
  assert.equal(session.timer, null);
  connection.account = { type: 'chatgpt' };
  await session.connect();
  assert.equal(session.status, 'connected');
  session.stop();
});
