import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SECTOR_01,
  SECTOR_02,
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

  it('small town is now inside the playable area', () => {
    assert.ok(isInsideSector01(-177, 0));
  });

  it('main city is outside sector 01 (north)', () => {
    assert.ok(!isInsideSector01(-20, -182));
  });

  it('clamp allows player in small town', () => {
    const c = clampToSector01(-200, 0);
    assert.equal(c.x, -200);
    assert.equal(c.z, 0);
  });

  it('clamp keeps route corridor between S01 and S02 open', () => {
    const c = clampToSector01(-110, -10);
    assert.equal(c.x, -110);
    assert.equal(c.z, -10);
  });

  it('clamp north boundary', () => {
    const c = clampToSector01(0, -200);
    assert.equal(c.z, SECTOR_01.zMin);
  });

  it('clamp blocks beyond west side of small town', () => {
    const c = clampToSector01(-350, 0);
    assert.equal(c.x, SECTOR_02.xMin);
    assert.equal(c.z, 0);
  });
});
