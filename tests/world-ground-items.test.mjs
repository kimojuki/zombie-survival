import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { shouldPersistGroundItem } = require('../apps/server/src/world-persist.js');

const TTL = 30 * 60 * 1000;

test('building loot persists without expiresAt', () => {
  assert.ok(shouldPersistGroundItem({ id: 1, type: 'food_conserves', loot: true }));
});

test('expired ground drops are not persistable', () => {
  assert.equal(
    shouldPersistGroundItem({ id: 2, type: 'food_conserves', expiresAt: Date.now() - 1000 }),
    false,
  );
});

test('fresh ground drops remain persistable until expiry', () => {
  assert.ok(shouldPersistGroundItem({
    id: 3,
    type: 'food_conserves',
    expiresAt: Date.now() + TTL,
  }));
});

test('death bags use expiresAt like other transient drops', () => {
  assert.ok(shouldPersistGroundItem({
    id: 4,
    type: 'death_bag',
    bag: true,
    expiresAt: Date.now() + TTL,
  }));
  assert.equal(shouldPersistGroundItem({
    id: 5,
    type: 'death_bag',
    bag: true,
    expiresAt: Date.now() - 1,
  }), false);
});
