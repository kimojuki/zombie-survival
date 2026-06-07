import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldPersistDecor, shouldPersistGroundItem } from '../apps/server/src/world-persist.js';

describe('world persist — all decor entities', () => {
  it('persists trees, rocks, wrecks and player builds', () => {
    assert.equal(shouldPersistDecor({ id: 'seed_tree:forest_main:1', prefabId: 'tree_oak', createdBy: 'seed' }), true);
    assert.equal(shouldPersistDecor({ id: 'seed_rock:beach_ring:2', prefabId: 'rock_boulder', createdBy: 'seed' }), true);
    assert.equal(shouldPersistDecor({ id: 'seed_wreck:town_main:0.2:left:wreck_sedan:0', prefabId: 'wreck_sedan' }), true);
    assert.equal(shouldPersistDecor({ id: 'decor_42', prefabId: 'build_wall_wood', persist: true }), true);
  });

  it('skips only explicit persist:false', () => {
    assert.equal(shouldPersistDecor({ id: 'tmp_1', persist: false }), false);
    assert.equal(shouldPersistDecor(null), false);
  });

  it('still persists ground items with TTL', () => {
    const future = Date.now() + 60_000;
    assert.equal(shouldPersistGroundItem({ id: 1, type: 'wood', expiresAt: future }), true);
    assert.equal(shouldPersistGroundItem({ id: 2, type: 'wood', expiresAt: Date.now() - 1 }), false);
  });
});
