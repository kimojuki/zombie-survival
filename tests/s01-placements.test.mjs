import { describe, it } from 'node:test';

import assert from 'node:assert/strict';

import {
  computeS01DecorPlacements,
  computeS01TreeClearZones,
  S01_BUILDING_TREE_CLEAR_R,
  S01_CABIN01_PROTO,
  isS01PlacementKey,
} from '../packages/shared/src/s01-world-placements.mjs';

import { BEACH_TRAIL_PTS } from '../packages/shared/src/beach-spawn.mjs';



describe('s01 world placements', () => {

  it('declares tree clear zone around seeded buildings', () => {
    const zones = computeS01TreeClearZones();
    assert.equal(zones.length, 1);
    assert.equal(zones[0].cx, S01_CABIN01_PROTO.x);
    assert.equal(zones[0].cz, S01_CABIN01_PROTO.z);
    assert.equal(zones[0].r, S01_BUILDING_TREE_CLEAR_R);
    assert.equal(zones[0].placementKey, 's01:cabin01:shack');
  });

  it('seeds cabin01 shack at playtest-validated anchor', () => {
    const placements = computeS01DecorPlacements();
    assert.equal(placements.length, 1);
    assert.equal(placements[0].prefabId, 'building_survivor_shack');
    assert.equal(placements[0].placementKey, 's01:cabin01:shack');
    assert.equal(placements[0].x, 165.1);
    assert.equal(placements[0].z, 7.1);
    assert.equal(placements[0].rotY, 0.55);
  });



  it('placement keys stay unique when populated', () => {

    const keys = computeS01DecorPlacements().map((p) => p.placementKey);

    assert.equal(keys.length, new Set(keys).size);

  });



  it('s01 placement key helper', () => {

    assert.equal(isS01PlacementKey('s01:gas:station'), true);

    assert.equal(isS01PlacementKey('beach:exit_torch'), false);

  });



  it('trail ends at south forest junction', () => {

    const last = BEACH_TRAIL_PTS[BEACH_TRAIL_PTS.length - 1];

    assert.deepEqual(last, [14, -18]);

  });

});

