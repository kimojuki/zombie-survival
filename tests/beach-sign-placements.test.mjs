import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBeachSignPlacements,
  BEACH_SIGN_PLACEMENT_KEY,
} from '../packages/shared/src/beach-sign-placements.mjs';
import { isOnBeachSafeSand } from '../packages/shared/src/beach-spawn.mjs';

test('beach exit sign placement is on safe sand near trail mouth', () => {
  const signs = computeBeachSignPlacements();
  assert.equal(signs.length, 1);
  const s = signs[0];
  assert.equal(s.prefabId, 'sign_beach_exit');
  assert.equal(s.placementKey, BEACH_SIGN_PLACEMENT_KEY);
  assert.ok(isOnBeachSafeSand(s.x, s.z), 'sign must sit on beach sand');
});
