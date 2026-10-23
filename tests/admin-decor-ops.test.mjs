import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAdminDecorPatch, adminDecorSnapshot, buildAdminDecorCreateItem } from '../apps/server/src/admin-decor-ops.js';

test('applyAdminDecorPatch — position et rotY', () => {
  const item = { x: 0, z: 0, rotY: 0, scale: 1 };
  const changed = applyAdminDecorPatch(item, { x: 165.12, z: 7.08, rotY: 0.55, scale: 1.2 }, 'admin');
  assert.ok(changed.includes('x'));
  assert.equal(item.x, 165.12);
  assert.equal(item.rotY, 0.55);
  assert.equal(item.scale, 1.2);
  assert.ok(item.updatedAt);
});

test('adminDecorSnapshot — résumé coffre', () => {
  const snap = adminDecorSnapshot({
    id: 'seed_s01:cabin01:chest',
    prefabId: 'storage_chest',
    storage: [{ type: 'food' }, null],
  });
  assert.equal(snap.storageSummary.filled, 1);
  assert.equal(snap.storageSummary.capacity, 2);
});

test('buildAdminDecorCreateItem — prefab camp + arbre', () => {
  const camp = buildAdminDecorCreateItem('spawn_campfire', { x: 12.5, z: -8.2, rotY: 1.1, scale: 1 }, 'decor_99', 'builder');
  assert.equal(camp.prefabId, 'spawn_campfire');
  assert.equal(camp.x, 12.5);
  assert.equal(camp.rotY, 1.1);
  assert.equal(camp.createdBy, 'builder');
  const tree = buildAdminDecorCreateItem('tree_oak', { x: 0, z: 0, rotY: 0 }, 'decor_100', 'admin');
  assert.ok(Number.isFinite(tree.treeSeed));
  const wreck = buildAdminDecorCreateItem('wreck_sedan', { x: 1, z: 2, rotY: 0 }, 'decor_101', 'admin');
  assert.equal(wreck.wreckVariant, 'rust');
  assert.equal(wreck.wreckWheels, 2);
});

test('buildAdminDecorCreateItem — x/z requis', () => {
  assert.throws(() => buildAdminDecorCreateItem('spawn_stone', { x: NaN, z: 0 }, 'd1'), /x et z requis/);
});
