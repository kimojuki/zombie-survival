import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decorWorldToLocal,
  resolveAgentAgainstCollider,
  resolveAgentCollision,
} from '../packages/shared/src/collider-resolve.mjs';

test('oriented decor box pushes agent out along rotY', () => {
  const col = {
    type: 'box',
    cx: 0,
    cz: 0,
    lx: 0,
    lz: 0,
    hw: 1,
    hd: 0.5,
    rotY: Math.PI / 2,
    baseY: 0,
    decorId: 'd1',
  };
  const out = resolveAgentAgainstCollider(col, 0.3, 1.2, 0.4, 0);
  assert.ok(out);
  assert.ok(Math.hypot(out.x, out.z) > 0.5);
});

test('wreck compound colliders block zombie radius', () => {
  const cols = [
    {
      type: 'box', cx: -18, cz: -37, lx: 0, lz: 0, hw: 0.89, hd: 2.05,
      rotY: -1.1, rotZ: 0.12, baseY: -7.25, decorId: 'w1', wreckPart: true,
    },
    {
      type: 'box', cx: -18, cz: -37, lx: 0, lz: -0.18, hw: 0.74, hd: 1.075,
      rotY: -1.1, rotZ: 0.12, baseY: -7.25, decorId: 'w1', wreckPart: true,
    },
  ];
  const [x, z] = resolveAgentCollision(-18, -37, cols, 0.52, 0);
  assert.ok(Math.hypot(x - (-18), z - (-37)) > 0.4);
});

test('decorWorldToLocal inverts rotY for local coords', () => {
  const col = { cx: 10, cz: 5, rotY: Math.PI / 2, baseY: 0 };
  const local = decorWorldToLocal(10, 0, 6, col);
  assert.ok(Math.abs(local.lx - 1) < 0.001);
  assert.ok(Math.abs(local.lz) < 0.001);
});
