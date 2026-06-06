import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMineStoneYield,
  getRockStoneMax,
  isMinableRockPrefab,
  ROCK_STONE_STOCK,
} from '../packages/shared/src/rock-stone.mjs';
import { computeRockPlacements, computeCampRockAnchors, isInCampFootprint } from '../packages/shared/src/rock-placements.mjs';
import { isRockSpawnClear, isRockAnchorClear } from '../packages/shared/src/resource-spawn.mjs';
import { computeCampBorderLogPlacements } from '../packages/shared/src/camp-border-logs.mjs';

function _campSpawnDecorForTests() {
  const seed = [
    { prefabId: 'spawn_campfire', x: 0.2, z: -6.15 },
    { prefabId: 'spawn_log_pile', x: 2.1, z: -8.25 },
    { prefabId: 'spawn_supply_crate', x: 2.55, z: -5.75, scale: 1.2 },
    { prefabId: 'spawn_supply_crate', x: 3.25, z: -6.7, scale: 0.72 },
    { prefabId: 'spawn_workbench', x: -2.45, z: -5.7 },
    { prefabId: 'spawn_bedroll', x: -2.9, z: -7.55 },
    { prefabId: 'spawn_backpack', x: -1.95, z: -6.9 },
    { prefabId: 'spawn_lantern', x: -1.45, z: -6.35 },
    { prefabId: 'spawn_stump_seat', x: -1.0, z: -4.0, scale: 2.0 },
    { prefabId: 'spawn_stump_seat', x: 1.05, z: -4.1, scale: 1.9 },
    { prefabId: 'spawn_drink_set', x: 1.1, z: -6.55 },
    { prefabId: 'spawn_marker_left', x: -3.35, z: -4.7 },
    { prefabId: 'spawn_marker_right', x: 1.95, z: -3.35 },
    { prefabId: 'spawn_marker_left', x: -0.2, z: -3.2 },
  ];
  for (const p of computeCampBorderLogPlacements(0, -6)) {
    seed.push({ prefabId: 'spawn_border_log', x: p.x, z: p.z, scale: p.scale });
  }
  return seed;
}

test('rock prefabs expose stone stock', () => {
  assert.equal(getRockStoneMax('rock_boulder'), ROCK_STONE_STOCK.rock_boulder);
  assert.equal(getRockStoneMax('spawn_stone'), 8);
  assert.equal(getRockStoneMax('rock_unknown'), 10);
});

test('mine yield scales by tool', () => {
  assert.equal(getMineStoneYield('tool_caillou'), 1);
  assert.equal(getMineStoneYield('tool_pioche_pierre'), 3);
  assert.equal(getMineStoneYield('tool_hache_pierre'), 1);
  assert.equal(getMineStoneYield('tool_pioche', 3), 3);
});

test('minable rock prefab detection', () => {
  assert.equal(isMinableRockPrefab('spawn_stone'), true);
  assert.equal(isMinableRockPrefab('rock_boulder'), true);
  assert.equal(isMinableRockPrefab('spawn_campfire'), false);
});

test('camp rock anchors sit near spawn trail', () => {
  const anchors = computeCampRockAnchors();
  assert.equal(anchors.length, 4);
  for (const a of anchors) {
    assert.ok(isMinableRockPrefab(a.prefabId));
    assert.ok(a.anchorId);
    assert.ok(a.z < 8, 'anchors should be south of player spawn (z≈7)');
    assert.equal(isInCampFootprint(a.x, a.z, 1.5), false, `${a.anchorId} inside camp`);
  }
  assert.ok(anchors.some((a) => a.prefabId === 'spawn_stone' && a.anchorId === 'starter_spawn_path'));
});

test('camp rock anchors avoid spawn decor footprint', () => {
  const campDecor = _campSpawnDecorForTests();
  for (const a of computeCampRockAnchors()) {
    assert.ok(
      isRockAnchorClear(a.x, a.z, campDecor, { minGap: 2.8, rockScale: a.scale || 1.4 }),
      `${a.anchorId} overlaps camp decor`,
    );
  }
});

test('rock placements produce valid entries', () => {
  const list = computeRockPlacements();
  assert.ok(list.length >= 40, `expected many world rocks, got ${list.length}`);
  for (const p of list) {
    assert.equal(p.kind, 'prefab');
    assert.ok(isMinableRockPrefab(p.prefabId));
    assert.ok(Number.isFinite(p.x));
    assert.ok(Number.isFinite(p.z));
    assert.ok(p.zoneId);
  }
});
