import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isS01BuildBlocked } from '../packages/shared/src/s01-build-exclusions.mjs';
import { isInS01SafeZone } from '../packages/shared/src/s01-safe-zones.mjs';
import { computeS01DecorPlacements } from '../packages/shared/src/s01-world-placements.mjs';
import { S01_DIRT_ROADS } from '../packages/shared/src/s01-roads.mjs';

test('S01 shared modules load for server boot', () => {
  assert.equal(isS01BuildBlocked(248, -8, 1.5, 1.5), true);
  assert.equal(isInS01SafeZone(248, -8), true);
  const placements = computeS01DecorPlacements();
  assert.ok(placements.length >= 1, 'S01 cabin01 POI placements');
  assert.ok(placements.some((p) => p.prefabId === 'building_survivor_shack'));
  assert.equal(S01_DIRT_ROADS.length, 0);
});

test('client s01_roads has no codegen dirt edges', async () => {
  const { readFile } = await import('fs/promises');
  const { join, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const src = await readFile(join(root, 'apps/client/public/js/s01_roads.js'), 'utf8');
  assert.doesNotMatch(src, /s01_trail_cabin01/);
  assert.doesNotMatch(src, /s01_cabin01_clearing/);
  assert.match(src, /defineEdge/);
  const world = await readFile(join(root, 'apps/client/public/js/world.js'), 'utf8');
  assert.match(world, /S01Roads\?\.registerRoads/);
  const proc = await readFile(join(root, 'apps/client/public/js/proc_spawn.js'), 'utf8');
  assert.match(proc, /ENABLE_CODEGEN_TRAIL_MESH/);
  assert.match(proc, /ENABLE_CODEGEN_TRAIL_MESH && ZS\.buildSpawnTrail/);
  assert.match(world, /S01Terrain\?\.registerWorld/);
});
