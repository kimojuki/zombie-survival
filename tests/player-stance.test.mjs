import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYER_EYE_STAND,
  PLAYER_EYE_CROUCH,
  playerEyeHeight,
  eyeYToFootY,
  isPlayerCrouched,
} from '../packages/shared/src/player-stance.mjs';

test('playerEyeHeight stand and crouch', () => {
  assert.equal(playerEyeHeight(0), PLAYER_EYE_STAND);
  assert.equal(playerEyeHeight(1), PLAYER_EYE_CROUCH);
  assert.ok(playerEyeHeight(0.5) < PLAYER_EYE_STAND);
  assert.ok(playerEyeHeight(0.5) > PLAYER_EYE_CROUCH);
});

test('eyeYToFootY uses crouch flag', () => {
  assert.equal(eyeYToFootY(5, false), 5 - PLAYER_EYE_STAND);
  assert.equal(eyeYToFootY(5, true), 5 - PLAYER_EYE_CROUCH);
});

test('isPlayerCrouched threshold', () => {
  assert.equal(isPlayerCrouched(0), false);
  assert.equal(isPlayerCrouched(0.8), true);
});
