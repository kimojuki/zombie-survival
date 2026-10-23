import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WOOD_BUILD_HP,
  getBuildDamage,
  getBuildMaxHp,
  getDoorBreakDamage,
  hitsToDestroy,
  doorBreakHitsToDestroy,
  isBuildPrefab,
  LOCKED_DOOR_BREAK_HP,
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

test('locked door break damage accepts melee and fist', () => {
  assert.equal(getDoorBreakDamage('__fist__'), 1);
  assert.equal(getDoorBreakDamage('wpn_hache_combat'), 3);
  assert.equal(getDoorBreakDamage('wpn_couteau'), 2);
  assert.equal(getDoorBreakDamage('tool_verrou'), 0);
  assert.equal(doorBreakHitsToDestroy('__fist__'), LOCKED_DOOR_BREAK_HP);
  assert.equal(doorBreakHitsToDestroy('wpn_hache_combat'), Math.ceil(LOCKED_DOOR_BREAK_HP / 3));
});
