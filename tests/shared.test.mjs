import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_NAME, ROUTES, SOCKET_EVENTS } from '../packages/shared/src/constants.mjs';
import { computeRoadWreckPlacements, ROAD_WRECK_TEMPLATES } from '../packages/shared/src/road-wrecks.mjs';

import { buildZombieEntity, getZombiePrefab, listZombiePrefabIds, pickZombiePrefab } from '../packages/shared/src/zombie-prefabs.mjs';

test('shared constants expose stable app contracts', () => {
  assert.equal(APP_NAME, 'Zombie Survival');
  assert.equal(ROUTES.HEALTH, '/api/health');
  assert.equal(SOCKET_EVENTS.PLAYER_ATTACK, 'player-attack');
  assert.equal(SOCKET_EVENTS.ZOMBIE_HIT, 'zombie-hit');
});

test('zombie prefabs build entities with combat stats', () => {
  const ids = listZombiePrefabIds();
  assert.ok(ids.includes('zombie_walker'));
  assert.ok(ids.includes('zombie_runner'));
  assert.ok(ids.includes('zombie_brute'));
  const brute = buildZombieEntity('zombie_brute', { x: 1, z: 2 }, 42);
  assert.equal(brute.id, 42);
  assert.equal(brute.prefabId, 'zombie_brute');
  assert.equal(brute.maxHealth, getZombiePrefab('zombie_brute').health);
  assert.ok(brute.damage > 0);
  assert.ok(brute.hitRadius > 0);
  assert.ok(brute.collideRadius > 0);
  for (let i = 0; i < 20; i++) assert.ok(ids.includes(pickZombiePrefab()));
});

test('road wreck placements are spread along the route', () => {
  const placements = computeRoadWreckPlacements();
  assert.equal(placements.length, ROAD_WRECK_TEMPLATES.length);
  for (let i = 1; i < placements.length; i++) {
    const a = placements[i - 1];
    const b = placements[i];
    const gap = Math.hypot(b.x - a.x, b.z - a.z);
    assert.ok(gap >= 8, `wrecks ${i - 1}→${i} too close (${gap.toFixed(1)} m)`);
  }
});