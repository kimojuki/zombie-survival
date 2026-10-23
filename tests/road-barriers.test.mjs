import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRoadBarrierPlacements,
  computeBarrierGaps,
  countBarrierPlacements,
  listRoadBarrierPrefabIds,
  BARRIER_ROADS,
} from '../packages/shared/src/road-barriers.mjs';

test('barrier prefab ids are stable', () => {
  assert.deepEqual(listRoadBarrierPrefabIds(), ['road_barrier_post', 'road_barrier_rail']);
});

test('barrier placements cover both asphalt roads', () => {
  const counts = countBarrierPlacements();
  assert.ok(counts.total > 100, `only ${counts.total} barriers`);
  assert.ok(counts.posts > 40);
  assert.ok(counts.rails > 40);
  for (const p of computeRoadBarrierPlacements()) {
    assert.equal(p.kind, 'prefab');
    assert.ok(listRoadBarrierPrefabIds().includes(p.prefabId));
    assert.ok(BARRIER_ROADS.some((r) => r.id === p.roadId));
  }
});

test('spawn trail removed — no barrier gap on town_main', () => {
  assert.deepEqual(computeBarrierGaps(), []);
});

test('rails carry length for collider scaling', () => {
  const rails = computeRoadBarrierPlacements().filter((p) => p.prefabId === 'road_barrier_rail');
  assert.ok(rails.length > 10);
  for (const r of rails) {
    assert.ok(r.railLen >= 0.02 && r.railLen <= 6.5);
    assert.ok(Number.isFinite(r.rotY));
  }
});
