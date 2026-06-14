#!/usr/bin/env node
/**
 * Smoke test via nginx reverse proxy (docker / VM).
 * Usage: node tools/docker/smoke-proxy.mjs [--443]
 */
import assert from 'node:assert/strict';

const use443 = process.argv.includes('--443');
const GAME = (
  process.env.GAME_URL
  || (use443 ? 'http://127.0.0.1:443' : 'http://127.0.0.1:4000')
).replace(/\/+$/, '');
const SERVER_ID = process.env.ZS_SERVER_ID || 'prod';

async function json(method, url, body, headers = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

console.log('=== smoke docker/VM (nginx) ===');
console.log('public:', GAME, '| port443:', use443, '| serverId:', SERVER_ID);

const health = await json('GET', `${GAME}/api/health`);
assert.equal(health.res.status, 200, 'game /api/health via nginx');
assert.equal(health.data.chat, true);

const info = await json('GET', `${GAME}/api/server-info`);
assert.equal(info.res.status, 200);
assert.equal(info.data.authMode, 'standalone', `authMode=${info.data.authMode}`);

const guest = await json('POST', `${GAME}/api/auth/guest`, { serverId: SERVER_ID });
assert.equal(guest.res.status, 200, `guest: ${JSON.stringify(guest.data)}`);
assert.ok(guest.data.handoff?.code);

const handoff = await json('POST', `${GAME}/api/auth/handoff`, {
  code: guest.data.handoff.code,
  serverId: SERVER_ID,
});
assert.equal(handoff.res.status, 200, `handoff: ${JSON.stringify(handoff.data)}`);
assert.ok(handoff.data.token);

const me = await json('GET', `${GAME}/api/auth/me`, null, {
  Authorization: `Bearer ${handoff.data.token}`,
});
assert.equal(me.res.status, 200);
assert.equal(me.data.username, guest.data.username);

console.log('OK nginx → game → auth (interne) → handoff → JWT');
console.log('username:', guest.data.username);
