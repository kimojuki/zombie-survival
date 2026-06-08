import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SECTORS_ALL,
  SECTOR_01,
  getSectorAt,
  MAP_WORLD,
} from '../packages/shared/src/sectors.mjs';
import { BEACH_SPAWN } from '../packages/shared/src/beach-spawn.mjs';

describe('sectors registry', () => {
  it('has 10 sectors', () => {
    assert.equal(SECTORS_ALL.length, 10);
  });

  it('sector 01 is open', () => {
    assert.equal(SECTOR_01.status, 'open');
  });

  it('sector 02 small town is open', () => {
    const s02 = SECTORS_ALL.find((s) => s.id === 's02');
    assert.equal(s02?.status, 'open');
  });

  it('beach spawn resolves to sector 01', () => {
    const s = getSectorAt(BEACH_SPAWN.x, BEACH_SPAWN.z);
    assert.equal(s?.id, 's01_start_forest');
  });

  it('forest camp resolves to sector 01 despite overlaps', () => {
    const s = getSectorAt(0, -6);
    assert.equal(s?.id, 's01_start_forest');
  });

  it('small town resolves to sector 02', () => {
    const s = getSectorAt(-177, 0);
    assert.equal(s?.id, 's02');
  });

  it('map world bounds cover sector 01', () => {
    assert.ok(SECTOR_01.xMin >= MAP_WORLD.xMin);
    assert.ok(SECTOR_01.xMax <= MAP_WORLD.xMax);
    assert.ok(SECTOR_01.zMin >= MAP_WORLD.zMin);
    assert.ok(SECTOR_01.zMax <= MAP_WORLD.zMax);
  });
});
