import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BEACH_SPAWN,
  BEACH_FOOTPRINT,
  BEACH_CENTER,
  BEACH_TRAIL_PTS,
  BEACH_SHORE_X,
  BEACH_COAST_RECT,
  MAP_EAST_X,
  beachCoastWeight,
  isInBeachFootprint,
  isOnBeachSafeSand,
  isBuildBlockedOnBeach,
  isForestTerrainAllowed,
  pickBeachSpawn,
} from '../packages/shared/src/beach-spawn.mjs';

test('beach spawn faces inland from east coast', () => {
  assert.ok(BEACH_SPAWN.x < BEACH_CENTER.cx);
  assert.equal(BEACH_SPAWN.rotY, Math.PI / 2);
});

test('beach coast reaches map east edge without grass gap', () => {
  assert.equal(BEACH_COAST_RECT.xEast, MAP_EAST_X);
  assert.ok(BEACH_SHORE_X >= MAP_EAST_X - 3);
  assert.ok(isInBeachFootprint(BEACH_SPAWN.x, BEACH_SPAWN.z, 0));
  assert.ok(beachCoastWeight(MAP_EAST_X, 0) > 0.7);
  assert.ok(beachCoastWeight(MAP_EAST_X - 2, -8) > 0.85);
});

test('beach tapers naturally at north and south tips', () => {
  assert.ok(beachCoastWeight(260, 0) > 0.75);
  assert.ok(beachCoastWeight(260, 72) < beachCoastWeight(260, 0));
  assert.ok(beachCoastWeight(260, 98) < 0.12);
  assert.ok(!isInBeachFootprint(260, 105, 0));
});

test('beach trail starts at sand edge and reaches forest clearing', () => {
  assert.deepEqual(BEACH_TRAIL_PTS[0], [242, -8]);
  assert.deepEqual(BEACH_TRAIL_PTS[BEACH_TRAIL_PTS.length - 1], [14, -18]);
});

test('pickBeachSpawn stays on coast strip', () => {
  for (let i = 0; i < 20; i++) {
    const p = pickBeachSpawn(() => i / 20);
    assert.ok(isInBeachFootprint(p.x, p.z, 2));
    assert.ok(beachCoastWeight(p.x, p.z) >= 0.32);
    assert.equal(p.rotY, BEACH_SPAWN.rotY);
  }
});

test('build blocked when footprint touches beach safe sand', () => {
  assert.ok(isBuildBlockedOnBeach(BEACH_SPAWN.x, BEACH_SPAWN.z));
  assert.ok(!isBuildBlockedOnBeach(180, -8));
});

test('beach safe sand covers spawn strip but not deep forest', () => {
  assert.ok(isOnBeachSafeSand(BEACH_SPAWN.x, BEACH_SPAWN.z));
  assert.ok(isOnBeachSafeSand(260, 0));
  assert.ok(!isOnBeachSafeSand(180, -8));
  assert.ok(!isOnBeachSafeSand(320, 0));
});

test('forest terrain rejects beach sand and allows inland forest', () => {
  assert.ok(!isForestTerrainAllowed(BEACH_SPAWN.x, BEACH_SPAWN.z));
  assert.ok(!isForestTerrainAllowed(265, -8));
  assert.ok(!isForestTerrainAllowed(270, 20));
  assert.ok(isForestTerrainAllowed(180, -8));
  assert.ok(isForestTerrainAllowed(0, -6));
  assert.ok(isForestTerrainAllowed(-50, 40));
});

test('pickBeachSpawn spreads along the beach', () => {
  const pts = Array.from({ length: 30 }, (_, i) => pickBeachSpawn(() => (i * 0.17) % 1));
  const xs = new Set(pts.map((p) => Math.round(p.x)));
  const zs = new Set(pts.map((p) => Math.round(p.z)));
  assert.ok(xs.size >= 4, 'x spread on sand');
  assert.ok(zs.size >= 6, 'z spread on sand');
});
