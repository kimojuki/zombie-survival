import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLoadedZombie,
  shouldPersistZombie,
  zombiePayloadForPersist,
} from '../apps/server/src/game/zombie-normalize.js';

test('normalizeLoadedZombie drops tutorial zombies', () => {
  assert.equal(normalizeLoadedZombie({
    id: 1, x: 0, z: 0, tutorial: true, frozen: true, speed: 2,
  }), null);
});

test('normalizeLoadedZombie clears frozen and repairs missing AI fields', () => {
  const z = normalizeLoadedZombie({
    id: 7,
    x: 10,
    z: -4,
    frozen: true,
    scenarioFrozen: true,
    health: 40,
  });
  assert.ok(z);
  assert.equal(z.frozen, false);
  assert.equal(z.scenarioFrozen, false);
  assert.ok(Number.isFinite(z.speed) && z.speed > 0);
  assert.ok(Number.isFinite(z.wanderAngle));
  assert.ok(Number.isFinite(z.wanderTimer));
  assert.equal(z.aggroTimer, 0);
  assert.equal(z.x, 10);
  assert.equal(z.z, -4);
});

test('normalizeLoadedZombie rejects invalid coords', () => {
  assert.equal(normalizeLoadedZombie({ id: 1, x: NaN, z: 0, speed: 2 }), null);
});

test('shouldPersistZombie skips tutorial', () => {
  assert.equal(shouldPersistZombie({ id: 1, tutorial: true }), false);
  assert.equal(shouldPersistZombie({ id: 1 }), true);
});

test('zombiePayloadForPersist clears freeze flags', () => {
  const payload = zombiePayloadForPersist({
    id: 3,
    x: 1,
    z: 2,
    frozen: true,
    scenarioFrozen: true,
    meleeReach: true,
    lastSeenX: 9,
    _syncX: 1,
  });
  assert.equal(payload.frozen, false);
  assert.equal(payload.scenarioFrozen, false);
  assert.equal(payload.meleeReach, undefined);
  assert.equal(payload.lastSeenX, undefined);
  assert.equal(payload._syncX, undefined);
});
