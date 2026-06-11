import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBeachPropPlacements,
  BEACH_WRECK_PLACEMENT_KEY,
  BEACH_WASHED_GEAR_PLACEMENT_KEY,
  BEACH_DRIFTWOOD_PLACEMENT_KEY,
  BEACH_PROP_ZONE_ID,
  isBeachPropPlacementValid,
  beachPropMinDistFromSpawn,
} from '../packages/shared/src/beach-prop-placements.mjs';
import { BEACH_SPAWN, isOnBeachSafeSand } from '../packages/shared/src/beach-spawn.mjs';

test('beach spawn props — sable safe, hors spawn direct', () => {
  const props = computeBeachPropPlacements();
  assert.equal(props.length, 3);

  const wreck = props.find((p) => p.placementKey === BEACH_WRECK_PLACEMENT_KEY);
  const gear = props.find((p) => p.placementKey === BEACH_WASHED_GEAR_PLACEMENT_KEY);
  const drift = props.find((p) => p.placementKey === BEACH_DRIFTWOOD_PLACEMENT_KEY);
  assert.ok(wreck?.prefabId === 'spawn_beach_wreck_debris');
  assert.ok(gear?.prefabId === 'spawn_beach_washed_gear');
  assert.ok(drift?.prefabId === 'spawn_beach_driftwood');

  for (const p of props) {
    assert.equal(p.zoneId, BEACH_PROP_ZONE_ID);
    assert.ok(isOnBeachSafeSand(p.x, p.z), `${p.placementKey} must be on beach sand`);
    assert.ok(isBeachPropPlacementValid(p), `${p.placementKey} placement invalid`);
    assert.ok(beachPropMinDistFromSpawn(p.x, p.z) >= 3.5);
    assert.ok(p.groundLift < 0, `${p.placementKey} should be slightly buried in sand`);
  }

  assert.ok(wreck.x > BEACH_SPAWN.x, 'wreck toward sea (east of wake)');
  assert.ok(gear.x < BEACH_SPAWN.x, 'gear between wake and trail mouth');
  assert.ok(drift.x < BEACH_SPAWN.x, 'driftwood at trail mouth west of wake');
});
