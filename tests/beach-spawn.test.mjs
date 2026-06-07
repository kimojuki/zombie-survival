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
  isInBeachFootprint,
  pickBeachSpawn,
} from '../packages/shared/src/beach-spawn.mjs';

test('beach spawn faces inland from east coast', () => {
  assert.ok(BEACH_SPAWN.x < BEACH_CENTER.cx);
  assert.equal(BEACH_SPAWN.rotY, Math.PI / 2);
});

test('beach coast rect reaches map east edge', () => {
  assert.equal(BEACH_COAST_RECT.xEast, MAP_EAST_X);
  assert.ok(BEACH_SHORE_X >= MAP_EAST_X - 4);
  assert.ok(isInBeachFootprint(BEACH_SPAWN.x, BEACH_SPAWN.z, 0));
  assert.ok(isInBeachFootprint(MAP_EAST_X, 0, 0));
});

test('beach trail starts at sand edge and reaches forest clearing', () => {
  assert.deepEqual(BEACH_TRAIL_PTS[0], [242, -8]);
  assert.deepEqual(BEACH_TRAIL_PTS[BEACH_TRAIL_PTS.length - 2], [0, -6]);
});

test('pickBeachSpawn stays on coast strip', () => {
  for (let i = 0; i < 20; i++) {
    const p = pickBeachSpawn(() => i / 20);
    assert.ok(isInBeachFootprint(p.x, p.z, 2));
    assert.equal(p.rotY, BEACH_SPAWN.rotY);
  }
});
