import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPlayerBuiltDecor,
  BACKUP_FORMAT,
  BACKUP_VERSION,
} from '../apps/server/src/world-backup.js';
import { PLAYER_BUILD_PREFABS } from '../apps/server/src/world-persist.js';

describe('world backup', () => {
  it('detects player wood build decor', () => {
    assert.equal(isPlayerBuiltDecor({ id: 'a', prefabId: 'build_wall_wood' }), true);
    assert.equal(isPlayerBuiltDecor({ id: 'b', prefabId: 'tree_palm', placementKey: 's01:x' }), false);
    assert.equal(isPlayerBuiltDecor({ id: 'c', prefabId: 'storage_chest', createdBy: 'seed' }), false);
    assert.equal(isPlayerBuiltDecor({ id: 'd', prefabId: 'storage_chest', createdBy: 'bruno' }), true);
  });

  it('backup format constants', () => {
    assert.equal(BACKUP_FORMAT, 'zs-backup');
    assert.equal(BACKUP_VERSION, 1);
    assert.ok(PLAYER_BUILD_PREFABS.has('build_wall_wood'));
  });
});
