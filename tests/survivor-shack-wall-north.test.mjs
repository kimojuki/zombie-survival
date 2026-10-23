import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { survivorShackWallNorthColliderDef } from '../packages/shared/src/survivor-shack-wall-north.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadDecorColliders() {
  const src = readFileSync(join(root, 'apps/client/public/js/decor_colliders.js'), 'utf8');
  const zs = {};
  vm.runInNewContext(src, { window: { ZS: zs }, ZS: zs, Math, console });
  return zs;
}

test('north wall collider matches shared def and instance pivot', () => {
  const ZS = loadDecorColliders();
  const shared = survivorShackWallNorthColliderDef();
  const cols = ZS.buildDecorColliders({
    kind: 'prefab',
    prefabId: 'building_survivor_shack',
    x: 12,
    z: -8,
    baseY: 5,
    rotY: 1.1,
    scale: 1,
    decorId: 'shack_n',
    doorOpen: false,
  });
  const north = cols.find((c) => Math.abs(c.lz - shared.lz) < 0.01);
  assert.ok(north);
  assert.equal(north.lx, shared.lx);
  assert.equal(north.hw, shared.hw);
  assert.equal(north.hd, shared.hd);
  assert.equal(north.cx, 12);
  assert.equal(north.cz, -8);
  assert.equal(north.rotY, 1.1);
  assert.equal(north.hd, 0.22);
  assert.equal(north.minY, undefined);
  assert.equal(north.maxY, undefined);
});
