import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdminMapStaticData, ADMIN_MAP_DESIGN_LANDMARKS } from '../packages/shared/src/admin-map-static.mjs';

test('admin map static — secteurs et landmarks design', () => {
  const data = getAdminMapStaticData();
  assert.ok(data.world?.scale);
  assert.ok(data.sectors?.length >= 6);
  assert.ok(data.roads?.length >= 3);
  assert.ok(data.gates?.length >= 3);
  assert.ok(data.designLandmarks?.length >= ADMIN_MAP_DESIGN_LANDMARKS.length);
});
