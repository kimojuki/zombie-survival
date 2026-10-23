import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUEST_USERNAME_PREFIX,
  GUEST_COMMIT_PLAYTIME_MS,
  isGuestUsername,
  guestCommitMinutes,
  guestPlaytimeProgressMs,
} from '../packages/shared/src/guest-auth.mjs';

test('guest-auth — prefix et détection', () => {
  assert.equal(GUEST_USERNAME_PREFIX, 'Invite_');
  assert.equal(isGuestUsername('Invite_4821'), true);
  assert.equal(isGuestUsername('Survivant42'), false);
  assert.equal(isGuestUsername(''), false);
});

test('guest-auth — seuil de commit', () => {
  assert.equal(guestCommitMinutes(), Math.round(GUEST_COMMIT_PLAYTIME_MS / 60000));
  assert.equal(guestPlaytimeProgressMs(0), 0);
  assert.equal(guestPlaytimeProgressMs(GUEST_COMMIT_PLAYTIME_MS), 1);
  assert.equal(guestPlaytimeProgressMs(GUEST_COMMIT_PLAYTIME_MS * 2), 1);
  assert.ok(guestPlaytimeProgressMs(GUEST_COMMIT_PLAYTIME_MS / 2) > 0.4);
});
