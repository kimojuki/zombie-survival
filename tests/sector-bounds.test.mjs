import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SECTOR_01,
  clampToSector01,
  isInsideSector01,
} from '../packages/shared/src/sector-bounds.mjs';
import { BEACH_SPAWN } from '../packages/shared/src/beach-spawn.mjs';

describe('sector bounds S01', () => {
  it('beach spawn is inside sector 01', () => {
    assert.ok(isInsideSector01(BEACH_SPAWN.x, BEACH_SPAWN.z));
  });

  it('forest camp is inside sector 01', () => {
    assert.ok(isInsideSector01(0, -6));
  });

  it('small town is outside sector 01', () => {
    assert.ok(!isInsideSector01(-177, 0));
  });

  it('main city is outside sector 01 (north)', () => {
    assert.ok(!isInsideSector01(-20, -182));
  });

  it('clamp keeps player in sector', () => {
    const c = clampToSector01(-200, 0);
    assert.equal(c.x, SECTOR_01.xMin);
    assert.equal(c.z, 0);
  });

  it('clamp north boundary', () => {
    const c = clampToSector01(0, -200);
    assert.equal(c.z, SECTOR_01.zMin);
  });
});
