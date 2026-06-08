import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { survivorShackWallEastColliderDef } from '../packages/shared/src/survivor-shack-wall-east.mjs';
import { decorLocalToWorld } from '../packages/shared/src/collider-resolve.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadDecorColliders() {
  const src = readFileSync(join(root, 'apps/client/public/js/decor_colliders.js'), 'utf8');
  const zs = {};
  vm.runInNewContext(src, { window: { ZS: zs }, ZS: zs, Math, console });
  return zs;
}

test('east wall collider matches shared def and Three.js pivot', () => {
  const ZS = loadDecorColliders();
  const shared = survivorShackWallEastColliderDef();
  const cols = ZS.buildDecorColliders({
    kind: 'prefab',
    prefabId: 'building_survivor_shack',
    x: 10,
    z: 4,
    baseY: 6,
    rotY: 0.55,
    scale: 1,
    decorId: 'shack_e',
    doorOpen: false,
  });
  const east = cols.find((c) => Math.abs(c.lx - 2.54) < 0.01 && Math.abs(c.lz) < 0.01);
  assert.ok(east);
  assert.equal(east.lx, shared.lx);
  assert.equal(east.lz, shared.lz);
  assert.equal(east.hw, shared.hw);
  assert.equal(east.hd, shared.hd);
  assert.equal(east.rotY, 0.55);
  const col = { cx: 10, cz: 4, rotY: 0.55, baseY: 6 };
  const w = decorLocalToWorld(shared.lx, 0, shared.lz, col);
  const c = Math.cos(0.55);
  const s = Math.sin(0.55);
  assert.ok(Math.abs(w.x - (10 + shared.lx * c + shared.lz * s)) < 0.001);
  assert.ok(Math.abs(w.z - (4 - shared.lx * s + shared.lz * c)) < 0.001);
});
