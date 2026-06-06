import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSpawnPointClear,
  isRockSpawnClear,
  decorSpawnRadius,
  findRandomTreeSpawn,
  findRandomRockSpawn,
  seedWorldRockPlacements,
  countStandingTrees,
  countWorldRocks,
  REGEN_CONFIG,
} from '../packages/shared/src/resource-spawn.mjs';
import { computeTreePlacements } from '../packages/shared/src/tree-placements.mjs';
import { isInCampFootprint } from '../packages/shared/src/rock-placements.mjs';

test('spawn point rejects overlap with decor', () => {
  const decors = [{ prefabId: 'rock_boulder', x: 10, z: 10, growthPhase: 4 }];
  assert.equal(isSpawnPointClear(10.5, 10, decors, { minGap: 3 }), false);
  assert.equal(isSpawnPointClear(20, 20, decors, { minGap: 3 }), true);
});

test('tree decor radius shrinks for saplings', () => {
  assert.ok(decorSpawnRadius({ prefabId: 'tree_oak', growthPhase: 0 })
    < decorSpawnRadius({ prefabId: 'tree_oak', growthPhase: 4 }));
});

test('find random tree spawn returns valid placement', () => {
  const spot = findRandomTreeSpawn([], 42);
  assert.ok(spot);
  assert.equal(spot.kind, 'prefab');
  assert.ok(spot.prefabId.startsWith('tree_'));
  assert.equal(spot.growthPhase, undefined);
  assert.equal(spot.regen, true);
});

test('find random rock spawn returns adult rock', () => {
  const spot = findRandomRockSpawn([], 99);
  assert.ok(spot);
  assert.ok(spot.prefabId.startsWith('rock_'));
});

test('count helpers filter correctly', () => {
  const decors = [
    { prefabId: 'tree_oak', falling: false },
    { prefabId: 'tree_pine', falling: true },
    { prefabId: 'rock_boulder', anchorId: 'starter_trail' },
    { prefabId: 'rock_outcrop', zoneId: 'regen_rock' },
  ];
  assert.equal(countStandingTrees(decors), 1);
  assert.equal(countWorldRocks(decors), 1);
});

test('seed world rocks fills map without decor overlap', () => {
  const trees = computeTreePlacements().map((t) => ({ ...t }));
  const rocks = seedWorldRockPlacements(trees, { target: 30, seed: 42 });
  assert.ok(rocks.length >= 20, `expected many rocks, got ${rocks.length}`);
  for (const r of rocks) {
    assert.ok(isRockSpawnClear(r.x, r.z, trees, { minGap: 2.8 }));
    assert.ok(r.scale >= 1.4);
  }
});

test('seed world rocks respect building exclusions', () => {
  const rocks = seedWorldRockPlacements([], { target: 40, seed: 99 });
  const inCamp = rocks.filter((r) => isInCampFootprint(r.x, r.z, 2));
  assert.equal(inCamp.length, 0);
});
