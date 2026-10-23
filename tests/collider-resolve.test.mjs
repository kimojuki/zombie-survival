import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decorLocalToWorld,
  decorWorldToLocal,
  resolveAgentAgainstCollider,
  resolveAgentCollision,
  segmentBlockedByColliders,
  hasLineOfSight,
} from '../packages/shared/src/collider-resolve.mjs';

test('decorLocalToWorld matches Three.js rotation.y (lx=0, lz=2.04, rotY=0.55)', () => {
  const rotY = 0.55;
  const col = { cx: 165.1, cz: 7.1, rotY, baseY: 7 };
  const w = decorLocalToWorld(0, 0, 2.04, col);
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  assert.ok(Math.abs(w.x - (165.1 + 2.04 * s)) < 0.001);
  assert.ok(Math.abs(w.z - (7.1 + 2.04 * c)) < 0.001);
  const back = decorWorldToLocal(w.x, 0, w.z, col);
  assert.ok(Math.abs(back.lx) < 0.001);
  assert.ok(Math.abs(back.lz - 2.04) < 0.001);
});

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

test('barrier rail segment blocks agent crossing the guard line', () => {
  const col = {
    type: 'seg',
    x0: -5,
    z0: 0,
    x1: 5,
    z1: 0,
    r: 0.14,
    baseY: 0,
    maxY: 0.78,
    decorId: 'rb_seg',
  };
  const out = resolveAgentAgainstCollider(col, 0, 0.25, 0.45, 0);
  assert.ok(out, 'player should be pushed off the rail segment');
  assert.ok(Math.abs(out.z) > 0.35);
});

test('barrier rail blocks ground-level agent from the side', () => {
  const col = {
    type: 'box',
    cx: 0,
    cz: 0,
    lx: 0,
    lz: 0,
    hw: 1.3,
    hd: 0.04,
    rotY: 0,
    baseY: 0,
    maxY: 0.66,
    decorId: 'rb_test',
  };
  const out = resolveAgentAgainstCollider(col, 0, 0.4, 0.4, 0);
  assert.ok(out, 'ground player should be blocked by waist-high rail');
  assert.ok(Math.abs(out.z) > 0.4);
});

test('barrier rail minY band must not disable ground collision', () => {
  const broken = {
    type: 'box',
    cx: 0,
    cz: 0,
    lx: 0,
    lz: 0,
    hw: 1.3,
    hd: 0.04,
    rotY: 0,
    baseY: 0,
    maxY: 2.3,
    minY: 1.5,
    decorId: 'rb_broken',
  };
  const out = resolveAgentAgainstCollider(broken, 0, 0.4, 0.4, 0);
  assert.equal(out, null, 'sanity: inflated minY skips collision');
});

test('decorWorldToLocal matches Three.js inverse rotY', () => {
  const col = { cx: 10, cz: 5, rotY: Math.PI / 2, baseY: 0 };
  const local = decorWorldToLocal(10, 0, 6, col);
  assert.ok(Math.abs(local.lx + 1) < 0.001);
  assert.ok(Math.abs(local.lz) < 0.001);
});

test('segmentBlockedByColliders detects wall between two points', () => {
  const wall = {
    type: 'box',
    cx: 0,
    cz: 0,
    lx: 0,
    lz: 0,
    hw: 0.5,
    hd: 2,
    rotY: 0,
    baseY: 0,
    decorId: 'wall1',
  };
  assert.equal(hasLineOfSight(-3, 0, 3, 0, [wall], 0), false);
  assert.equal(hasLineOfSight(-3, 0, -1.2, 0, [wall], 0), true);
});

test('oriented box pushes agent out when already inside footprint', () => {
  const door = {
    type: 'box',
    cx: 0,
    cz: -2.1,
    hw: 0.62,
    hd: 0.28,
    rotY: 0,
    baseY: 7.1,
    decorId: 'shack_door',
  };
  const out = resolveAgentAgainstCollider(door, 0, -2.1, 0.4, 6.85);
  assert.ok(out, 'agent inside thin door slab should be pushed out');
});

test('full-height decor door blocks agent below decor baseY on slope', () => {
  const door = {
    type: 'box',
    cx: 0,
    cz: -2.1,
    hw: 0.62,
    hd: 0.10,
    rotY: 0,
    baseY: 7.1,
    decorId: 'shack_door',
  };
  const feetY = 6.8;
  const out = resolveAgentAgainstCollider(door, 0, -1.95, 0.4, feetY);
  assert.ok(out, 'door should block even when feet are below shack baseY');
});

test('segmentBlockedByColliders ignores upper-floor minY band at ground level', () => {
  const upper = {
    type: 'box',
    cx: 0,
    cz: 0,
    lx: 0,
    lz: 0,
    hw: 0.5,
    hd: 2,
    rotY: 0,
    baseY: 2.6,
    minY: 2.0,
    decorId: 'wall_up',
  };
  assert.equal(hasLineOfSight(-3, 0, 3, 0, [upper], 0), true);
});
