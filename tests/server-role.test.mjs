import test from 'node:test';
import assert from 'node:assert/strict';
import { getServerRole, isDevServer, isQaServer, isProdServer } from '../apps/server/src/server-role.js';

test('getServerRole defaults to prod', () => {
  const prev = process.env.SERVER_ROLE;
  delete process.env.SERVER_ROLE;
  assert.equal(getServerRole(), 'prod');
  assert.equal(isProdServer(), true);
  if (prev != null) process.env.SERVER_ROLE = prev;
});

test('getServerRole reads env', () => {
  const prev = process.env.SERVER_ROLE;
  process.env.SERVER_ROLE = 'qa';
  assert.equal(getServerRole(), 'qa');
  assert.equal(isQaServer(), true);
  process.env.SERVER_ROLE = 'dev';
  assert.equal(isDevServer(), true);
  if (prev != null) process.env.SERVER_ROLE = prev;
  else delete process.env.SERVER_ROLE;
});
