import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  S01_CABIN01_BED_LOCAL,
  S01_SINGLE_BED_HALF_L,
  S01_SINGLE_BED_HALF_W,
  cabin01BedFitsShack,
  cabin01BedWorldXZ,
} from '../packages/shared/src/s01-cabin01-bed.mjs';
import { computeS01DecorPlacements } from '../packages/shared/src/s01-world-placements.mjs';

test('cabin01 bed fits NW corner inside shack', () => {
  assert.ok(cabin01BedFitsShack());
  const { lx, lz } = S01_CABIN01_BED_LOCAL;
  assert.ok(lx < 0, 'west side');
  assert.ok(lz > 0, 'north half');
  assert.ok(lx - S01_SINGLE_BED_HALF_W >= -2.32 + 0.1 - 0.001);
  assert.ok(lz + S01_SINGLE_BED_HALF_L <= 1.82 - 0.1 + 0.001);
});

test('seed includes shack + chest + single bed (no bedroll)', () => {
  const placements = computeS01DecorPlacements();
  assert.equal(placements.length, 3);
  assert.ok(!placements.find((p) => p.placementKey === 's01:cabin01:bedroll'));
  const bed = placements.find((p) => p.placementKey === 's01:cabin01:bed');
  assert.ok(bed);
  assert.equal(bed.prefabId, 'spawn_single_bed');
  assert.equal(bed.interactRole, 'bed');
  assert.equal(bed.shackFloorY, 0.12);
  const w = cabin01BedWorldXZ();
  assert.ok(Math.abs(bed.x - w.x) < 0.001);
  assert.ok(Math.abs(bed.z - w.z) < 0.001);
});
