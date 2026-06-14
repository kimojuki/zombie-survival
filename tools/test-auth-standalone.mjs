#!/usr/bin/env node
/**
 * Smoke test AUTH_MODE=standalone (auth :3001 + game :3000 deja demarres).
 * Usage : npm run test:auth-standalone
 */
import assert from 'node:assert/strict';

const GAME = (process.env.GAME_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const AUTH = (process.env.AUTH_INTERNAL_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const SERVER_ID = process.env.ZS_SERVER_ID || 'dev';

async function json(method, url, body, headers = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

console.log('=== test auth standalone ===');
console.log('game:', GAME, '| auth:', AUTH, '| serverId:', SERVER_ID);

const authHealth = await json('GET', `${AUTH}/api/health`);
assert.equal(authHealth.res.status, 200, 'auth /api/health');
assert.equal(authHealth.data.service, 'auth-server');

const info = await json('GET', `${GAME}/api/server-info`);
assert.equal(info.res.status, 200);
assert.equal(info.data.authMode, 'standalone', `authMode=${info.data.authMode} — lancez « ZS - Demarrer (+ auth) »`);
assert.equal(info.data.handoffEnabled, true);

const guest = await json('POST', `${GAME}/api/auth/guest`, { serverId: SERVER_ID });
assert.equal(guest.res.status, 200, `guest failed: ${JSON.stringify(guest.data)}`);
assert.ok(guest.data.handoff?.code, 'handoff.code manquant');
assert.ok(guest.data.username, 'username manquant');

const handoff = await json('POST', `${GAME}/api/auth/handoff`, {
  code: guest.data.handoff.code,
  serverId: SERVER_ID,
});
assert.equal(handoff.res.status, 200, `handoff failed: ${JSON.stringify(handoff.data)}`);
assert.ok(handoff.data.token, 'token game manquant');
assert.equal(handoff.data.username, guest.data.username);

const me = await json('GET', `${GAME}/api/auth/me`, null, {
  Authorization: `Bearer ${handoff.data.token}`,
});
assert.equal(me.res.status, 200, `me failed: ${JSON.stringify(me.data)}`);
assert.equal(me.data.username, guest.data.username);

console.log('OK guest → handoff → JWT game → /me');
console.log('username:', guest.data.username);
