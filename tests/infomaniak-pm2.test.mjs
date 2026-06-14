import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('ecosystem.config.cjs exposes game pm2 app', () => {
  const eco = require('../infra/ecosystem.config.cjs');
  assert.ok(Array.isArray(eco.apps));
  assert.ok(eco.apps.length >= 1);
  const game = eco.apps.find((a) => a.script?.includes('apps/server/index.js'));
  assert.ok(game, 'game server app missing');
  assert.equal(game.exec_mode, 'fork');
  assert.ok(game.kill_timeout >= 60_000);
});

test('ecosystem auth app only when AUTH_MODE=standalone in .env', () => {
  const eco = require('../infra/ecosystem.config.cjs');
  const authApps = eco.apps.filter((a) => a.script?.includes('auth-server'));
  const hasStandalone = authApps.length > 0;
  if (hasStandalone) {
    assert.equal(authApps.length, 1);
    assert.match(authApps[0].name, /auth/i);
  } else {
    assert.equal(eco.apps.length, 1);
  }
});
