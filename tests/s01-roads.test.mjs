import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  S01_DIRT_ROADS,
  S01_SPAWN_TRAIL_PTS,
} from '../packages/shared/src/s01-roads.mjs';
import { BEACH_TRAIL_PTS } from '../packages/shared/src/beach-spawn.mjs';

test('S01 spawn trail pts match beach trail', () => {
  assert.deepEqual(S01_SPAWN_TRAIL_PTS, BEACH_TRAIL_PTS);
});

test('S01 codegen dirt roads empty — admin CMS only', () => {
  assert.equal(S01_DIRT_ROADS.length, 0);
});
