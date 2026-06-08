import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { DOOR_OPEN_ANGLE } from '../packages/shared/src/door-leaf-collider.mjs';
import { survivorShackDoorLeafColliderDef } from '../packages/shared/src/survivor-shack-door.mjs';
import { decorLocalToWorld } from '../packages/shared/src/collider-resolve.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadDecorColliders() {
  const src = readFileSync(join(root, 'apps/client/public/js/decor_colliders.js'), 'utf8');
  const zs = {};
  vm.runInNewContext(src, { window: { ZS: zs }, ZS: zs, Math, console });
  return zs;
}

function shackCols(ZS, x, z, rotY, doorOpen) {
  return ZS.buildDecorColliders({
    kind: 'prefab',
    prefabId: 'building_survivor_shack',
    x,
    z,
    baseY: 6,
    rotY,
    scale: 1,
    decorId: `shack_${x}_${z}`,
    doorOpen,
  });
}

test('door leaf collider matches shared def at two placements', () => {
  const ZS = loadDecorColliders();
  const shared = survivorShackDoorLeafColliderDef();
  for (const [x, z, rotY] of [[165.1, 7.1, 0.55], [10, 4, 0]]) {
    const cols = shackCols(ZS, x, z, rotY, false);
    const door = cols.find((c) => Math.abs(c.lz + 2.10) < 0.01 && Math.abs(c.hw - shared.hw) < 0.01);
    assert.ok(door, `door at (${x}, ${z})`);
    assert.equal(door.lx, shared.lx);
    assert.equal(door.lz, shared.lz);
    assert.equal(door.hw, shared.hw);
    assert.equal(door.hd, shared.hd);
    assert.equal(door.rotY, rotY);
  }
});

test('open door keeps leaf collider rotated away from doorway', () => {
  const ZS = loadDecorColliders();
  const closed = shackCols(ZS, 0, 0, 0, false);
  const open = shackCols(ZS, 0, 0, 0, true);
  assert.equal(closed.length, open.length);
  const closedDoor = closed.find((c) => Math.abs(c.lz + 2.10) < 0.01 && Math.abs(c.hw - 0.62) < 0.01);
  const openDoor = open.find((c) => Math.abs(c.hw - 0.62) < 0.01 && c.localRotY);
  assert.ok(closedDoor);
  assert.ok(openDoor);
  assert.notEqual(openDoor.lx, closedDoor.lx);
  assert.notEqual(openDoor.lz, closedDoor.lz);
  assert.ok(Math.abs(openDoor.localRotY - DOOR_OPEN_ANGLE) < 0.001);
});

test('door collider world position follows Three.js pivot', () => {
  const shared = survivorShackDoorLeafColliderDef();
  const col = { cx: 165.1, cz: 7.1, rotY: 0.55, baseY: 6 };
  const w = decorLocalToWorld(shared.lx, 0, shared.lz, col);
  const c = Math.cos(0.55);
  const s = Math.sin(0.55);
  assert.ok(Math.abs(w.x - (165.1 + shared.lx * c + shared.lz * s)) < 0.001);
  assert.ok(Math.abs(w.z - (7.1 - shared.lx * s + shared.lz * c)) < 0.001);
});
