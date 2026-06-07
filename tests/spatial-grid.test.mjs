import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSpatialGrid } from '../packages/shared/src/spatial-grid.mjs';

test('spatial grid returns items within radius', () => {
  const grid = createSpatialGrid(16);
  const a = { data: 'a', x: 0, z: 0 };
  const b = { data: 'b', x: 50, z: 0 };
  grid.rebuild([a, b]);
  const near = grid.query(0, 0, 10);
  assert.equal(near.length, 1);
  assert.equal(near[0], 'a');
});

test('spatial grid spans multiple cells', () => {
  const grid = createSpatialGrid(8);
  const pts = [
    { data: 1, x: -7, z: 0 },
    { data: 2, x: 7, z: 0 },
    { data: 3, x: 0, z: 20 },
  ];
  grid.rebuild(pts);
  const out = grid.query(0, 0, 12);
  assert.deepEqual(out.sort(), [1, 2]);
});
