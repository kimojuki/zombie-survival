import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  AUTH_ROUTES,
  JWT_AUD,
  AUTH_ERROR_CODES,
  HANDOFF_TTL_SECONDS,
  hasRequiredGameClaims,
  isGameAudience,
} from '../packages/shared/src/auth-contract.mjs';

test('auth-contract — routes stables', () => {
  assert.equal(AUTH_ROUTES.login, '/api/auth/login');
  assert.equal(AUTH_ROUTES.exchange, '/api/auth/exchange');
  assert.equal(AUTH_ROUTES.handoff, '/api/auth/handoff');
  assert.equal(HANDOFF_TTL_SECONDS, 60);
});

test('auth-contract — audiences JWT', () => {
  assert.equal(JWT_AUD.portal, 'portal');
  assert.equal(JWT_AUD.game, 'game');
  assert.equal(isGameAudience('game'), true);
  assert.equal(isGameAudience('portal'), false);
});

test('auth-contract — claims game requis', () => {
  assert.equal(hasRequiredGameClaims(null), false);
  assert.equal(hasRequiredGameClaims({
    sub: 1,
    username: 'alice',
    sid: 'abc',
    aud: JWT_AUD.game,
  }), true);
  assert.equal(hasRequiredGameClaims({
    sub: 1,
    username: 'alice',
    sid: 'abc',
    aud: JWT_AUD.portal,
  }), false);
});

test('auth-contract — codes erreur', () => {
  assert.equal(AUTH_ERROR_CODES.devAdminOnly, 'dev_admin_only');
  assert.equal(AUTH_ERROR_CODES.handoffExpired, 'handoff_expired');
});
