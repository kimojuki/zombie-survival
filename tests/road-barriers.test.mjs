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

test('spawn trail junction creates a barrier gap on town_main', () => {
  const gaps = computeBarrierGaps();
  assert.equal(gaps.length, 1);
  assert.ok(gaps[0].r >= 7);
  const nearGap = computeRoadBarrierPlacements().filter(
    (p) => Math.hypot(p.x - gaps[0].x, p.z - gaps[0].z) < gaps[0].r + 1,
  );
  assert.ok(nearGap.length < countBarrierPlacements().total * 0.08);
});

test('rails carry length for collider scaling', () => {
  const rails = computeRoadBarrierPlacements().filter((p) => p.prefabId === 'road_barrier_rail');
  assert.ok(rails.length > 10);
  for (const r of rails) {
    assert.ok(r.railLen >= 0.02 && r.railLen <= 6.5);
    assert.ok(Number.isFinite(r.rotY));
  }
});
