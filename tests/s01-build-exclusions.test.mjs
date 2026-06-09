import { describe, it } from 'node:test';

import assert from 'node:assert/strict';

import {

  isS01BuildBlocked,

  isInS01PoiBuildExclusion,

  isInBeachTrailMouthExclusion,

} from '../packages/shared/src/s01-build-exclusions.mjs';

import { isInS01SafeZone } from '../packages/shared/src/s01-safe-zones.mjs';

import { BEACH_SPAWN, BEACH_TRAIL_PTS } from '../packages/shared/src/beach-spawn.mjs';

import { S01_FOREST_HUB } from '../packages/shared/src/s01-poi.mjs';



describe('s01 build exclusions', () => {

  it('blocks build on beach spawn sand', () => {

    assert.equal(isS01BuildBlocked(BEACH_SPAWN.x, BEACH_SPAWN.z), true);

  });



  it('blocks build within 10 m of seeded cabin01', () => {
    assert.equal(isInS01PoiBuildExclusion(165.1, 7.1), true);
    assert.equal(isS01BuildBlocked(165.1, 7.1), true);
    assert.equal(isInS01PoiBuildExclusion(S01_FOREST_HUB.x, S01_FOREST_HUB.z), false);
  });



  it('allows build away from POI', () => {

    assert.equal(isInS01PoiBuildExclusion(120, 50), false);

    assert.equal(isS01BuildBlocked(120, 50), false);

  });



  it('trail mouth exclusion west of beach entry', () => {

    const [tx, tz] = BEACH_TRAIL_PTS[0];

    assert.ok(isInBeachTrailMouthExclusion(tx - 8, tz));

  });

});



describe('s01 safe zones', () => {

  it('beach spawn is safe', () => {

    assert.equal(isInS01SafeZone(BEACH_SPAWN.x, BEACH_SPAWN.z), true);

  });



  it('forest trail end is not safe', () => {

    assert.equal(isInS01SafeZone(0, -6), false);

  });



  it('deep forest is not safe', () => {

    assert.equal(isInS01SafeZone(120, 40), false);

  });

});

