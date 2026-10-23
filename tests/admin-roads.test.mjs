import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAdminRoadDef,
  buildAdminRoadCreate,
  applyAdminRoadPatch,
} from '../packages/shared/src/admin-roads.mjs';

test('normalizeAdminRoadDef requires 2+ points', () => {
  assert.equal(normalizeAdminRoadDef({ id: 'x', pts: [[0, 0]] }), null);
  const ok = normalizeAdminRoadDef({
    id: 'admin_road_1',
    pts: [[0, 0], [10, 5]],
    type: 'dirt',
    width: 2.6,
  });
  assert.ok(ok);
  assert.equal(ok.pts.length, 2);
  assert.equal(ok.type, 'dirt');
});

test('buildAdminRoadCreate sets metadata', () => {
  const road = buildAdminRoadCreate({
    label: 'cabane clairière',
    pts: [[165, 7], [85, -6], [0, -6]],
    width: 3,
    type: 'path',
  }, 'admin_road_1', 'bruno');
  assert.equal(road.id, 'admin_road_1');
  assert.equal(road.createdBy, 'bruno');
  assert.equal(road.type, 'path');
});

test('applyAdminRoadPatch updates pts', () => {
  const road = buildAdminRoadCreate({
    pts: [[0, 0], [5, 0]],
  }, 'admin_road_2', 'admin');
  const changed = applyAdminRoadPatch(road, {
    pts: [[0, 0], [5, 0], [10, 2]],
    width: 4,
  }, 'admin');
  assert.ok(changed.includes('pts'));
  assert.ok(changed.includes('width'));
  assert.equal(road.pts.length, 3);
});
