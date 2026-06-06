import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMineStoneYield,
  getRockStoneMax,
  isMinableRockPrefab,
  ROCK_STONE_STOCK,
} from '../packages/shared/src/rock-stone.mjs';
import { computeRockPlacements, computeCampRockAnchors } from '../packages/shared/src/rock-placements.mjs';

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
  assert.equal(anchors.length, 3);
  for (const a of anchors) {
    assert.ok(isMinableRockPrefab(a.prefabId));
    assert.ok(a.anchorId);
    assert.ok(a.z < 8, 'anchors should be south of player spawn (z≈7)');
  }
});

test('rock placements produce valid entries', () => {
  const list = computeRockPlacements();
  assert.ok(list.length >= 10);
  for (const p of list) {
    assert.equal(p.kind, 'prefab');
    assert.ok(isMinableRockPrefab(p.prefabId));
    assert.ok(Number.isFinite(p.x));
    assert.ok(Number.isFinite(p.z));
  }
});
