import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBeachImmersionPlacements,
  BEACH_IMMERSION_ZONE_ID,
  isBeachImmersionPlacementValid,
  beachImmersionPrefabIds,
} from '../packages/shared/src/beach-immersion-placements.mjs';
import { isOnBeachSafeSand } from '../packages/shared/src/beach-spawn.mjs';

test('beach immersion props — scènes sur sable, clés stables', () => {
  const props = computeBeachImmersionPlacements();
  assert.ok(props.length >= 17, `expected >= 17 immersion props, got ${props.length}`);

  const keys = new Set();
  for (const p of props) {
    assert.equal(p.zoneId, BEACH_IMMERSION_ZONE_ID);
    assert.ok(p.placementKey.startsWith('beach:imm:'));
    assert.ok(!keys.has(p.placementKey), `duplicate key ${p.placementKey}`);
    keys.add(p.placementKey);
    assert.ok(isOnBeachSafeSand(p.x, p.z), `${p.placementKey} off sand`);
    assert.ok(isBeachImmersionPlacementValid(p), `${p.placementKey} invalid`);
  }

  const ids = beachImmersionPrefabIds();
  assert.ok(ids.includes('spawn_loisir_life_ring'));
  assert.ok(ids.includes('spawn_beach_driftwood'));
  assert.ok(ids.includes('spawn_beach_boat_hull'));
  assert.ok(ids.includes('road_barrier_post'));
});
