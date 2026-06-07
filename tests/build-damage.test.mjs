import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WOOD_BUILD_HP,
  getBuildDamage,
  getBuildMaxHp,
  hitsToDestroy,
  isBuildPrefab,
} from '../packages/shared/src/build-damage.mjs';

test('wood build prefabs share 100 HP', () => {
  assert.ok(isBuildPrefab('build_floor_wood'));
  assert.ok(isBuildPrefab('build_wall_wood'));
  assert.equal(isBuildPrefab('storage_chest'), false);
  assert.equal(getBuildMaxHp('build_floor_wood'), WOOD_BUILD_HP);
});

test('caillou and stone axe break wood at 100 and 50 hits', () => {
  assert.equal(getBuildDamage('tool_caillou'), 1);
  assert.equal(getBuildDamage('tool_hache_pierre'), 2);
  assert.equal(getBuildDamage('tool_hachette'), 0);
  assert.equal(hitsToDestroy('tool_caillou'), 100);
  assert.equal(hitsToDestroy('tool_hache_pierre'), 50);
});
