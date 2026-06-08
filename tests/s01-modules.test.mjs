import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isS01BuildBlocked } from '../packages/shared/src/s01-build-exclusions.mjs';
import { isInS01SafeZone } from '../packages/shared/src/s01-safe-zones.mjs';
import { computeS01DecorPlacements } from '../packages/shared/src/s01-world-placements.mjs';

test('S01 shared modules load for server boot', () => {
  assert.equal(isS01BuildBlocked(248, -8, 1.5, 1.5), true);
  assert.equal(isInS01SafeZone(248, -8), true);
  assert.deepEqual(computeS01DecorPlacements(), []);
});
