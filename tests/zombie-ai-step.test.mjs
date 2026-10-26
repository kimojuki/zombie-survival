import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sanitizeZombieRuntime, stepZombieAi } = require('../apps/server/src/game/zombie-ai-step.js');

test('sanitize clears non-tutorial freeze and repairs NaN speed', () => {
  const z = {
    id: 1, x: 0, z: 0, frozen: true, scenarioFrozen: true, speed: NaN, wanderAngle: NaN,
  };
  assert.equal(sanitizeZombieRuntime(z), true);
  assert.equal(z.frozen, false);
  assert.equal(z.scenarioFrozen, false);
  assert.ok(Number.isFinite(z.speed) && z.speed > 0);
  assert.ok(Number.isFinite(z.wanderAngle));
});

test('sanitize keeps tutorial freeze', () => {
  const z = { id: 2, x: 0, z: 0, tutorial: true, frozen: true, speed: 1.5 };
  assert.equal(sanitizeZombieRuntime(z), true);
  assert.equal(z.frozen, true);
});

test('wander moves zombie and marks _syncDirty', () => {
  const z = {
    id: 3, x: 0, z: 0, speed: 2, angle: 0, wanderAngle: 0, wanderTimer: 5, aggroTimer: 0,
  };
  const r = stepZombieAi(z, { DT: 0.1, hasLOS: false });
  assert.equal(r.mode, 'wander');
  assert.ok(r.moved > 0.01, `moved=${r.moved}`);
  assert.equal(z._syncDirty, true);
  assert.ok(Math.abs(z.x - 0.05) < 1e-6); // 2 * 0.25 * 0.1
});

test('chase without LOS continues while aggroed', () => {
  const z = {
    id: 4, x: 0, z: 0, speed: 2, angle: 0, wanderAngle: 0, wanderTimer: 5, aggroTimer: 5,
    lastSeenX: 10, lastSeenZ: 0,
  };
  const r = stepZombieAi(z, {
    DT: 0.1,
    hasLOS: false,
    nearestP: { x: 10, z: 0 },
    nearestDist: 10,
  });
  assert.equal(r.mode, 'chase');
  assert.ok(z.x > 0.15, `x=${z.x}`);
  assert.equal(z._syncDirty, true);
});

test('frozen tutorial does not move', () => {
  const z = {
    id: 5, x: 0, z: 0, speed: 2, frozen: true, tutorial: true,
    wanderAngle: 0, wanderTimer: 1, aggroTimer: 5,
  };
  const r = stepZombieAi(z, {
    DT: 0.1,
    hasLOS: true,
    nearestP: { x: 5, z: 0 },
    nearestDist: 5,
  });
  assert.equal(r.mode, 'frozen');
  assert.equal(z.x, 0);
});

test('orphan freeze is cleared then wanders', () => {
  const z = {
    id: 6, x: 0, z: 0, speed: 2, frozen: true, // no tutorial
    wanderAngle: 0, wanderTimer: 5, aggroTimer: 0,
  };
  const r = stepZombieAi(z, { DT: 0.1 });
  assert.equal(z.frozen, false);
  assert.equal(r.mode, 'wander');
  assert.ok(r.moved > 0.01);
});
