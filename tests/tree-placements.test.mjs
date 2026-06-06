import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTreePlacements,
  listTreePrefabIds,
  TREE_ZONES,
} from '../packages/shared/src/tree-placements.mjs';

test('tree placements cover all forest zones', () => {
  const placements = computeTreePlacements();
  const expectedMin = TREE_ZONES.reduce((s, z) => s + Math.floor(z.count * 0.85), 0);
  assert.ok(placements.length >= expectedMin, `only ${placements.length} trees`);
  for (const p of placements) {
    assert.equal(p.kind, 'prefab');
    assert.ok(listTreePrefabIds().includes(p.prefabId));
    assert.ok(Number.isFinite(p.x));
    assert.ok(Number.isFinite(p.z));
    assert.ok(Number.isFinite(p.treeSeed));
  }
});

test('forest main zone has mixed prefab types', () => {
  const main = computeTreePlacements().filter((p) => p.zoneId === 'forest_main');
  const types = new Set(main.map((p) => p.prefabId));
  assert.ok(types.has('tree_oak'));
  assert.ok(types.has('tree_pine'));
});

test('dead tree clusters use tree_dead prefab', () => {
  const dead = computeTreePlacements().filter((p) => p.prefabId === 'tree_dead');
  assert.ok(dead.length >= 6);
});
