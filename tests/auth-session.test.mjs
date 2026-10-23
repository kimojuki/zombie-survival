import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function withTempAuthDb(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zs-auth-'));
  const dbPath = path.join(dir, 'auth-test.sqlite');
  const prev = process.env.AUTH_SQLITE_PATH;
  const prevClient = process.env.AUTH_DB_CLIENT;
  process.env.AUTH_SQLITE_PATH = dbPath;
  process.env.AUTH_DB_CLIENT = 'sqlite';

  return fn(dbPath).finally(() => {
    if (prev != null) process.env.AUTH_SQLITE_PATH = prev;
    else delete process.env.AUTH_SQLITE_PATH;
    if (prevClient != null) process.env.AUTH_DB_CLIENT = prevClient;
    else delete process.env.AUTH_DB_CLIENT;
    fs.rmSync(dir, { recursive: true, force: true });
  });
}

function freshAuthModules() {
  delete require.cache[require.resolve('../apps/auth-server/src/auth-db.js')];
  delete require.cache[require.resolve('../apps/auth-server/src/session-service.js')];
  delete require.cache[require.resolve('../apps/auth-server/src/handoff.js')];
  return {
    authDb: require('../apps/auth-server/src/auth-db.js'),
    sessionService: require('../apps/auth-server/src/session-service.js'),
    handoff: require('../apps/auth-server/src/handoff.js'),
    bcrypt: require('bcrypt'),
  };
}

test('auth-session — register flow + handoff exchange one-time', async () => {
  await withTempAuthDb(async () => {
    const { authDb, sessionService, bcrypt } = freshAuthModules();
    const { createSessionService } = sessionService;

    await authDb.ensureAuthSchema();
    const hash = await bcrypt.hash('secret12', 12);
    const accountId = await authDb.createAccount('test_player', hash);
    const account = await authDb.getAccountById(accountId);

    const sessions = createSessionService({
      db: authDb,
      jwtSecret: 'test_jwt_secret',
      log: null,
    });

    const handoff = await sessions.createHandoffSession({
      accountId: account.id,
      username: account.username,
      isGuest: false,
      guestCommitted: false,
      serverId: 'qa',
      ip: '127.0.0.1',
    });

    assert.ok(handoff.exchangeCode);
    assert.ok(handoff.portalToken);

    const first = await sessions.exchangeHandoffCode(handoff.exchangeCode, { serverId: 'qa' });
    assert.equal(first.ok, true);
    assert.ok(first.token);
    assert.equal(first.username, 'test_player');
    assert.equal(first.sid, handoff.sessionId);

    const verified = await sessions.verifyGameToken(first.token);
    assert.ok(verified);
    assert.equal(verified.username, 'test_player');

    const second = await sessions.exchangeHandoffCode(handoff.exchangeCode, { serverId: 'qa' });
    assert.equal(second.ok, false);
    assert.equal(second.code, 'handoff_used');

    await authDb.pool.end();
  });
});

test('auth-session — handoff expiré', async () => {
  await withTempAuthDb(async () => {
    const { authDb, sessionService, handoff } = freshAuthModules();
    const { createSessionService } = sessionService;
    const { hashExchangeCode, generateSessionId } = handoff;

    await authDb.ensureAuthSchema();
    const accountId = await authDb.createAccount('exp_user', '!hash!');
    const code = 'test-code-expired';
    const sid = generateSessionId();
    const past = new Date(Date.now() - 5000).toISOString();

    await authDb.insertSession({
      id: sid,
      accountId,
      serverId: 'qa',
      exchangeCodeHash: hashExchangeCode(code),
      exchangeExpires: past,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });

    const sessions = createSessionService({ db: authDb, jwtSecret: 'test', log: null });
    const result = await sessions.exchangeHandoffCode(code, { serverId: 'qa' });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'handoff_expired');

    await authDb.pool.end();
  });
});

test('auth-session — logout révoque session', async () => {
  await withTempAuthDb(async () => {
    const { authDb, sessionService } = freshAuthModules();
    const { createSessionService } = sessionService;

    await authDb.ensureAuthSchema();
    const accountId = await authDb.createAccount('logout_user', '!hash!');
    const account = await authDb.getAccountById(accountId);

    const sessions = createSessionService({ db: authDb, jwtSecret: 'test', log: null });
    const handoff = await sessions.createHandoffSession({
      accountId: account.id,
      username: account.username,
      isGuest: false,
      guestCommitted: false,
      serverId: 'qa',
    });

    const portal = await sessions.verifyPortalToken(handoff.portalToken);
    assert.ok(portal);

    await sessions.revokeBySessionId(handoff.sessionId);
    const after = await sessions.verifyPortalToken(handoff.portalToken);
    assert.equal(after, null);

    await authDb.pool.end();
  });
});
