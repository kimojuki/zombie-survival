import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAdminDecorPatch, adminDecorSnapshot } from '../apps/server/src/admin-decor-ops.js';

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
