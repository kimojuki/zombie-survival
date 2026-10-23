import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AUTH_MODE_PATH = require.resolve('../apps/server/src/auth-mode.js');

function loadAuthMode() {
  delete require.cache[AUTH_MODE_PATH];
  return require(AUTH_MODE_PATH);
}

test('auth-mode defaults to embedded', () => {
  const saved = process.env.AUTH_MODE;
  delete process.env.AUTH_MODE;
  const mod = loadAuthMode();
  assert.equal(mod.getAuthMode(), 'embedded');
  assert.equal(mod.isAuthStandalone(), false);
  if (saved === undefined) delete process.env.AUTH_MODE;
  else process.env.AUTH_MODE = saved;
});

test('auth-mode standalone when AUTH_MODE=standalone', () => {
  const saved = process.env.AUTH_MODE;
  process.env.AUTH_MODE = 'standalone';
  const mod = loadAuthMode();
  assert.equal(mod.getAuthMode(), 'standalone');
  assert.equal(mod.isAuthStandalone(), true);
  if (saved === undefined) delete process.env.AUTH_MODE;
  else process.env.AUTH_MODE = saved;
});

test('auth-mode unknown value falls back to embedded', () => {
  const saved = process.env.AUTH_MODE;
  process.env.AUTH_MODE = 'invalid';
  const mod = loadAuthMode();
  assert.equal(mod.getAuthMode(), 'embedded');
  if (saved === undefined) delete process.env.AUTH_MODE;
  else process.env.AUTH_MODE = saved;
});
