import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePalmPlacements,
  palmPlacementKey,
  PALM_ZONES,
} from '../packages/shared/src/palm-placements.mjs';
import {
  BEACH_TRAIL_PTS,
  BEACH_SPAWN,
  beachCoastWeight,
  isInBeachFootprint,
} from '../packages/shared/src/beach-spawn.mjs';

function _distToSegment(px, pz, x0, z0, x1, z1) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-8) return Math.hypot(px - x0, pz - z0);
  let t = ((px - x0) * dx + (pz - z0) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x0 + dx * t), pz - (z0 + dz * t));
}

function _nearTrail(x, z, margin = 2.5) {
  for (let i = 1; i < BEACH_TRAIL_PTS.length; i++) {
    const [x0, z0] = BEACH_TRAIL_PTS[i - 1];
    const [x1, z1] = BEACH_TRAIL_PTS[i];
    if (_distToSegment(x, z, x0, z0, x1, z1) < margin) return true;
  }
  return false;
}

test('palm placements stay on beach sand', () => {
  const palms = computePalmPlacements();
  assert.ok(palms.length >= 16, `expected >= 16 palms, got ${palms.length}`);
  assert.ok(palms.length <= 28, `expected <= 28 palms, got ${palms.length}`);
  for (const p of palms) {
    assert.equal(p.prefabId, 'tree_palm');
    assert.ok(p.zoneId.startsWith('beach_palms_'));
    assert.ok(beachCoastWeight(p.x, p.z) >= 0.35);
    assert.ok(isInBeachFootprint(p.x, p.z, 0));
    assert.ok(!_nearTrail(p.x, p.z));
    assert.ok(Math.hypot(p.x - BEACH_SPAWN.x, p.z - BEACH_SPAWN.z) >= 8);
    assert.ok(p.placementKey.startsWith('palm:beach_palms_'));
  }
});

test('palm placement keys are stable', () => {
  const palms = computePalmPlacements();
  assert.ok(palms.length > 0);
  const p = palms[0];
  assert.equal(palmPlacementKey(p), p.placementKey);
});

test('palm zone config — 3 bosquets côtier', () => {
  assert.equal(PALM_ZONES.length, 3);
  const total = PALM_ZONES.reduce((s, z) => s + z.count, 0);
  assert.ok(total >= 16 && total <= 28);
});
