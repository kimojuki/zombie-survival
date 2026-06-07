import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldPersistDecor, shouldPersistGroundItem } from '../apps/server/src/world-persist.js';

test('player builds and chests are persistable', () => {
  assert.equal(shouldPersistDecor({
    id: 'decor_42',
    prefabId: 'build_floor_wood',
    createdBy: 'alice',
  }), true);
  assert.equal(shouldPersistDecor({
    id: 'decor_43',
    prefabId: 'storage_chest',
    createdBy: 'bob',
    storage: [],
  }), true);
});

test('world seed decor (trees, rocks, regen) is persistable', () => {
  assert.equal(shouldPersistDecor({
    id: 'seed_tree:forest_main:1',
    prefabId: 'spawn_campfire',
    createdBy: 'seed',
  }), true);
  assert.equal(shouldPersistDecor({
    id: 'seed_tree:forest_main:99',
    prefabId: 'tree_oak',
    createdBy: 'seed',
  }), true);
  assert.equal(shouldPersistDecor({
    id: 'seed_tree:regen_tree:42',
    prefabId: 'tree_pine',
    regen: true,
    zoneId: 'regen_tree',
  }), true);
});

test('explicit persist flag overrides heuristics', () => {
  assert.equal(shouldPersistDecor({
    id: 'decor_9',
    prefabId: 'spawn_crate',
    createdBy: 'seed',
    persist: true,
  }), true);
  assert.equal(shouldPersistDecor({
    id: 'decor_10',
    prefabId: 'build_wall_wood',
    createdBy: 'alice',
    persist: false,
  }), false);
});

test('ground items persist unless death bag expired', () => {
  assert.equal(shouldPersistGroundItem({
    id: 7,
    type: 'food_conserves',
    x: 1,
    z: 2,
    qty: 2,
    loot: true,
  }), true);
  assert.equal(shouldPersistGroundItem({
    id: 8,
    type: 'death_bag',
    bag: true,
    expiresAt: Date.now() + 60_000,
    items: [],
  }), true);
  assert.equal(shouldPersistGroundItem({
    id: 9,
    type: 'death_bag',
    bag: true,
    expiresAt: Date.now() - 1000,
    items: [],
  }), false);
});
