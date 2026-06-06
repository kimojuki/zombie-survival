import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_NAME, ROUTES, SOCKET_EVENTS } from '../packages/shared/src/constants.mjs';

test('shared constants expose stable app contracts', () => {
  assert.equal(APP_NAME, 'Zombie Survival');
  assert.equal(ROUTES.HEALTH, '/api/health');
  assert.equal(SOCKET_EVENTS.PLAYER_ATTACK, 'player-attack');
});
