import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyAdminDecorStoragePatch } from '../apps/server/src/admin-decor-ops.js';

describe('applyAdminDecorStoragePatch', () => {
  it('vide un coffre storage_chest', () => {
    const item = {
      prefabId: 'storage_chest',
      storage: [{ type: 'food_bread', qty: 1 }],
    };
    const changed = applyAdminDecorStoragePatch(item, { clearStorage: true });
    assert.deepEqual(changed, ['storage']);
    assert.equal(item.storage.length, 27);
    assert.equal(item.storage.filter(Boolean).length, 0);
  });

  it('ignore les prefabs non coffre', () => {
    const item = { prefabId: 'spawn_campfire' };
    const changed = applyAdminDecorStoragePatch(item, { clearStorage: true });
    assert.deepEqual(changed, []);
  });

  it('remplace la grille avec sanitization', () => {
    const item = { prefabId: 'storage_chest', storage: [] };
    const changed = applyAdminDecorStoragePatch(item, {
      storage: [{ type: 'ammo_pistolet', qty: 8 }, null],
    });
    assert.deepEqual(changed, ['storage']);
    assert.equal(item.storage[0].type, 'ammo_pistolet');
    assert.equal(item.storage[0].qty, 8);
    assert.equal(item.storage[1], null);
  });
});
