import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BEACH_SPAWN,
  BEACH_FOOTPRINT,
  BEACH_CENTER,
  isInBeachFootprint,
  pickBeachSpawn,
} from '../packages/shared/src/beach-spawn.mjs';

test('beach spawn faces inland from east coast', () => {
  assert.ok(BEACH_SPAWN.x < BEACH_CENTER.cx);
  assert.equal(BEACH_SPAWN.rotY, Math.PI / 2);
  assert.ok(Math.abs(BEACH_SPAWN.z - BEACH_CENTER.cz) < 5);
});

test('beach footprint contains spawn point', () => {
  assert.ok(isInBeachFootprint(BEACH_SPAWN.x, BEACH_SPAWN.z, 0));
  assert.equal(isInBeachFootprint(BEACH_FOOTPRINT.cx, BEACH_FOOTPRINT.cz, 0), true);
});

test('pickBeachSpawn stays near coast strip', () => {
  for (let i = 0; i < 20; i++) {
    const p = pickBeachSpawn(() => i / 20);
    assert.ok(p.x >= BEACH_SPAWN.x - 8 && p.x <= BEACH_SPAWN.x + 8);
    assert.ok(Math.abs(p.z - BEACH_SPAWN.z) <= 26);
    assert.equal(p.rotY, BEACH_SPAWN.rotY);
  }
});
